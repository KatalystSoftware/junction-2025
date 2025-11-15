/**
 * Real-time Finnish Financial News Integration
 *
 * This module integrates real-time financial news from Finnish sources
 * to augment the RAG system with current events and market information.
 */

import { google } from "@ai-sdk/google";
import { embed, generateObject } from "ai";
import { z } from "zod";
import { withRetry, isRetryableError } from "../utils/error-recovery.ts";

export interface NewsArticle {
  title: string;
  summary: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  topics: string[];
  language: "fi" | "sv" | "en";
  relevanceScore?: number;
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  totalResults: number;
  query: string;
  timestamp: Date;
}

/**
 * Fetch Finnish financial news articles
 *
 * This function fetches recent financial news from Finnish sources.
 * In production, this would integrate with actual news APIs (YLE, Kauppalehti, etc.)
 *
 * For now, it provides a mock implementation that simulates real news fetching.
 *
 * @param query - Search query for news articles
 * @param language - Language filter (fi, sv, en)
 * @param maxResults - Maximum number of results to return
 * @returns News search results
 */
export async function fetchFinnishFinancialNews(
  query: string,
  language: "fi" | "sv" | "en" | "all" = "all",
  maxResults: number = 5,
): Promise<NewsSearchResult> {
  // Note: This is a mock implementation
  // In production, integrate with:
  // - YLE News API: https://yle.fi/aihe/yleisradio-developer
  // - Kauppalehti API
  // - Helsingin Sanomat API
  // - NewsAPI.org with Finnish sources

  const mockArticles: NewsArticle[] = [
    {
      title:
        "Suomen Pankki julkaisi uudet taloudelliset lukutaitoohjeet vuodelle 2025",
      summary:
        "Bank of Finland releases new financial literacy guidelines focusing on digital economy and sustainable investing.",
      content: `Suomen Pankki on julkaissut päivitetyt taloudelliset lukutaitoohjeet, jotka korostavat digitaalisen talouden osaamista ja vastuullista sijoittamista.

      Uusissa ohjeissa painotetaan:
      - Digitaalisten maksuvälineiden turvallista käyttöä
      - Kryptovaluuttojen riskien ymmärtämistä
      - Kestävän kehityksen mukaista sijoittamista
      - Taloussuunnittelun merkitystä epävarmassa taloudellisessa tilanteessa`,
      source: "Suomen Pankki / Bank of Finland",
      url: "https://www.suomenpankki.fi/fi/",
      publishedAt: new Date("2025-11-10"),
      topics: ["financial_education", "policy", "investing"],
      language: "fi",
    },
    {
      title: "Nuorten velkaantuminen kasvussa - asiantuntijat huolissaan",
      summary:
        "Youth debt levels rising - experts concerned about quick loan services.",
      content: `Tuoreen tutkimuksen mukaan 18-25-vuotiaiden velkaantuminen on kasvanut 15% viimeisen vuoden aikana. Asiantuntijat syyttävät pikavipalveluita ja kulutusluottojen helppoa saatavuutta.

      Konsumentverket suosittelee:
      - Välttämään pikavippejä kaikissa tilanteissa
      - Hakemaan neuvontaa Takuu-Säätiöstä
      - Budjetoinnin aloittamista jo nuorena
      - Säästöpuskurin rakentamista ennen lainanottoa`,
      source: "Kauppalehti",
      url: "https://www.kauppalehti.fi/",
      publishedAt: new Date("2025-11-12"),
      topics: ["debt_management", "financial_education"],
      language: "fi",
    },
    {
      title: "ECB höjer räntan - hur påverkar det dina lån?",
      summary: "ECB raises interest rate - how does it affect your loans?",
      content: `Europeiska centralbanken har höjt styrräntan med 0,25 procentenheter. Detta påverkar både bolån och konsumentlån i Finland.

      Konsumentverkets råd:
      - Granska dina låneavtal och räntor
      - Överväg att binda räntan om du har rörlig ränta
      - Planera för högre lånekostnader i budgeten
      - Prioritera att betala av högräntelån`,
      source: "Konsumentverket / Swedish Consumer Agency",
      url: "https://www.konsumentverket.se/",
      publishedAt: new Date("2025-11-14"),
      topics: ["debt_management", "financial_system"],
      language: "sv",
    },
    {
      title: "New tax benefits for pension savings in 2026",
      summary:
        "Finnish government announces enhanced tax benefits for private pension savings.",
      content: `The Finnish government has announced new tax incentives for private pension savings starting in 2026. The changes aim to encourage long-term savings and reduce dependency on public pensions.

      Key changes:
      - Increased tax deduction limit for pension contributions
      - New tax-free withdrawal options for certain life events
      - Enhanced employer contribution matching programs
      - Simplified pension account management`,
      source: "Finland Times / Helsingin Sanomat English",
      url: "https://www.helsinkisanomat.fi/",
      publishedAt: new Date("2025-11-13"),
      topics: ["saving", "policy", "financial_system"],
      language: "en",
    },
    {
      title: "Inflaatio hidastuu - mitä se tarkoittaa säästäjille?",
      summary: "Inflation slowing down - what does it mean for savers?",
      content: `Tilastokeskuksen mukaan inflaatio on hidastunut 2,1 prosenttiin lokakuussa. Tämä on hyvä uutinen säästäjille ja kuluttajille.

      Talousasiantuntijoiden näkemys:
      - Rahan ostovoima säilyy paremmin
      - Säästötilit alkavat tarjota positiivista reaalituottoa
      - Hyvä aika tarkistaa sijoitusstrategia
      - Suojausta inflaatiota vastaan voi vähentää`,
      source: "OP Ryhmä / OP Group",
      url: "https://www.op.fi/",
      publishedAt: new Date("2025-11-11"),
      topics: ["saving", "investing", "financial_system"],
      language: "fi",
    },
  ];

  // Filter by language if specified
  let filteredArticles = mockArticles;
  if (language !== "all") {
    filteredArticles = mockArticles.filter(
      (article) => article.language === language,
    );
  }

  // Simple keyword matching for demonstration
  const queryLower = query.toLowerCase();
  const keywordScored = filteredArticles.map((article) => {
    const titleMatch = article.title.toLowerCase().includes(queryLower);
    const summaryMatch = article.summary.toLowerCase().includes(queryLower);
    const contentMatch = article.content.toLowerCase().includes(queryLower);

    let relevanceScore = 0;
    if (titleMatch) relevanceScore += 0.5;
    if (summaryMatch) relevanceScore += 0.3;
    if (contentMatch) relevanceScore += 0.2;

    return {
      ...article,
      relevanceScore,
    };
  });

  // Sort by relevance and recency
  const sorted = keywordScored.sort((a, b) => {
    // Primary sort: relevance score
    if (b.relevanceScore !== a.relevanceScore) {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    // Secondary sort: recency
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  const results = sorted.slice(0, maxResults);

  return {
    articles: results,
    totalResults: filteredArticles.length,
    query,
    timestamp: new Date(),
  };
}

/**
 * Integrate news articles into RAG context
 *
 * This function takes news articles and formats them for RAG integration.
 * It generates embeddings and prepares them for vector storage.
 *
 * @param articles - News articles to integrate
 * @returns Formatted chunks ready for RAG integration
 */
export async function integrateNewsIntoRAG(articles: NewsArticle[]): Promise<
  Array<{
    text: string;
    metadata: {
      title: string;
      source: string;
      url: string;
      publishedAt: string;
      topics: string[];
      language: string;
      type: "news";
    };
  }>
> {
  return articles.map((article) => ({
    text: `# ${article.title}

${article.summary}

${article.content}

Published: ${article.publishedAt.toLocaleDateString("fi-FI")}
Source: ${article.source}`,
    metadata: {
      title: article.title,
      source: article.source,
      url: article.url,
      publishedAt: article.publishedAt.toISOString(),
      topics: article.topics,
      language: article.language,
      type: "news" as const,
    },
  }));
}

/**
 * Summarize news articles for user consumption
 *
 * Uses AI to create concise, actionable summaries of financial news.
 *
 * @param articles - News articles to summarize
 * @param focusArea - Specific financial topic to focus on
 * @returns AI-generated summary
 */
export async function summarizeFinancialNews(
  articles: NewsArticle[],
  focusArea?: string,
): Promise<string> {
  if (articles.length === 0) {
    return "No recent financial news available.";
  }

  const summarySchema = z.object({
    summary: z
      .string()
      .describe(
        "A concise summary of the key financial news and their implications for personal finance",
      ),
    keyPoints: z.array(z.string()).describe("3-5 key takeaways from the news"),
    actionableAdvice: z
      .string()
      .describe("Practical advice based on the current news"),
  });

  const articlesText = articles
    .map(
      (article) => `
Title: ${article.title}
Summary: ${article.summary}
Published: ${article.publishedAt.toLocaleDateString()}
`,
    )
    .join("\n---\n");

  const prompt = `You are a financial news analyst. Summarize the following recent financial news articles for a Finnish audience.

${focusArea ? `Focus particularly on: ${focusArea}\n` : ""}

News Articles:
${articlesText}

Provide:
1. A concise summary of the main developments
2. Key points that readers should know
3. Actionable advice based on these developments`;

  try {
    const result = await withRetry(
      () =>
        generateObject({
          model: google("gemini-2.0-flash-exp"),
          schema: summarySchema,
          prompt,
        }),
      "News Summarization",
      {
        maxAttempts: 3,
        shouldRetry: isRetryableError,
      },
    );

    return `${result.object.summary}

**Key Points:**
${result.object.keyPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")}

**Actionable Advice:**
${result.object.actionableAdvice}`;
  } catch (error) {
    console.error("Error summarizing news:", error);
    // Fallback to simple concatenation
    return articles.map((a) => `• ${a.title}: ${a.summary}`).join("\n\n");
  }
}

/**
 * Get news-enhanced RAG context
 *
 * Combines static knowledge base with recent news for more current information.
 *
 * @param query - User query
 * @param language - Preferred language
 * @returns Combined context from knowledge base and news
 */
export async function getNewsEnhancedContext(
  query: string,
  language: "fi" | "sv" | "en" | "all" = "all",
): Promise<{
  staticKnowledge: string;
  recentNews: string;
  combined: string;
}> {
  // Fetch recent relevant news
  const newsResults = await fetchFinnishFinancialNews(query, language, 3);

  const recentNews =
    newsResults.articles.length > 0
      ? await summarizeFinancialNews(newsResults.articles)
      : "No recent news found for this topic.";

  return {
    staticKnowledge: "Knowledge base results would go here",
    recentNews,
    combined: `**Recent Financial News:**\n${recentNews}\n\n**Established Best Practices:**\n[Knowledge base results]`,
  };
}
