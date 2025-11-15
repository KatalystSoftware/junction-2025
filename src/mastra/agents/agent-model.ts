const DEFAULT_AGENT_MODEL = "google/gemini-2.0-flash";

export function getAgentModel(): string {
  const envModel = process.env.AGENT_LLM_MODEL;

  if (!envModel) {
    return DEFAULT_AGENT_MODEL;
  }

  return envModel.includes("/") ? envModel : `google/${envModel}`;
}

export { DEFAULT_AGENT_MODEL };
