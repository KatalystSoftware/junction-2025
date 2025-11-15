/**
 * Enhanced Query Knowledge Base Tool
 *
 * This tool provides advanced querying capabilities with:
 * - Multi-language support (Finnish, Swedish, English)
 * - Semantic reranking for better results
 * - Real-time news integration
 * - Cross-language search
 */

import { google } from "@ai-sdk/google";
import { LibSQLVector } from "@mastra/libsql";
import { embed } from "ai";
import { z } from "zod";
import { createTool } from "@mastra/core/tools";
import {
  withRetry,
  isRetryableError,
  logError,
} from "../utils/error-recovery.ts";
import { rerankResults, keywordRerank } from "../rag/semantic-reranker.ts";
import {
  fetchFinnishFinancialNews,
  summarizeFinancialNews,
} from "../rag/news-integration.ts";

// Shared vector store instance
let vectorStore: LibSQLVector | null = null;

function getVectorStore() {
  if (!vectorStore) {
    vectorStore = new LibSQLVector({
      id: "enhanced-financial-literacy",
      connectionUrl: "file:knowledge-base.db",
    });
  }
  return vectorStore;
}

export const queryKnowledgeEnhancedTool = createTool({
  id: "queryKnowledgeEnhanced",
  description: `Enhanced query tool for the multi-language financial literacy knowledge base with semantic reranking and real-time news.

  Features:
  - Multi-language support (Finnish, Swedish, English)
  - Semantic reranking for higher quality results
  - Real-time Finnish financial news integration
  - Cross-language search capability

  Use this tool to:
  - Find best practices in multiple languages
  - Get current financial news relevant to the query
  - Access research-backed standards with semantic relevance scoring
  - Compare financial advice across different language sources

  Topics: budgeting, saving, debt_management, investing, risk_management, financial_education, financial_system, retirement, tax_planning
  `,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The question or topic to query. Examples: 'budgeting best practices', 'pension planning advice'",
      ),
    language: z
      .enum(["fi", "sv", "en", "all"])
      .default("all")
      .describe(
        "Language filter: 'fi' (Finnish), 'sv' (Swedish), 'en' (English), 'all' (search all languages)",
      ),
    topic: z
      .enum([
        "budgeting",
        "saving",
        "debt_management",
        "investing",
        "risk_management",
        "financial_education",
        "financial_system",
        "retirement",
        "tax_planning",
        "general",
      ])
      .optional()
      .describe("Optional: Filter by specific topic"),
    includeNews: z
      .boolean()
      .default(true)
      .describe("Include recent financial news in the results"),
    useSemanticReranking: z
      .boolean()
      .default(true)
      .describe("Use AI-powered semantic reranking for better result quality"),
    topK: z
      .number()
      .min(1)
      .max(15)
      .default(5)
      .describe("Number of relevant results to return (1-15, default 5)"),
  }),
  outputSchema: z.object({
    knowledgeBaseResults: z.array(
      z.object({
        text: z
          .string()
          .describe("The relevant content from the knowledge base"),
        section: z.string().describe("The section this content is from"),
        topic: z.string().describe("The topic category"),
        source: z.string().describe("The source citation"),
        language: z.string().describe("Language of the content (fi/sv/en)"),
        score: z.number().describe("Relevance score (0-1)"),
        rerankScore: z
          .number()
          .optional()
          .describe("Semantic reranking score if reranking was used"),
        relevanceExplanation: z
          .string()
          .optional()
          .describe("Explanation of relevance (if reranking enabled)"),
      }),
    ),
    newsResults: z
      .object({
        summary: z.string().describe("Summary of recent relevant news"),
        articles: z
          .array(
            z.object({
              title: z.string(),
              summary: z.string(),
              source: z.string(),
              language: z.string(),
              publishedAt: z.string(),
            }),
          )
          .describe("Recent news articles"),
      })
      .optional()
      .describe("Recent financial news if includeNews is true"),
    summary: z.string().describe("Overall summary of findings"),
    languageBreakdown: z
      .object({
        fi: z.number(),
        sv: z.number(),
        en: z.number(),
      })
      .describe("Number of results from each language"),
  }),
  execute: async (input) => {
    const {
      query,
      language = "all",
      topic,
      includeNews = true,
      useSemanticReranking = true,
      topK = 5,
    } = input;

    try {
      const store = getVectorStore();

      // Determine which indices to search
      const indices: string[] = [];
      if (language === "all") {
        indices.push(
          "finnish_financial_literacy",
          "swedish_financial_literacy",
          "english_financial_literacy",
        );
      } else {
        const indexMap = {
          fi: "finnish_financial_literacy",
          sv: "swedish_financial_literacy",
          en: "english_financial_literacy",
        };
        indices.push(indexMap[language]);
      }

      // Generate embedding for the query
      const { embedding } = await withRetry(
        () =>
          embed({
            value: query,
            model: google.textEmbeddingModel("text-embedding-004"),
          }),
        "Embedding Generation",
        {
          maxAttempts: 3,
          shouldRetry: isRetryableError,
        },
      );

      // Query each index and combine results
      const allResults = [];

      for (const indexName of indices) {
        try {
          const queryParams: any = {
            indexName,
            queryVector: embedding,
            topK: topK * 2, // Get more results for reranking
            includeVector: false,
          };

          // Add topic filter if specified
          if (topic) {
            queryParams.filter = { topic: { $eq: topic } };
          }

          const searchResults = await withRetry(
            () => store.query(queryParams),
            `Vector Store Query (${indexName})`,
            {
              maxAttempts: 3,
              shouldRetry: isRetryableError,
            },
          );

          allResults.push(...searchResults);
        } catch (error: any) {
          console.warn(`Could not query index ${indexName}:`, error.message);
          // Continue with other indices
        }
      }

      if (allResults.length === 0) {
        return {
          knowledgeBaseResults: [],
          summary: `No results found for query: "${query}"`,
          languageBreakdown: { fi: 0, sv: 0, en: 0 },
        };
      }

      // Format candidates for reranking
      const candidates = allResults.map((result) => ({
        text: result.metadata?.text || "",
        section: result.metadata?.section || "Unknown",
        topic: result.metadata?.topic || "general",
        source:
          result.metadata?.source || "Financial Literacy Knowledge Base",
        language: result.metadata?.language || "unknown",
        score: result.score,
        metadata: result.metadata,
      }));

      // Apply reranking if enabled
      let rankedResults;
      if (useSemanticReranking && candidates.length > topK) {
        try {
          rankedResults = await rerankResults(query, candidates, topK);
        } catch (error) {
          console.warn("Reranking failed, using keyword rerank:", error);
          rankedResults = keywordRerank(query, candidates, topK);
        }
      } else {
        // Just use top K by score
        rankedResults = candidates
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map((c) => ({
            ...c,
            originalScore: c.score,
            rerankScore: c.score,
            finalScore: c.score,
          }));
      }

      // Format knowledge base results
      const knowledgeBaseResults = rankedResults.map((result) => ({
        text: result.text,
        section: result.section || "Unknown",
        topic: result.topic || "general",
        source: result.source || "Knowledge Base",
        language: result.language || "unknown",
        score: result.finalScore,
        rerankScore: useSemanticReranking ? result.rerankScore : undefined,
        relevanceExplanation: result.relevanceExplanation,
      }));

      // Calculate language breakdown
      const languageBreakdown = {
        fi: knowledgeBaseResults.filter((r) => r.language === "fi").length,
        sv: knowledgeBaseResults.filter((r) => r.language === "sv").length,
        en: knowledgeBaseResults.filter((r) => r.language === "en").length,
      };

      // Fetch and integrate news if requested
      let newsResults;
      if (includeNews) {
        try {
          const newsLang = language === "all" ? "all" : language;
          const news = await fetchFinnishFinancialNews(
            query,
            newsLang as any,
            3,
          );

          if (news.articles.length > 0) {
            const newsSummary = await summarizeFinancialNews(
              news.articles,
              topic,
            );

            newsResults = {
              summary: newsSummary,
              articles: news.articles.map((article) => ({
                title: article.title,
                summary: article.summary,
                source: article.source,
                language: article.language,
                publishedAt: article.publishedAt.toISOString(),
              })),
            };
          }
        } catch (error) {
          console.warn("Could not fetch news:", error);
          // Continue without news
        }
      }

      // Generate overall summary
      const topResult = knowledgeBaseResults[0];
      let summary = `Found ${knowledgeBaseResults.length} relevant sources`;

      if (language !== "all") {
        const langName = { fi: "Finnish", sv: "Swedish", en: "English" }[
          language
        ];
        summary += ` in ${langName}`;
      } else {
        summary += ` across ${Object.values(languageBreakdown).filter((v) => v > 0).length} languages`;
      }

      if (topResult) {
        summary += `, including information from ${topResult.source} on ${topResult.section}`;
      }

      if (newsResults && newsResults.articles.length > 0) {
        summary += `. Also found ${newsResults.articles.length} recent news articles`;
      }

      summary += ".";

      if (useSemanticReranking) {
        summary += " Results were semantically reranked for better relevance.";
      }

      return {
        knowledgeBaseResults,
        newsResults,
        summary,
        languageBreakdown,
      };
    } catch (error: any) {
      // Handle errors gracefully
      if (
        error.message?.includes("no such table") ||
        error.message?.includes("not found")
      ) {
        return {
          knowledgeBaseResults: [],
          summary:
            "Enhanced knowledge base not initialized. Please run: npm run init:knowledge-base:enhanced",
          languageBreakdown: { fi: 0, sv: 0, en: 0 },
        };
      }

      throw error;
    }
  },
});
