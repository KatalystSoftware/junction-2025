/**
 * Boss Help Tool
 *
 * Invokes the Boss Help Agent to answer advisor questions using the RAG knowledge base.
 * Extracts citations and suggested learning materials from the response.
 */

import { createBossHelpAgent } from "../agents/boss-help-agent.ts";
import type { AdvisorState, FinancialTopic } from "../types/game-types.ts";

export interface BossHelpContext {
  characterName: string;
  topic: FinancialTopic;
  scenarioSummary: string;
}

export interface BossHelpResult {
  response: string;
  citations: Array<{
    text: string;
    source: string;
    section: string;
    relevanceScore: number;
  }>;
  suggestedMaterials: Array<{
    materialId: string;
    title: string;
    description: string;
    topic: string;
    url: string;
    type: "article" | "guide" | "tool" | "calculator";
  }>;
}

/**
 * Extract citations from boss response text
 * Looks for [Source: ...] or [Lähde: ...] patterns
 */
function extractCitations(responseText: string): Array<{
  text: string;
  source: string;
  section: string;
  relevanceScore: number;
}> {
  const citations: Array<{
    text: string;
    source: string;
    section: string;
    relevanceScore: number;
  }> = [];

  // Match citation patterns like [Source: Bank of Finland - Budgeting Basics]
  const citationRegex = /\[(Source|Lähde):\s*([^\]]+)\]/gi;
  const matches = responseText.matchAll(citationRegex);

  for (const match of matches) {
    const fullCitation = match[2].trim();
    const parts = fullCitation.split(" - ");
    const source = parts[0] || fullCitation;
    const section = parts[1] || "General";

    citations.push({
      text: fullCitation,
      source,
      section,
      relevanceScore: 0.9, // High relevance since boss selected these
    });
  }

  return citations;
}

/**
 * Extract suggested materials from boss response text
 * Looks for 📚 Recommended: ... patterns
 */
function extractSuggestedMaterials(responseText: string): Array<{
  materialId: string;
  title: string;
  description: string;
  topic: string;
  url: string;
  type: "article" | "guide" | "tool" | "calculator";
}> {
  const materials: Array<{
    materialId: string;
    title: string;
    description: string;
    topic: string;
    url: string;
    type: "article" | "guide" | "tool" | "calculator";
  }> = [];

  // Match material patterns like 📚 Recommended: [Title] - [Description]
  const materialRegex = /📚\s*Recommended:\s*([^\-]+)\s*-\s*([^\n]+)/gi;
  const matches = responseText.matchAll(materialRegex);

  let index = 0;
  for (const match of matches) {
    const title = match[1].trim();
    const description = match[2].trim();

    // Try to extract URL from description or title
    const urlMatch = description.match(/(https?:\/\/[^\s)]+)/);
    const url = urlMatch ? urlMatch[1] : "";

    materials.push({
      materialId: `boss_mat_${Date.now()}_${index++}`,
      title,
      description: description.replace(url, "").trim(),
      topic: "general", // Boss response context determines topic
      url,
      type: "article", // Default to article
    });
  }

  return materials;
}

/**
 * Invoke the Boss Help Agent
 */
export async function invokeBossHelpTool(params: {
  userQuestion: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  advisorState: AdvisorState;
  currentConsultationContext?: BossHelpContext;
}): Promise<BossHelpResult> {
  const {
    userQuestion,
    conversationHistory,
    advisorState,
    currentConsultationContext,
  } = params;

  // Extract advisor messages for language detection
  const advisorMessages = conversationHistory
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content);
  advisorMessages.push(userQuestion);

  // Create boss help agent with context
  const bossAgent = createBossHelpAgent(
    advisorMessages,
    currentConsultationContext,
  );

  // Build conversation context for the agent
  const conversationContext = conversationHistory
    .map((msg) => {
      const role = msg.role === "user" ? "Advisor" : "Boss";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  // Invoke agent with the question
  const prompt = conversationContext
    ? `${conversationContext}\n\nAdvisor: ${userQuestion}`
    : `Advisor: ${userQuestion}`;

  try {
    const result = await bossAgent.generate(prompt);
    const responseText = result.text || "";

    // Extract citations and materials from response
    const citations = extractCitations(responseText);
    const suggestedMaterials = extractSuggestedMaterials(responseText);

    return {
      response: responseText,
      citations,
      suggestedMaterials,
    };
  } catch (error: any) {
    console.error("Boss help agent error:", error);

    // Provide fallback response
    const isFinnish = advisorMessages.some((msg) => /[äö]/i.test(msg));

    const fallbackResponse = isFinnish
      ? `Pahoittelut, en pystynyt vastaamaan kysymykseesi juuri nyt. Voit kuitenkin jatkaa asiakkaan kanssa työskentelyä. Jos tarvitset apua, yritä kysyä uudelleen hetken kuluttua.`
      : `Sorry, I couldn't answer your question right now. You can continue working with your client. If you need help, please try asking again in a moment.`;

    return {
      response: fallbackResponse,
      citations: [],
      suggestedMaterials: [],
    };
  }
}
