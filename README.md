# AirBoy

A trip planner built from separate one-way tickets.

- **Find flights**: search one route over a date range. From/To can be a single airport or the *home group*
  (every airport you can drive to). Filter by airline, airport, departure time, price and stops, then
  add a flight to the plan.
- **Trip plan**: an ordered list of flights, each with a route, a departure window and its travelers
  (e.g. you fly out alone, return together, your companion flies out again later). A flight is either fixed
  (picked by hand) or flexible.
- **Optimize plan**: searches every flexible leg and picks the cheapest combination that stays in order
  (each flight departs at least an hour after the previous one lands). With *same home airport* on, every
  flight from or to home uses one airport and the parking there is part of the total.
- **Saved plans** are stored on the server (`data/plans.json`); airports, parking and travel costs per home
  airport are in *Airports & Travel*.

Prices are per person; a leg with two travelers counts twice.

## Run locally

- VS Code: `Ctrl+Shift+B` (task "AirBoy: start"), or `./run.ps1`.
  Builds the frontend and serves everything on <http://localhost:5080>.
- Frontend development with hot reload: `dotnet run --project server/AirBoy.Api --no-launch-profile --urls http://localhost:5080`
  plus `npm run dev` in `client/` (Vite on :5173 proxies `/api`).

## Docker

Every push to `main` publishes `ghcr.io/vanbassum/airboy:sha-<12 hex>` and the moving tag `ghcr.io/vanbassum/airboy:main`.

```yaml
services:
  airboy:
    image: ghcr.io/vanbassum/airboy:main   # or pin a sha-... tag
    ports:
      - "8080:8080"
    volumes:
      - airboy-data:/app/data              # flight cache, survives restarts
    restart: unless-stopped
volumes:
  airboy-data:
```

The app has no authentication. Put it behind your reverse proxy's auth or keep it on a private network:
every search makes many requests to Google from the server's IP address.

## How it works

- `server/AirBoy.Api` (.NET 10): scrapes Google Flights, one one-way search per route per day, which covers
  Ryanair, Wizz Air and others. The `tfs` query parameter is a hand-encoded protobuf (`Flights/TfsEncoder.cs`);
  results are read from the `ds:1` script block (`Flights/GoogleFlightsClient.cs`). The page layout was reverse
  engineered by the [fast-flights](https://github.com/AWeirdDev/flights) project. If Google changes the page,
  the parser breaks there.
- `GET /api/search` streams one Server-Sent Event per route/day. At most 2 requests to Google run at a time, with a
  random pause between them (`Scan` section in `appsettings.json`, overridable with env vars such as `Scan__Concurrency`).
- Caching: HybridCache, L1 in memory and L2 on disk (`data/cache`, 6 hours). `DELETE /api/cache` clears it.
- `client` (React + shadcn/ui, i18next): builds and optimizes the plan and applies all filters client-side, so changing a
  filter never triggers a new scan. Settings persist in the browser's localStorage.
