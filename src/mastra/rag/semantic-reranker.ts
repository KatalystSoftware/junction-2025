/**
 * Semantic Reranking Module
 *
 * This module provides semantic reranking capabilities to improve RAG result quality.
 * It uses AI models to rerank search results based on semantic relevance to the query.
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { withRetry, isRetryableError } from "../utils/error-recovery.ts";

export interface RerankCandidate {
  text: string;
  section?: string;
  topic?: string;
  source?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RerankedResult extends RerankCandidate {
  originalScore: number;
  rerankScore: number;
  finalScore: number;
  relevanceExplanation?: string;
}

/**
 * Rerank search results using semantic understanding
 *
 * This function takes search results and reranks them based on their
 * semantic relevance to the query, not just vector similarity.
 *
 * @param query - The original user query
 * @param candidates - Array of candidate results to rerank
 * @param topK - Number of top results to return after reranking
 * @returns Reranked results with scores and explanations
 */
export async function rerankResults(
  query: string,
  candidates: RerankCandidate[],
  topK: number = 5,
): Promise<RerankedResult[]> {
  if (candidates.length === 0) {
    return [];
  }

  // If we have fewer candidates than requested, just return them all
  if (candidates.length <= topK) {
    return candidates.map((candidate) => ({
      ...candidate,
      originalScore: candidate.score,
      rerankScore: candidate.score,
      finalScore: candidate.score,
    }));
  }

  try {
    // Use AI to score relevance of each candidate
    const scoringSchema = z.object({
      scores: z.array(
        z.object({
          index: z.number().describe("Index of the candidate (0-based)"),
          relevanceScore: z
            .number()
            .min(0)
            .max(1)
            .describe("Relevance score from 0 (not relevant) to 1 (highly relevant)"),
          explanation: z
            .string()
            .describe("Brief explanation of why this result is relevant or not"),
        }),
      ),
    });

    const prompt = `You are a semantic relevance evaluator for a financial literacy knowledge base.

Given the user query and a list of text snippets, evaluate how relevant each snippet is to answering the query.

User Query: "${query}"

Text Snippets:
${candidates.map((c, i) => `[${i}] ${c.text.substring(0, 300)}${c.text.length > 300 ? "..." : ""}`).join("\n\n")}

For each snippet, provide:
1. A relevance score from 0 (completely irrelevant) to 1 (perfectly relevant)
2. A brief explanation of the relevance

Consider:
- Direct relevance to the query topic
- Quality and specificity of information
- Actionability of the content
- Completeness of the answer`;

    const result = await withRetry(
      () =>
        generateObject({
          model: google("gemini-2.0-flash-exp"),
          schema: scoringSchema,
          prompt,
        }),
      "Semantic Reranking",
      {
        maxAttempts: 3,
        shouldRetry: isRetryableError,
      },
    );

    // Combine original vector scores with AI relevance scores
    const rerankedResults: RerankedResult[] = candidates.map((candidate, index) => {
      const aiScore = result.object.scores.find((s) => s.index === index);
      const rerankScore = aiScore?.relevanceScore ?? candidate.score;

      // Weighted combination: 40% original vector score, 60% AI relevance score
      const finalScore = candidate.score * 0.4 + rerankScore * 0.6;

      return {
        ...candidate,
        originalScore: candidate.score,
        rerankScore,
        finalScore,
        relevanceExplanation: aiScore?.explanation,
      };
    });

    // Sort by final score and return top K
    return rerankedResults
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK);
  } catch (error: any) {
    console.error("Error during reranking, falling back to original scores:", error);

    // Fallback: just return top K by original score
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((candidate) => ({
        ...candidate,
        originalScore: candidate.score,
        rerankScore: candidate.score,
        finalScore: candidate.score,
      }));
  }
}

/**
 * Simple reranking based on keyword matching and density
 *
 * This is a faster, cheaper alternative to AI-based reranking.
 * It boosts scores based on query keyword presence and density.
 *
 * @param query - The original user query
 * @param candidates - Array of candidate results to rerank
 * @param topK - Number of top results to return
 * @returns Reranked results
 */
export function keywordRerank(
  query: string,
  candidates: RerankCandidate[],
  topK: number = 5,
): RerankedResult[] {
  if (candidates.length === 0) {
    return [];
  }

  // Extract keywords from query (simple tokenization)
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3); // Only words longer than 3 chars

  const rerankedResults: RerankedResult[] = candidates.map((candidate) => {
    const text = candidate.text.toLowerCase();
    let keywordBoost = 0;

    // Count keyword matches
    keywords.forEach((keyword) => {
      const matches = (text.match(new RegExp(keyword, "g")) || []).length;
      keywordBoost += matches * 0.1; // Each match adds 0.1 to the boost
    });

    // Cap the boost at 0.5
    keywordBoost = Math.min(keywordBoost, 0.5);

    // Calculate final score: 70% original, 30% keyword boost
    const finalScore = Math.min(candidate.score * 0.7 + keywordBoost, 1.0);

    return {
      ...candidate,
      originalScore: candidate.score,
      rerankScore: candidate.score + keywordBoost,
      finalScore,
    };
  });

  // Sort and return top K
  return rerankedResults
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);
}

/**
 * Diversity-aware reranking
 *
 * This ensures diversity in results by penalizing very similar documents.
 * Useful when you want to show results from different sections/topics.
 *
 * @param candidates - Array of candidate results
 * @param topK - Number of top results to return
 * @returns Diversified results
 */
export function diversityRerank(
  candidates: RerankCandidate[],
  topK: number = 5,
): RerankedResult[] {
  if (candidates.length === 0) {
    return [];
  }

  const selected: RerankedResult[] = [];
  const remaining = [...candidates].sort((a, b) => b.score - a.score);

  while (selected.length < topK && remaining.length > 0) {
    const next = remaining.shift()!;

    // Check diversity: penalize if too similar to already selected
    let diversityPenalty = 0;
    selected.forEach((existing) => {
      if (existing.section === next.section && existing.topic === next.topic) {
        diversityPenalty += 0.2;
      }
    });

    const finalScore = Math.max(next.score - diversityPenalty, 0);

    selected.push({
      ...next,
      originalScore: next.score,
      rerankScore: next.score - diversityPenalty,
      finalScore,
    });
  }

  return selected;
}
