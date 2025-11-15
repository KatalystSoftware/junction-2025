import fs from "fs/promises";
import path from "path";
import { runAgentOperation } from "./agent-execution.ts";

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

async function logAgentTiming(params: {
  scope: string;
  name: string;
  prompt: string;
  durationMs: number;
  mode: CacheMode;
  logFilePath?: string;
}) {
  const logPath =
    params.logFilePath ||
    process.env.AGENT_TIMING_LOG_FILE ||
    path.join(process.cwd(), "logs", "agent-timings.log");

  const entry = {
    timestamp: new Date().toISOString(),
    scope: params.scope,
    name: params.name,
    durationMs: params.durationMs,
    cacheMode: params.mode,
    promptLength: params.prompt.length,
  };

  const line = JSON.stringify(entry) + "\n";

  try {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, line, "utf8");
  } catch {
    // Ignore logging errors in production and tests
  }
}

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
  options?: { timingLogFile?: string },
): Promise<{ text: string } & T> {
  const mode = getMode();
  if (mode === "off") {
    const start = Date.now();
    const result = await runAgentOperation(generate);
    const durationMs = Date.now() - start;
    await logAgentTiming({
      scope,
      name,
      prompt,
      durationMs,
      mode,
      logFilePath: options?.timingLogFile,
    });
    return result;
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

  const start = Date.now();
  const result = await runAgentOperation(generate);
  const durationMs = Date.now() - start;
  await logAgentTiming({
    scope,
    name,
    prompt,
    durationMs,
    mode,
    logFilePath: options?.timingLogFile,
  });
  const text = result.text ?? "";

  if (existing) {
    existing.text = text;
  } else {
    cacheFile.entries.push({ scope, name, prompt, text });
  }

  await saveCache();
  return result;
}
