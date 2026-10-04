const cache = new Map<string, { until: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
export async function cachedSource<T>(
  key: string,
  live: () => Promise<T>,
  fallback: () => Promise<T>,
  sample = false,
): Promise<T> {
  if (sample) return fallback();
  const existing = cache.get(key);
  if (existing && existing.until > Date.now()) return existing.value as T;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const job = (async () => {
    let value: T | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        value = await live();
        break;
      } catch {
        if (attempt < 2)
          await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      }
    }
    value ??= await fallback();
    if (cache.size > 100) cache.clear();
    cache.set(key, { until: Date.now() + 600_000, value });
    return value;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
export async function fetchText(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(4500),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  return response.text();
}
