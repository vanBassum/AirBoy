using System.Text.Json;
using System.Text.Json.Nodes;

namespace AirBoy.Api.Plans;

/// <summary>
/// Saved trip plans in one JSON file. The client owns the plan content: the server keys it by
/// <c>id</c>, stamps <c>updatedAt</c> and records which user it belongs to in <c>owner</c>.
/// Every call is scoped to one owner; other users' plans are invisible (not found).
/// The owner field is never sent back to the client.
/// </summary>
public sealed class PlanStore(string path)
{
    private const string OwnerField = "owner";
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true };

    public async Task<JsonArray> ListAsync(string owner, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var plans = await ReadAsync(ct);
            // Plans saved before owners existed belong to the first user who lists them.
            var unowned = plans.OfType<JsonObject>().Where(p => p[OwnerField] is null).ToList();
            if (unowned.Count > 0)
            {
                foreach (var p in unowned) p[OwnerField] = owner;
                await WriteAsync(plans, ct);
            }
            return [.. plans.OfType<JsonObject>().Where(p => IsOwnedBy(p, owner)).Select(ForClient)];
        }
        finally { _lock.Release(); }
    }

    /// <summary>Returns null when the id belongs to another user's plan.</summary>
    public async Task<JsonObject?> SaveAsync(string owner, string id, JsonObject plan, CancellationToken ct)
    {
        plan["id"] = id;
        plan["updatedAt"] = DateTime.UtcNow.ToString("O");
        plan[OwnerField] = owner;
        await _lock.WaitAsync(ct);
        try
        {
            var plans = await ReadAsync(ct);
            var existing = Find(plans, id);
            if (existing is not null && !IsOwnedBy(existing, owner)) return null;
            if (existing is not null) plans.Remove(existing);
            plans.Add(plan.DeepClone());
            await WriteAsync(plans, ct);
            return ForClient(plan);
        }
        finally { _lock.Release(); }
    }

    public async Task<bool> DeleteAsync(string owner, string id, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var plans = await ReadAsync(ct);
            var existing = Find(plans, id);
            if (existing is null || !IsOwnedBy(existing, owner)) return false;
            plans.Remove(existing);
            await WriteAsync(plans, ct);
            return true;
        }
        finally { _lock.Release(); }
    }

    private static JsonObject? Find(JsonArray plans, string id) =>
        plans.OfType<JsonObject>().FirstOrDefault(p => p["id"]?.GetValue<string>() == id);

    private static bool IsOwnedBy(JsonObject plan, string owner) => plan[OwnerField]?.GetValue<string>() == owner;

    private static JsonObject ForClient(JsonObject plan)
    {
        var copy = (JsonObject)plan.DeepClone();
        copy.Remove(OwnerField);
        return copy;
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
