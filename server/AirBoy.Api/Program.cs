using System.Net;
using System.Net.ServerSentEvents;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using AirBoy.Api.Caching;
using AirBoy.Api.Flights;
using AirBoy.Api.Plans;
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
builder.Services.AddSingleton(new PlanStore(Path.Combine(builder.Environment.ContentRootPath, "data", "plans.json")));
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

// Streams one SSE "leg" event per route/day: every route (e.g. "EIN-TIA") for every day in [start, end].
app.MapGet("/api/search", (
    string routes, DateOnly start, DateOnly end,
    int? maxStops, int? adults, bool? fresh,
    SearchService search, HttpContext http, CancellationToken ct) =>
{
    var pairs = routes.ToUpperInvariant()
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Distinct()
        .Select(r => r.Split('-'))
        .ToList();
    if (pairs.Count == 0 || pairs.Any(p => p.Length != 2 || !iata.IsMatch(p[0]) || !iata.IsMatch(p[1]) || p[0] == p[1]))
        return Results.BadRequest("Routes must look like EIN-TIA (3-letter IATA codes).");
    if (end < start)
        return Results.BadRequest("Invalid period.");

    var stops = Math.Clamp(maxStops ?? 0, 0, 2);
    var pax = Math.Clamp(adults ?? 1, 1, 9);
    var legs = (from p in pairs from d in Days(start, end) select new LegQuery(p[0], p[1], d, stops, pax)).ToList();
    if (legs.Count > 600)
        return Results.BadRequest($"Too many searches ({legs.Count}); shorten the period.");

    // Stop nginx-style reverse proxies from buffering the event stream.
    http.Response.Headers["X-Accel-Buffering"] = "no";
    return TypedResults.ServerSentEvents(Stream(legs, fresh ?? false, search, ct));
});

// Which build is running: commit sha and build time, baked in by CI (see Dockerfile).
app.MapGet("/api/version", () => Results.Json(new
{
    sha = Environment.GetEnvironmentVariable("AIRBOY_SHA") ?? "dev",
    built = Environment.GetEnvironmentVariable("AIRBOY_BUILT") is { Length: > 0 } b ? b : null,
}));

// Saved trip plans (opaque JSON owned by the client), private per user.
// The user comes from Authentik forward-auth: Traefik replaces these headers with the
// outpost's answer, and the container is only reachable through Traefik. Without
// Authentik (local run) everything belongs to "local".
static string Owner(HttpContext http) =>
    http.Request.Headers["X-authentik-uid"].FirstOrDefault() is { Length: > 0 } uid ? uid
    : http.Request.Headers["X-authentik-username"].FirstOrDefault() is { Length: > 0 } name ? name
    : "local";

app.MapGet("/api/plans", async (HttpContext http, PlanStore plans, CancellationToken ct) =>
    Results.Json(await plans.ListAsync(Owner(http), ct)));
app.MapPut("/api/plans/{id}", async (string id, JsonObject plan, HttpContext http, PlanStore plans, CancellationToken ct) =>
    await plans.SaveAsync(Owner(http), id, plan, ct) is { } saved ? Results.Json(saved) : Results.NotFound());
app.MapDelete("/api/plans/{id}", async (string id, HttpContext http, PlanStore plans, CancellationToken ct) =>
    await plans.DeleteAsync(Owner(http), id, ct) ? Results.NoContent() : Results.NotFound());

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
