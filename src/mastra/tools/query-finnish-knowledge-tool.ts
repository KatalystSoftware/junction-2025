/**
 * Query Finnish Financial Literacy Knowledge Base Tool
 *
 * This tool allows the evaluator agent to query the Finnish financial literacy
 * knowledge base for research-backed standards and best practices.
 */

import { openai } from "@ai-sdk/openai";
import { LibSQLVector } from "@mastra/libsql";
import { embed } from "ai";
import { z } from "zod";
import { createTool } from "@mastra/core/tools";

// Shared vector store instance
let vectorStore: LibSQLVector | null = null;

function getVectorStore() {
  if (!vectorStore) {
    vectorStore = new LibSQLVector({
      id: "finnish-financial-literacy",
      connectionUrl: "file:knowledge-base.db",
    });
  }
  return vectorStore;
}

export const queryFinnishKnowledgeTool = createTool({
  id: "queryFinnishKnowledge",
  description: `Query the Finnish financial literacy knowledge base for research-backed standards and best practices.

  Use this tool to:
  - Find best practices for specific financial topics (budgeting, saving, debt, investing)
  - Look up quality criteria for financial advice
  - Get information from Finnish financial education programs (Yrityskylä, Bank of Finland)
  - Reference research-backed standards for evaluating advice

  Topics available: budgeting, saving, debt_management, investing, risk_management, financial_education, financial_system
  `,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The question or topic to query. Examples: 'budgeting best practices', 'debt management principles', 'quality criteria for investment advice'",
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
        "general",
      ])
      .optional()
      .describe("Optional: Filter by specific topic"),
    topK: z
      .number()
      .min(1)
      .max(10)
      .default(3)
      .describe("Number of relevant chunks to return (1-10, default 3)"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        text: z
          .string()
          .describe("The relevant content from the knowledge base"),
        section: z.string().describe("The section this content is from"),
        topic: z.string().describe("The topic category"),
        source: z.string().describe("The source citation"),
        score: z.number().describe("Relevance score (0-1)"),
      }),
    ),
    summary: z.string().describe("A brief summary of the findings"),
  }),
  execute: async (input) => {
    const { query, topic, topK = 3 } = input;

    try {
      // Generate embedding for the query
      const { embedding } = await embed({
        value: query,
        model: openai.embedding("text-embedding-3-small"),
      });

      // Query vector store
      const store = getVectorStore();

      const queryParams: any = {
        indexName: "finnish_financial_literacy",
        queryVector: embedding,
        topK,
        includeVector: false,
      };

      // Add topic filter if specified
      if (topic) {
        queryParams.filter = { topic: { $eq: topic } };
      }

      const searchResults = await store.query(queryParams);

      // Format results
      const results = searchResults.map((result) => ({
        text: result.metadata?.text || "",
        section: result.metadata?.section || "Unknown",
        topic: result.metadata?.topic || "general",
        source:
          result.metadata?.source ||
          "Finnish Financial Literacy Knowledge Base",
        score: result.score,
      }));

      // Generate summary
      let summary = "";
      if (results.length === 0) {
        summary = `No relevant information found for query: "${query}"`;
      } else {
        const topResult = results[0];
        summary = `Found ${results.length} relevant sources from Finnish financial literacy education, including information from ${topResult.source} on ${topResult.section}.`;
      }

      return {
        results,
        summary,
      };
    } catch (error: any) {
      // If index doesn't exist or other error, return helpful message
      if (
        error.message?.includes("no such table") ||
        error.message?.includes("not found")
      ) {
        return {
          results: [],
          summary:
            "Knowledge base not initialized. Please run the initialization script first: node src/mastra/rag/init-knowledge-base.ts",
        };
      }

      throw error;
    }
  },
});
