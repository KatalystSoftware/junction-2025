import assert from "node:assert/strict";
import { cachedGenerate } from "./test-cache.ts";

async function run() {
  process.env.TEST_CACHE_MODE = "record";

  let calls = 0;
  const make = () =>
    cachedGenerate("test", "case", "prompt-1", async () => {
      calls += 1;
      return { text: `output-${calls}` };
    });

  const first = await make();
  const second = await make();

  assert.equal(first.text, "output-1");
  assert.equal(second.text, "output-2");

  process.env.TEST_CACHE_MODE = "replay";

  const replayed = await cachedGenerate("test", "case", "prompt-1", async () =>
    Promise.reject(new Error("should not be called in replay")),
  );

  assert.equal(replayed.text, second.text);

  console.log("test-cache.test.ts passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

