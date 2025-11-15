import fs from "fs/promises";
import path from "path";

type CacheMode = "off" | "record" | "replay";

type CacheEntry = {
  scope: string;
  name: string;
  prompt: string;
  text: string;
};

type CacheFile = {
  version: 1;
  entries: CacheEntry[];
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "ai-test-cache.json");

let cache: CacheFile | null = null;

async function loadCache(): Promise<CacheFile> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.entries)) {
      cache = { version: 1, entries: parsed.entries };
    } else if (Array.isArray(parsed)) {
      cache = { version: 1, entries: parsed };
    } else {
      cache = { version: 1, entries: [] };
    }
  } catch {
    cache = { version: 1, entries: [] };
  }
  return cache;
}

async function saveCache() {
  if (!cache) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function getMode(): CacheMode {
  const value = (process.env.TEST_CACHE_MODE || "").toLowerCase();
  if (value === "record" || value === "replay") return value;
  return "off";
}

export async function cachedGenerate<T>(
  scope: string,
  name: string,
  prompt: string,
  generate: () => Promise<{ text: string } & T>,
): Promise<{ text: string } & T> {
  const mode = getMode();
  if (mode === "off") {
    return generate();
  }

  const cacheFile = await loadCache();
  const existing = cacheFile.entries.find(
    (e) => e.scope === scope && e.name === name && e.prompt === prompt,
  );

  if (mode === "replay") {
    if (!existing) {
      throw new Error(
        `Missing cached response for ${scope}:${name} in TEST_CACHE_MODE=replay`,
      );
    }
    return { text: existing.text } as { text: string } & T;
  }

  const result = await generate();
  const text = result.text ?? "";

  if (existing) {
    existing.text = text;
  } else {
    cacheFile.entries.push({ scope, name, prompt, text });
  }

  await saveCache();
  return result;
}
