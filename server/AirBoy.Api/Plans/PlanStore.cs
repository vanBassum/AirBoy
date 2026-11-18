using System.Text.Json;
using System.Text.Json.Nodes;

namespace AirBoy.Api.Plans;

/// <summary>
/// Saved trip plans in one JSON file. Plans are owned by the client: the server only
/// keys them by <c>id</c> and stamps <c>updatedAt</c>. Single user, so a lock is enough.
/// </summary>
public sealed class PlanStore(string path)
{
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true };

    public async Task<JsonArray> ListAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try { return await ReadAsync(ct); }
        finally { _lock.Release(); }
    }

    public async Task<JsonObject> SaveAsync(string id, JsonObject plan, CancellationToken ct)
    {
        plan["id"] = id;
        plan["updatedAt"] = DateTime.UtcNow.ToString("O");
        await _lock.WaitAsync(ct);
        try
        {
            var plans = await ReadAsync(ct);
            var existing = plans.FirstOrDefault(p => p?["id"]?.GetValue<string>() == id);
            if (existing is not null) plans.Remove(existing);
            plans.Add(plan.DeepClone());
            await WriteAsync(plans, ct);
            return plan;
        }
        finally { _lock.Release(); }
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var plans = await ReadAsync(ct);
            var existing = plans.FirstOrDefault(p => p?["id"]?.GetValue<string>() == id);
            if (existing is null) return false;
            plans.Remove(existing);
            await WriteAsync(plans, ct);
            return true;
        }
        finally { _lock.Release(); }
    }

    private async Task<JsonArray> ReadAsync(CancellationToken ct)
    {
        if (!File.Exists(path)) return [];
        await using var stream = File.OpenRead(path);
        return await JsonNode.ParseAsync(stream, cancellationToken: ct) as JsonArray ?? [];
    }

    private async Task WriteAsync(JsonArray plans, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tmp = path + ".tmp";
        await File.WriteAllTextAsync(tmp, plans.ToJsonString(Indented), ct);
        File.Move(tmp, path, overwrite: true);
    }
}
