using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Distributed;

namespace AirBoy.Api.Caching;

/// <summary>
/// Minimal file-backed <see cref="IDistributedCache"/> so HybridCache survives restarts
/// without a database. One file per key: 8-byte absolute expiry (UTC ticks) + payload.
/// Sliding expiration is not supported (HybridCache only uses absolute expiry).
/// </summary>
public sealed class FileDistributedCache : IDistributedCache
{
    private readonly string _dir;

    public FileDistributedCache(string directory)
    {
        _dir = directory;
        Directory.CreateDirectory(_dir);
    }

    public byte[]? Get(string key)
    {
        var path = PathFor(key);
        try
        {
            var bytes = File.ReadAllBytes(path);
            if (bytes.Length < 8) return null;
            var expires = new DateTime(BitConverter.ToInt64(bytes, 0), DateTimeKind.Utc);
            if (expires <= DateTime.UtcNow)
            {
                TryDelete(path);
                return null;
            }
            return bytes[8..];
        }
        catch (Exception e) when (e is FileNotFoundException or DirectoryNotFoundException or IOException)
        {
            return null;
        }
    }

    public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult(Get(key));

    public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
    {
        var expires = options.AbsoluteExpiration?.UtcDateTime
            ?? (options.AbsoluteExpirationRelativeToNow is { } rel ? DateTime.UtcNow + rel : DateTime.UtcNow.AddDays(1));

        var buffer = new byte[8 + value.Length];
        BitConverter.TryWriteBytes(buffer, expires.Ticks);
        value.CopyTo(buffer, 8);

        var path = PathFor(key);
        var tmp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        File.WriteAllBytes(tmp, buffer);
        File.Move(tmp, path, overwrite: true);
    }

    public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
    {
        Set(key, value, options);
        return Task.CompletedTask;
    }

    public void Refresh(string key) { }

    public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;

    public void Remove(string key) => TryDelete(PathFor(key));

    public Task RemoveAsync(string key, CancellationToken token = default)
    {
        Remove(key);
        return Task.CompletedTask;
    }

    /// <summary>Deletes every cached entry.</summary>
    public int Clear()
    {
        var files = Directory.GetFiles(_dir, "*.bin");
        foreach (var f in files) TryDelete(f);
        return files.Length;
    }

    private string PathFor(string key) =>
        Path.Combine(_dir, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)))[..32] + ".bin");

    private static void TryDelete(string path)
    {
        try { File.Delete(path); } catch (IOException) { }
    }
}
