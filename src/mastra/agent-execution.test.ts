import assert from "node:assert/strict";
import { ConcurrencyLimiter, runWithRetry } from "./agent-execution.ts";

async function testConcurrencyLimit() {
  const limiter = new ConcurrencyLimiter(2);

  let running = 0;
  let maxRunning = 0;

  const tasks = Array.from({ length: 5 }, () =>
    limiter.run(async () => {
      running += 1;
      if (running > maxRunning) {
        maxRunning = running;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
    }),
  );

  await Promise.all(tasks);

  assert.ok(
    maxRunning <= 2,
    `expected max concurrency <= 2, got ${maxRunning}`,
  );
}

async function testRetryLogic() {
  let attempts = 0;

  const result = await runWithRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("transient");
      }
      return "ok";
    },
    {
      retries: 5,
      baseDelayMs: 1,
      isRetryable: () => true,
    },
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
}

async function run() {
  await testConcurrencyLimit();
  await testRetryLogic();
  console.log("agent-execution.test.ts passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

