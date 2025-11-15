import assert from "node:assert/strict";

const constructorArgs: any[] = [];

jest.mock("@mastra/core/agent", () => {
  return {
    Agent: class MockAgent {
      instructions: string;

      constructor(config: any) {
        this.instructions = config.instructions;
        constructorArgs.push(config);
      }
    },
  };
});

jest.mock("./agent-model.ts", () => ({
  getAgentModel: () => "test-model",
}));

import { createGodBossAgent } from "./god-boss-agent.ts";

describe("god-boss-agent", () => {
  beforeEach(() => {
    constructorArgs.length = 0;
  });

  test("includes concise, snarky personality guidance", () => {
    createGodBossAgent(["Thanks for the help with budgeting."]);

    const config = constructorArgs[0];
    assert.ok(config, "Agent constructor should be called");

    const instructions: string = config.instructions;
    assert.ok(
      instructions.includes("Snarky but kind senior colleague"),
      "instructions should mention snarky but kind personality",
    );
    assert.ok(
      instructions.includes("Keep feedback concise and structured"),
      "instructions should ask for concise feedback",
    );
    assert.ok(
      instructions.includes("dry humor"),
      "instructions should mention dry humor",
    );
  });
});

