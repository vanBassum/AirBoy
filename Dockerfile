# Single image: the Vite/React UI is built and served as static files by the ASP.NET Core API.
#   docker build -t airboy .
#   docker run -p 8080:8080 -v airboy-data:/app/data airboy

# ---- UI ----
FROM node:22-alpine AS ui-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npx tsc -b && npx vite build --outDir /ui-dist --emptyOutDir

# ---- API ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY server/AirBoy.Api/AirBoy.Api.csproj server/AirBoy.Api/
RUN dotnet restore server/AirBoy.Api/AirBoy.Api.csproj
COPY server/AirBoy.Api/ server/AirBoy.Api/
RUN dotnet publish server/AirBoy.Api/AirBoy.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=api-build /app/publish .
COPY --from=ui-build /ui-dist ./wwwroot
# Flight cache (HybridCache L2) lives in /app/data/cache; mount a volume to keep it across restarts.
RUN mkdir -p /app/data && chown "$APP_UID" /app/data
# Shown on the Settings page; set by CI. Declared last so they don't bust the layer cache.
ARG GIT_SHA=dev
ARG BUILD_TIME=
ENV AIRBOY_SHA=$GIT_SHA AIRBOY_BUILT=$BUILD_TIME
USER $APP_UID
EXPOSE 8080
VOLUME /app/data
ENTRYPOINT ["dotnet", "AirBoy.Api.dll"]
