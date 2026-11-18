namespace AirBoy.Api.Flights;

/// <summary>One bookable itinerary (one direction) as shown by Google Flights.</summary>
public sealed record FlightOption(
    int Price,
    string[] Airlines,
    int Stops,
    string[] Via,
    string DepartureDate,
    string DepartureTime,
    string ArrivalDate,
    string ArrivalTime,
    int DurationMinutes);

/// <summary>All options for one route on one day.</summary>
public sealed record LegResult(
    string From,
    string To,
    string Date,
    string Url,
    bool Cached,
    string? Error,
    IReadOnlyList<FlightOption> Flights);

public sealed record LegQuery(string From, string To, string Date, int MaxStops, int Adults);

public sealed record SearchStart(int Total);
