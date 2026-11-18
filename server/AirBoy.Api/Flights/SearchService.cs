using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;

namespace AirBoy.Api.Flights;

public sealed class ScanOptions
{
    /// <summary>Parallel requests to Google (shared across all searches).</summary>
    public int Concurrency { get; set; } = 2;
    public int MinDelayMs { get; set; } = 600;
    public int MaxDelayMs { get; set; } = 1500;
    public double CacheHours { get; set; } = 6;
}

/// <summary>Runs many one-way leg lookups, served from HybridCache where possible.</summary>
public sealed class SearchService(
    GoogleFlightsClient google,
    HybridCache cache,
    IOptions<ScanOptions> options,
    ILogger<SearchService> log)
{
    public const string CacheTag = "flights";
    // Google's transient error responses can hit over half the requests from a server IP.
    private const int MaxAttempts = 6;

    // Global gate: all searches together never exceed the configured parallelism.
    private static SemaphoreSlim? _gate;
    private SemaphoreSlim Gate => LazyInitializer.EnsureInitialized(ref _gate, () => new SemaphoreSlim(options.Value.Concurrency));

    public async IAsyncEnumerable<LegResult> RunAsync(
        IReadOnlyList<LegQuery> legs, bool fresh, [EnumeratorCancellation] CancellationToken ct)
    {
        var channel = Channel.CreateUnbounded<LegResult>();
        var producer = Task.Run(async () =>
        {
            try
            {
                // Higher than the gate so cache hits are not stuck behind network fetches.
                var po = new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = ct };
                await Parallel.ForEachAsync(legs, po, async (leg, c) =>
                    await channel.Writer.WriteAsync(await GetLegAsync(leg, fresh, c), c));
                channel.Writer.Complete();
            }
            catch (Exception e)
            {
                channel.Writer.Complete(e);
            }
        }, ct);

        await foreach (var r in channel.Reader.ReadAllAsync(ct))
            yield return r;
        await producer;
    }

    private async Task<LegResult> GetLegAsync(LegQuery q, bool fresh, CancellationToken ct)
    {
        var url = GoogleFlightsClient.SearchUrl(q);
        if (DateOnly.Parse(q.Date) < DateOnly.FromDateTime(DateTime.Today))
            return new LegResult(q.From, q.To, q.Date, url, false, "Date is in the past", []);

        var key = $"leg:v2:{q.From}:{q.To}:{q.Date}:{q.MaxStops}:{q.Adults}";
        if (fresh) await cache.RemoveAsync(key, ct);

        var fetched = false;
        try
        {
            var ttl = TimeSpan.FromHours(options.Value.CacheHours);
            var flights = await cache.GetOrCreateAsync(
                key,
                async c => { fetched = true; return await FetchAsync(q, c); },
                new HybridCacheEntryOptions { Expiration = ttl, LocalCacheExpiration = ttl },
                [CacheTag],
                ct);
            return new LegResult(q.From, q.To, q.Date, url, !fetched, null, flights);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogWarning("Leg {From}->{To} {Date} failed: {Error}", q.From, q.To, q.Date, e.Message);
            return new LegResult(q.From, q.To, q.Date, url, false, e.Message, []);
        }
    }

    private async Task<List<FlightOption>> FetchAsync(LegQuery q, CancellationToken ct)
    {
        await Gate.WaitAsync(ct);
        try
        {
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    var result = await google.SearchAsync(q, ct);
                    log.LogInformation("Fetched {From}->{To} {Date}: {Count} options", q.From, q.To, q.Date, result.Count);
                    return result;
                }
                catch (Exception e) when (attempt < MaxAttempts && e is GoogleBlockedException or HttpRequestException or FormatException)
                {
                    log.LogInformation("Retry {Attempt} for {From}->{To} {Date}: {Error}", attempt, q.From, q.To, q.Date, e.Message);
                    await Task.Delay(TimeSpan.FromSeconds(attempt), ct);
                }
                finally
                {
                    // Be polite: pause before releasing the slot to the next request.
                    var o = options.Value;
                    await Task.Delay(Random.Shared.Next(o.MinDelayMs, Math.Max(o.MinDelayMs, o.MaxDelayMs) + 1), ct);
                }
            }
        }
        finally
        {
            Gate.Release();
        }
    }
}
