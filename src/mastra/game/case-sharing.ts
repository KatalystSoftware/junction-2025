/**
 * Case Sharing Manager
 * Handles sharing interesting consultation cases with the community
 */

import { randomUUID } from "node:crypto";
import type { AdvisorState, ConsultationSession, SharedCase } from "../types/game-types.ts";
import { leaderboardService } from "../persistence/leaderboard-service.ts";

export interface CaseShareOptions {
  sessionId: string;
  title: string;
  summary: string;
  isPublic?: boolean;
  anonymizeCharacter?: boolean;
}

/**
 * Share a consultation case
 */
export async function shareConsultationCase(
  advisorState: AdvisorState,
  advisorName: string,
  options: CaseShareOptions
): Promise<SharedCase> {
  // Find the session
  const session = advisorState.sessionHistory.find((s) => s.sessionId === options.sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  // Create the shared case
  const sharedCase: Omit<SharedCase, "createdAt"> = {
    caseUuid: randomUUID(),
    advisorId: advisorState.advisorId,
    advisorName,
    characterName: options.anonymizeCharacter ? "Anonymous Client" : session.characterName,
    caseTitle: options.title,
    caseSummary: options.summary,
    initialProblem: session.playerAdvice[0] || "Financial consultation",
    adviceGiven: session.playerAdvice.join("\n"),
    financialImpact: session.financialProjection?.totalSaved || 0,
    adviceQualityScore: session.adviceQualityScore,
    sessionDate: session.timestamp,
    topicsCovered: session.topicsCovered,
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    isPublic: options.isPublic !== false,
    anonymizeCharacter: options.anonymizeCharacter || false,
  };

  // Save to database
  await leaderboardService.shareCase(sharedCase);

  return {
    ...sharedCase,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get shareable sessions (high quality, interesting cases)
 */
export function getShareableSessions(advisorState: AdvisorState): ConsultationSession[] {
  return advisorState.sessionHistory.filter((session) => {
    // Must have evaluation
    if (!session.evaluation) return false;

    // Must be high quality (7+ score)
    if (session.adviceQualityScore < 7) return false;

    // Must have financial impact
    if (!session.financialProjection || session.financialProjection.totalSaved < 100) {
      return false;
    }

    return true;
  });
}

/**
 * Generate case title suggestion based on session
 */
export function suggestCaseTitle(session: ConsultationSession): string {
  const topic = session.topicsCovered[0] || "financial";
  const impact = session.financialProjection?.totalSaved || 0;

  const titles = [
    `Helping ${session.characterName} with ${topic}`,
    `€${Math.round(impact)} savings plan for ${session.characterName}`,
    `Solving ${session.characterName}'s ${topic} challenge`,
    `${session.characterName}'s path to financial stability`,
  ];

  // Return a random title
  return titles[Math.floor(Math.random() * titles.length)];
}

/**
 * Generate case summary suggestion
 */
export function suggestCaseSummary(session: ConsultationSession): string {
  const topic = session.topicsCovered.join(", ");
  const impact = session.financialProjection?.totalSaved || 0;
  const score = session.adviceQualityScore;

  let summary = `A consultation focusing on ${topic}. `;

  if (session.evaluation) {
    if (session.evaluation.wasEmpathetic) {
      summary += "Built strong rapport with empathetic approach. ";
    }
    if (session.evaluation.wasActionable) {
      summary += "Provided clear, actionable steps. ";
    }
    if (session.evaluation.wasAccurate) {
      summary += "Delivered accurate financial guidance. ";
    }
  }

  if (impact > 0) {
    summary += `Helped client save €${Math.round(impact)}. `;
  }

  summary += `Quality score: ${score.toFixed(1)}/10.`;

  return summary;
}

/**
 * Get popular cases
 */
export async function getPopularCases(limit = 20): Promise<SharedCase[]> {
  return await leaderboardService.getPopularCases(limit);
}

/**
 * Get recent cases
 */
export async function getRecentCases(limit = 20): Promise<SharedCase[]> {
  return await leaderboardService.getRecentCases(limit);
}

/**
 * Like a case
 */
export async function likeCase(caseUuid: string, advisorId: string): Promise<void> {
  await leaderboardService.addCaseReaction(caseUuid, advisorId, "like");
}

/**
 * Mark case as helpful
 */
export async function markCaseHelpful(caseUuid: string, advisorId: string): Promise<void> {
  await leaderboardService.addCaseReaction(caseUuid, advisorId, "helpful");
}

/**
 * Mark case as insightful
 */
export async function markCaseInsightful(caseUuid: string, advisorId: string): Promise<void> {
  await leaderboardService.addCaseReaction(caseUuid, advisorId, "insightful");
}

/**
 * Comment on a case
 */
export async function commentOnCase(
  caseUuid: string,
  advisorId: string,
  advisorName: string,
  comment: string
): Promise<void> {
  await leaderboardService.addCaseComment(caseUuid, advisorId, advisorName, comment);
}

/**
 * Get case comments
 */
export async function getCaseComments(caseUuid: string) {
  return await leaderboardService.getCaseComments(caseUuid);
}

/**
 * Format case for display
 */
export function formatCaseForDisplay(sharedCase: SharedCase): string {
  const lines: string[] = [];

  lines.push(`📋 ${sharedCase.caseTitle}`);
  lines.push(`By: ${sharedCase.advisorName} | Quality: ${sharedCase.adviceQualityScore.toFixed(1)}/10`);
  lines.push("");
  lines.push(sharedCase.caseSummary);
  lines.push("");
  lines.push(`Topics: ${sharedCase.topicsCovered.join(", ")}`);
  lines.push(`Financial Impact: €${Math.round(sharedCase.financialImpact)}`);
  lines.push("");
  lines.push(`👍 ${sharedCase.likesCount} | 💬 ${sharedCase.commentsCount} | 👁 ${sharedCase.viewsCount}`);

  return lines.join("\n");
}
