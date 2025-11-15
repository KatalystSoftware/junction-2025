import assert from "node:assert/strict";
import { getAgentModel, DEFAULT_AGENT_MODEL } from "./agent-model.ts";

describe("agent-model", () => {
  const originalEnv = process.env.AGENT_LLM_MODEL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENT_LLM_MODEL;
    } else {
      process.env.AGENT_LLM_MODEL = originalEnv;
    }
  });

  test("returns default model when env is not set", () => {
    delete process.env.AGENT_LLM_MODEL;

    const model = getAgentModel();

    assert.equal(model, DEFAULT_AGENT_MODEL);
  });

  test("prefixes google/ when env has no provider", () => {
    process.env.AGENT_LLM_MODEL = "gemini-2.0-flash";

    const model = getAgentModel();

    assert.equal(model, "google/gemini-2.0-flash");
  });

  test("uses env value as-is when it includes provider", () => {
    process.env.AGENT_LLM_MODEL = "openai/gpt-4.1-mini";

    const model = getAgentModel();

    assert.equal(model, "openai/gpt-4.1-mini");
  });
});
