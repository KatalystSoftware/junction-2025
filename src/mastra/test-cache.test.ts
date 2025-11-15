import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { cachedGenerate } from "./test-cache.ts";

async function testCacheModes() {
  process.env.TEST_CACHE_MODE = "record";

  const logPath = path.join(
    process.cwd(),
    "logs",
    "agent-timing-test-cache.log",
  );
  await fs.rm(logPath, { force: true });

  let calls = 0;
  const make = () =>
    cachedGenerate(
      "test",
      "case",
      "prompt-1",
      async () => {
        calls += 1;
        return { text: `output-${calls}` };
      },
      { timingLogFile: logPath },
    );

  const first = await make();
  const second = await make();

  assert.equal(first.text, "output-1");
  assert.equal(second.text, "output-2");

  process.env.TEST_CACHE_MODE = "replay";

  const replayed = await cachedGenerate<{ text: string }>(
    "test",
    "case",
    "prompt-1",
    async () => Promise.reject(new Error("should not be called in replay")),
  );

  assert.equal(replayed.text, second.text);

  await fs.rm(logPath, { force: true });
}

async function testAgentTimingLog() {
  const logPath = path.join(process.cwd(), "logs", "agent-timing-test.log");
  await fs.rm(logPath, { force: true });

  process.env.TEST_CACHE_MODE = "off";
  delete process.env.AGENT_TIMING_LOG_FILE;

  await cachedGenerate(
    "agent",
    "timing-test",
    "prompt-1",
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { text: "ok" };
    },
    { timingLogFile: logPath },
  );

  const content = await fs.readFile(logPath, "utf8");
  assert.ok(content.includes("\"scope\":\"agent\""));
  assert.ok(content.includes("\"name\":\"timing-test\""));

  await fs.rm(logPath, { force: true });
}

describe("cachedGenerate", () => {
  test("records and replays cache entries", async () => {
    await testCacheModes();
  });

  test("logs agent timing information", async () => {
    await testAgentTimingLog();
  });
});
