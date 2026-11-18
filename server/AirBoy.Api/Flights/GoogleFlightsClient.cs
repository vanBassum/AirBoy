using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace AirBoy.Api.Flights;

/// <summary>
/// Scrapes the Google Flights results page. The page embeds its data as
/// <c>AF_initDataCallback({key: 'ds:1', ..., data: [...], sideChannel: {}})</c>
/// inside <c>&lt;script class="ds:1"&gt;</c>; we pull that JSON array out and read
/// it by index (layout discovered by the fast-flights project).
/// </summary>
public sealed partial class GoogleFlightsClient(HttpClient http)
{
    public const string BaseUrl = "https://www.google.com/travel/flights";

    public static string SearchUrl(LegQuery q, string lang = "nl") =>
        $"{BaseUrl}/search?tfs={Uri.EscapeDataString(Tfs(q))}&hl={lang}&curr=EUR";

    private static string Tfs(LegQuery q) => TfsEncoder.OneWay(q.From, q.To, q.Date, q.MaxStops, q.Adults);

    public async Task<List<FlightOption>> SearchAsync(LegQuery q, CancellationToken ct)
    {
        var url = $"{BaseUrl}?tfs={Uri.EscapeDataString(Tfs(q))}&hl=en&curr=EUR";
        using var res = await http.GetAsync(url, ct);
        if ((int)res.StatusCode == 429)
            throw new GoogleBlockedException("Google geeft 429 (te veel verzoeken)");
        res.EnsureSuccessStatusCode();
        var html = await res.Content.ReadAsStringAsync(ct);
        return Parse(html);
    }

    public static List<FlightOption> Parse(string html)
    {
        var m = Ds1Script().Match(html);
        if (!m.Success)
            throw new GoogleBlockedException("Geen vluchtdata in pagina (consent/captcha?)");

        var js = m.Groups[1].Value;
        var start = js.IndexOf("data:", StringComparison.Ordinal);
        var end = js.LastIndexOf(',');
        if (start < 0 || end <= start)
            throw new FormatException("Onverwacht scriptformaat");
        var data = js[(start + 5)..end];
        if (data.TrimEnd().EndsWith("errorHasStatus: true"))
            return [];

        var payload = JsonNode.Parse(data) as JsonArray ?? throw new FormatException("Geen JSON-array");
        var results = new List<FlightOption>();

        // payload[3][0] = "other flights" list, payload[2][0] = "best flights" list (may be null)
        foreach (var bucket in new[] { At(payload, 2, 0), At(payload, 3, 0) })
        {
            if (bucket is not JsonArray items) continue;
            foreach (var item in items)
            {
                var option = ParseItinerary(item);
                if (option is not null) results.Add(option);
            }
        }

        return results
            .DistinctBy(f => (f.DepartureTime, f.ArrivalTime, string.Join(',', f.Airlines), f.Price))
            .OrderBy(f => f.Price)
            .ToList();
    }

    private static FlightOption? ParseItinerary(JsonNode? item)
    {
        try { return ParseItineraryUnsafe(item); }
        catch (Exception e) when (e is InvalidOperationException or FormatException) { return null; }
    }

    private static FlightOption? ParseItineraryUnsafe(JsonNode? item)
    {
        var flight = At(item, 0);
        var price = At(item, 1, 0, 1)?.GetValue<int?>();
        if (flight is null || price is null) return null;

        var airlines = (At(flight, 1) as JsonArray)?.Select(a => a?.ToString() ?? "").ToArray() ?? [];
        if (At(flight, 2) is not JsonArray segments || segments.Count == 0) return null;

        var first = segments[0]!;
        var last = segments[^1]!;
        var via = segments.Take(segments.Count - 1).Select(s => At(s, 6)?.ToString() ?? "?").ToArray();
        var duration = segments.Sum(s => At(s, 11)?.GetValue<int?>() ?? 0);
        // total travel time incl. layovers: flight[9] when present
        duration = At(flight, 9)?.GetValue<int?>() ?? duration;

        return new FlightOption(
            price.Value,
            airlines,
            segments.Count - 1,
            via,
            Date(At(first, 20)),
            Time(At(first, 8)),
            Date(At(last, 21)),
            Time(At(last, 10)),
            duration);
    }

    /// <summary>Google omits zero components: [8] = 08:00, [null, 31] = 00:31.</summary>
    private static string Time(JsonNode? n)
    {
        var a = n as JsonArray;
        int h = a is { Count: > 0 } ? a[0]?.GetValue<int?>() ?? 0 : 0;
        int m = a is { Count: > 1 } ? a[1]?.GetValue<int?>() ?? 0 : 0;
        return $"{h:00}:{m:00}";
    }

    private static string Date(JsonNode? n) =>
        n is JsonArray { Count: 3 } a ? $"{a[0]}-{(int)a[1]!:00}-{(int)a[2]!:00}" : "";

    private static JsonNode? At(JsonNode? node, params int[] path)
    {
        foreach (var i in path)
        {
            if (node is not JsonArray arr || i >= arr.Count) return null;
            node = arr[i];
        }
        return node;
    }

    [GeneratedRegex("""<script class="ds:1"[^>]*>(.*?)</script>""", RegexOptions.Singleline)]
    private static partial Regex Ds1Script();
}

public sealed class GoogleBlockedException(string message) : Exception(message);
