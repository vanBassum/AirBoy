using System.Net;
using System.Net.ServerSentEvents;
using System.Text.RegularExpressions;
using AirBoy.Api.Caching;
using AirBoy.Api.Flights;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;

var builder = WebApplication.CreateBuilder(args);

// HybridCache: L1 in memory, L2 on disk (data/cache) so results survive restarts.
var fileCache = new FileDistributedCache(Path.Combine(builder.Environment.ContentRootPath, "data", "cache"));
builder.Services.AddSingleton(fileCache);
builder.Services.AddSingleton<IDistributedCache>(fileCache);
builder.Services.AddHybridCache(o => o.MaximumPayloadBytes = 4 * 1024 * 1024);

builder.Services.Configure<ScanOptions>(builder.Configuration.GetSection("Scan"));
builder.Services.AddScoped<SearchService>();
builder.Services
    .AddHttpClient<GoogleFlightsClient>(c =>
    {
        c.Timeout = TimeSpan.FromSeconds(30);
        c.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36");
        c.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.9");
        // EU consent cookie ("reject all"), otherwise Google serves the consent page.
        c.DefaultRequestHeaders.TryAddWithoutValidation("Cookie", "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        AutomaticDecompression = DecompressionMethods.All,
        UseCookies = false,
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    });

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var iata = new Regex("^[A-Z]{3}$");

// Streams one SSE "leg" event per route/day; the client combines legs into trips.
app.MapGet("/api/search", (
    string origins, string dest,
    DateOnly outFrom, DateOnly outTo, DateOnly retFrom, DateOnly retTo,
    int? maxStops, int? adults, bool? fresh,
    SearchService search, HttpContext http, CancellationToken ct) =>
{
    var homes = origins.ToUpperInvariant().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct().ToArray();
    dest = dest.Trim().ToUpperInvariant();
    if (homes.Length == 0 || !homes.All(iata.IsMatch) || !iata.IsMatch(dest))
        return Results.BadRequest("Gebruik IATA-codes van 3 letters.");
    if (outTo < outFrom || retTo < retFrom)
        return Results.BadRequest("Ongeldige periode.");

    var stops = Math.Clamp(maxStops ?? 0, 0, 2);
    var pax = Math.Clamp(adults ?? 1, 1, 9);
    var legs = (
        from h in homes from d in Days(outFrom, outTo) select new LegQuery(h, dest, d, stops, pax)
    ).Concat(
        from h in homes from d in Days(retFrom, retTo) select new LegQuery(dest, h, d, stops, pax)
    ).ToList();
    if (legs.Count > 600)
        return Results.BadRequest($"Te veel zoekopdrachten ({legs.Count}); maak de periode korter.");

    // Stop nginx-style reverse proxies from buffering the event stream.
    http.Response.Headers["X-Accel-Buffering"] = "no";
    return TypedResults.ServerSentEvents(Stream(legs, fresh ?? false, search, ct));
});

app.MapDelete("/api/cache", async (HybridCache cache, FileDistributedCache files) =>
{
    await cache.RemoveByTagAsync(SearchService.CacheTag);
    return Results.Ok(new { removed = files.Clear() });
});

app.MapFallbackToFile("index.html");

app.Run();

static IEnumerable<string> Days(DateOnly from, DateOnly to)
{
    for (var d = from; d <= to; d = d.AddDays(1)) yield return d.ToString("yyyy-MM-dd");
}

static async IAsyncEnumerable<SseItem<object>> Stream(
    List<LegQuery> legs, bool fresh, SearchService search,
    [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
{
    yield return new SseItem<object>(new SearchStart(legs.Count), "start");
    await foreach (var leg in search.RunAsync(legs, fresh, ct))
        yield return new SseItem<object>(leg, "leg");
    yield return new SseItem<object>(new { }, "done");
}
