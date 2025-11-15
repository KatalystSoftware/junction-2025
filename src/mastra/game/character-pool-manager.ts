/**
 * Character Pool Manager
 *
 * Manages the pool of characters and scenarios for the financial advisor simulator.
 * Handles loading from JSON, character selection, and follow-up scheduling.
 */

import fs from "fs/promises";
import path from "path";
import type {
  Character,
  Scenario,
  AdvisorState,
  ConsultationSession,
  FinancialTopic,
  CharacterConversationMemory,
  TrustTier,
  RelationshipProgression,
} from "../types/game-types.ts";

/**
 * Calculate trust tier from trust level
 */
export function calculateTrustTier(trustLevel: number): TrustTier {
  if (trustLevel >= 0.8) return "best_friend";
  if (trustLevel >= 0.6) return "close";
  if (trustLevel >= 0.4) return "trusted";
  if (trustLevel >= 0.2) return "acquaintance";
  return "stranger";
}

/**
 * Get trust tier display info
 */
export function getTrustTierInfo(tier: TrustTier): {
  name: string;
  icon: string;
  color: string;
  description: string;
} {
  switch (tier) {
    case "best_friend":
      return {
        name: "Best Friend",
        icon: "💎",
        color: "magenta",
        description: "Deep trust - unlocks special scenarios",
      };
    case "close":
      return {
        name: "Close Friend",
        icon: "💚",
        color: "green",
        description: "Strong relationship - recommends you to others",
      };
    case "trusted":
      return {
        name: "Trusted",
        icon: "💙",
        color: "cyan",
        description: "Building trust - follows your advice",
      };
    case "acquaintance":
      return {
        name: "Acquaintance",
        icon: "💛",
        color: "yellow",
        description: "Getting to know you - still testing the waters",
      };
    case "stranger":
      return {
        name: "Stranger",
        icon: "🤝",
        color: "gray",
        description: "Just met - needs to build trust",
      };
  }
}

export interface PendingFollowUp {
  characterId: string;
  scenarioId: string;
  triggerAfterSession: number; // Session number after which this should trigger
  triggeredBy:
    | "good_advice_followed"
    | "bad_advice_or_not_followed"
    | "mixed_results";
}

export class CharacterPoolManager {
  private characters: Map<string, Character> = new Map();
  private scenarios: Map<string, Scenario> = new Map();
  private usedScenarios: Set<string> = new Set();
  private pendingFollowUps: PendingFollowUp[] = [];

  /**
   * Load characters and scenarios from JSON files or directories
   */
  async loadFromFiles(
    charactersPath: string,
    scenariosPath: string,
  ): Promise<void> {
    try {
      // Load characters - support both single file and directory
      const charactersData =
        await this.loadJsonFromPathOrDirectory(charactersPath);
      const characterArray: Character[] = charactersData;

      this.characters.clear();
      for (const char of characterArray) {
        // Ensure new memory fields are initialized
        const trustLevel = char.relationshipState.trustLevel || 0.5;
        this.characters.set(char.characterId, {
          ...char,
          conversationHistory: char.conversationHistory || [],
          advisorNotes: char.advisorNotes || "",
          relationshipState: {
            ...char.relationshipState,
            trustLevel,
            trustTier: calculateTrustTier(trustLevel),
            progressionHistory: char.relationshipState.progressionHistory || [],
            decayApplied: char.relationshipState.decayApplied || 0,
            wasRecommended: char.relationshipState.wasRecommended || false,
          },
        });
      }

      // Load scenarios - support both single file and directory
      const scenariosData =
        await this.loadJsonFromPathOrDirectory(scenariosPath);
      const scenarioArray: Scenario[] = scenariosData.flat(); // Flatten in case of multiple files

      this.scenarios.clear();
      for (const scenario of scenarioArray) {
        this.scenarios.set(scenario.scenarioId, scenario);
      }

      console.log(
        `✅ Loaded ${this.characters.size} characters and ${this.scenarios.size} scenarios`,
      );

      // Initialize financial simulation with 6-month history
      await this.initializeFinancialSimulation();
    } catch (error) {
      console.error("❌ Error loading character/scenario files:", error);
      throw error;
    }
  }

  /**
   * Initialize financial simulation for all characters with 6-month history
   */
  private async initializeFinancialSimulation(): Promise<void> {
    try {
      const { SimulationEngine } = await import(
        "../simulation/simulation-engine.ts"
      );
      const { generateInitialHistory } = await import(
        "../simulation/initial-history-generator.ts"
      );

      const dbPath = process.env.DATABASE_URL || "postgresql://junction_user:junction_dev_password@localhost:5433/junction2025";
      const engine = new SimulationEngine(dbPath);

      const allCharacters = this.getAllCharacters();
      let initializedCount = 0;

      for (const character of allCharacters) {
        // Check if character already has simulation history
        const state = await engine.getCharacterState(character.characterId);
        const transactions = await engine.getRecentTransactions(character.characterId, 1);
        const hasHistory = state && transactions.length > 0;

        if (!hasHistory) {
          console.log(
            `   📊 Generating 6-month financial history for ${character.name}...`,
          );
          await generateInitialHistory(character, engine);
          initializedCount++;
        }
      }

      await engine.close();

      if (initializedCount > 0) {
        console.log(
          `   ✅ Initialized ${initializedCount} characters with financial history`,
        );
      }
    } catch (error) {
      console.error("⚠️  Could not initialize financial simulation:", error);
      // Don't throw - simulation is optional
    }
  }

  /**
   * Load JSON data from a file or directory
   * If directory, loads all .json files and combines them
   */
  private async loadJsonFromPathOrDirectory(filePath: string): Promise<any[]> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        // Single file - load and parse
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
      } else if (stats.isDirectory()) {
        // Directory - load all JSON files
        const files = await fs.readdir(filePath);
        const jsonFiles = files.filter((file) => file.endsWith(".json"));

        const allData: any[] = [];
        for (const file of jsonFiles) {
          const fullPath = path.join(filePath, file);
          const fileData = await fs.readFile(fullPath, "utf-8");
          const parsed = JSON.parse(fileData);
          // If parsed is an array, spread it; otherwise add as single item
          if (Array.isArray(parsed)) {
            allData.push(...parsed);
          } else {
            allData.push(parsed);
          }
        }

        return allData;
      } else {
        throw new Error(`Path ${filePath} is neither a file nor a directory`);
      }
    } catch (error) {
      console.error(`❌ Error loading JSON from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get all characters
   */
  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * Get character by ID
   */
  getCharacter(characterId: string): Character | undefined {
    return this.characters.get(characterId);
  }

  /**
   * Get scenario by ID
   */
  getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * Update character state (e.g., after consultation)
   */
  updateCharacter(characterId: string, updates: Partial<Character>): void {
    const char = this.characters.get(characterId);
    if (char) {
      this.characters.set(characterId, { ...char, ...updates });
    }
  }

  /**
   * Update character relationship state
   */
  updateCharacterRelationship(
    characterId: string,
    updates: {
      trustLevel?: number;
      visitCount?: number;
      adviceFollowed?: {
        scenarioId: string;
        adviceGiven: string[];
        followed: boolean;
        outcome: "positive" | "negative" | "neutral";
      };
      progressionEvent?: {
        event:
          | "advice_positive"
          | "advice_negative"
          | "decay"
          | "recommendation";
        trustChange: number;
      };
    },
  ): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    const updatedChar = { ...char };
    const oldTrustLevel = updatedChar.relationshipState.trustLevel;

    if (updates.trustLevel !== undefined) {
      updatedChar.relationshipState.trustLevel = Math.max(
        0,
        Math.min(1, updates.trustLevel),
      );
      // Update trust tier
      updatedChar.relationshipState.trustTier = calculateTrustTier(
        updatedChar.relationshipState.trustLevel,
      );
    }

    if (updates.visitCount !== undefined) {
      updatedChar.relationshipState.visitCount = updates.visitCount;
    }

    if (updates.adviceFollowed) {
      updatedChar.relationshipState.adviceFollowedHistory.push({
        scenarioId: updates.adviceFollowed.scenarioId,
        adviceGiven: updates.adviceFollowed.adviceGiven,
        followed: updates.adviceFollowed.followed,
        outcome: updates.adviceFollowed.outcome,
        timestamp: new Date().toISOString(),
      });
    }

    // Track progression history
    if (updates.progressionEvent || updates.trustLevel !== undefined) {
      const trustChange = updates.progressionEvent
        ? updates.progressionEvent.trustChange
        : (updates.trustLevel || oldTrustLevel) - oldTrustLevel;

      if (Math.abs(trustChange) > 0.001) {
        // Only track if there's meaningful change
        const event = updates.progressionEvent
          ? updates.progressionEvent.event
          : trustChange > 0
            ? "advice_positive"
            : "advice_negative";

        updatedChar.relationshipState.progressionHistory.push({
          timestamp: new Date().toISOString(),
          trustLevel: updatedChar.relationshipState.trustLevel,
          event,
          trustChange,
        });

        // Keep only last 20 progression events
        if (updatedChar.relationshipState.progressionHistory.length > 20) {
          updatedChar.relationshipState.progressionHistory =
            updatedChar.relationshipState.progressionHistory.slice(-20);
        }
      }
    }

    updatedChar.relationshipState.lastVisit = new Date().toISOString();

    this.characters.set(characterId, updatedChar);
  }

  /**
   * Save character memory after a consultation session
   */
  saveCharacterMemory(
    characterId: string,
    sessionData: CharacterConversationMemory,
  ): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    const updatedChar = { ...char };

    // Add to conversation history
    updatedChar.conversationHistory.push(sessionData);

    // Update advisor notes based on the session
    const outcomeText =
      sessionData.outcome === "positive"
        ? "The advice helped"
        : sessionData.outcome === "negative"
          ? "The advice didn't work well"
          : "Mixed results";

    const newNote = `Session ${new Date(sessionData.timestamp).toLocaleDateString()}: ${outcomeText}. `;

    // Keep notes concise - only last 3 sessions
    const recentNotes = updatedChar.conversationHistory
      .slice(-3)
      .map((mem) => {
        const outcome =
          mem.outcome === "positive"
            ? "helpful"
            : mem.outcome === "negative"
              ? "unhelpful"
              : "mixed";
        return `${new Date(mem.timestamp).toLocaleDateString()}: ${outcome}`;
      })
      .join("; ");

    updatedChar.advisorNotes = recentNotes;

    this.characters.set(characterId, updatedChar);
  }

  /**
   * Get character memory for a returning character
   */
  getCharacterMemory(characterId: string): {
    conversationHistory: CharacterConversationMemory[];
    advisorNotes: string;
  } | null {
    const char = this.characters.get(characterId);
    if (!char) return null;

    return {
      conversationHistory: char.conversationHistory || [],
      advisorNotes: char.advisorNotes || "",
    };
  }

  /**
   * Check if there are pending follow-ups ready to trigger
   */
  getReadyFollowUps(currentSessionNumber: number): PendingFollowUp[] {
    return this.pendingFollowUps.filter(
      (followUp) => currentSessionNumber >= followUp.triggerAfterSession,
    );
  }

  /**
   * Schedule a follow-up scenario
   */
  scheduleFollowUp(
    characterId: string,
    scenarioId: string,
    currentSessionNumber: number,
    delayInSessions: number,
    triggeredBy:
      | "good_advice_followed"
      | "bad_advice_or_not_followed"
      | "mixed_results",
  ): void {
    this.pendingFollowUps.push({
      characterId,
      scenarioId,
      triggerAfterSession: currentSessionNumber + delayInSessions,
      triggeredBy,
    });

    console.log(
      `📅 Scheduled follow-up: ${scenarioId} for character ${characterId} after session ${
        currentSessionNumber + delayInSessions
      }`,
    );
  }

  /**
   * Remove a follow-up from pending queue (after it's been used)
   */
  removeFollowUp(scenarioId: string): void {
    this.pendingFollowUps = this.pendingFollowUps.filter(
      (f) => f.scenarioId !== scenarioId,
    );
  }

  /**
   * Get next scenario for a specific character (returning client)
   */
  getNextScenarioForCharacter(
    characterId: string,
    advisorState: AdvisorState,
  ): Scenario | null {
    const character = this.characters.get(characterId);
    if (!character) return null;

    // Get all scenarios for this character
    const characterScenarios = Array.from(this.scenarios.values()).filter(
      (s) =>
        s.characterId === characterId && !this.usedScenarios.has(s.scenarioId),
    );

    // Filter by advisor skill level
    const suitableScenarios = characterScenarios.filter((scenario) => {
      const conditions = scenario.triggerConditions;
      return (
        advisorState.skillLevel >= conditions.advisorSkillLevel.min &&
        advisorState.skillLevel <= conditions.advisorSkillLevel.max
      );
    });

    // If no suitable scenarios, return null
    if (suitableScenarios.length === 0) return null;

    // Pick a random suitable scenario
    const randomIndex = Math.floor(Math.random() * suitableScenarios.length);
    return suitableScenarios[randomIndex];
  }

  /**
   * Get a new character for the advisor (first-time client)
   */
  getNewCharacter(advisorState: AdvisorState): {
    character: Character;
    scenario: Scenario;
  } | null {
    // Get characters that haven't visited yet
    const newCharacters = Array.from(this.characters.values()).filter(
      (char) => char.relationshipState.visitCount === 0,
    );

    if (newCharacters.length === 0) {
      console.log("⚠️ No new characters available");
      return null;
    }

    const deterministic =
      process.env.TEST_CACHE_MODE === "record" ||
      process.env.TEST_CACHE_MODE === "replay";

    const candidatePairs: { character: Character; scenario: Scenario }[] = [];

    for (const character of newCharacters) {
      const initialScenarios = Array.from(this.scenarios.values()).filter(
        (s) =>
          s.characterId === character.characterId &&
          !s.triggerConditions.isFollowUp &&
          !this.usedScenarios.has(s.scenarioId) &&
          advisorState.skillLevel >=
            s.triggerConditions.advisorSkillLevel.min &&
          advisorState.skillLevel <= s.triggerConditions.advisorSkillLevel.max,
      );

      if (initialScenarios.length === 0) {
        continue;
      }

      for (const scenario of initialScenarios) {
        candidatePairs.push({ character, scenario });
      }
    }

    if (candidatePairs.length === 0) {
      console.log("⚠️ No initial scenarios for any new characters");
      return null;
    }

    let selectedPair: { character: Character; scenario: Scenario };

    if (deterministic) {
      selectedPair = [...candidatePairs].sort((a, b) => {
        const byChar = a.character.characterId.localeCompare(
          b.character.characterId,
        );
        if (byChar !== 0) return byChar;
        return a.scenario.scenarioId.localeCompare(b.scenario.scenarioId);
      })[0];
    } else {
      // BEGINNER DIFFICULTY PROGRESSION
      // For first 5 sessions, strongly prefer easier scenarios (difficulty < 0.5)
      // After that, allow all difficulties with slight preference for easier ones
      const isBeginner = advisorState.totalSessions < 5;
      const isEarlyGame = advisorState.totalSessions < 10;

      // Sort by difficulty (easiest first)
      const sortedPairs = [...candidatePairs].sort(
        (a, b) => a.scenario.difficulty - b.scenario.difficulty,
      );

      if (isBeginner) {
        // First 5 sessions: 80% chance of easiest third, 20% chance of rest
        const easyThreshold = Math.ceil(sortedPairs.length / 3);
        const easyPairs = sortedPairs.slice(0, Math.max(1, easyThreshold));
        const usePairs = Math.random() < 0.8 ? easyPairs : sortedPairs;
        selectedPair = usePairs[Math.floor(Math.random() * usePairs.length)];
      } else if (isEarlyGame) {
        // Sessions 6-10: 60% chance of easier half, 40% chance of rest
        const easyHalf = Math.ceil(sortedPairs.length / 2);
        const easyPairs = sortedPairs.slice(0, Math.max(1, easyHalf));
        const usePairs = Math.random() < 0.6 ? easyPairs : sortedPairs;
        selectedPair = usePairs[Math.floor(Math.random() * usePairs.length)];
      } else {
        // After 10 sessions: completely random, all difficulties fair game
        selectedPair =
          sortedPairs[Math.floor(Math.random() * sortedPairs.length)];
      }
    }

    return selectedPair;
  }

  /**
   * Get a returning character (for follow-up scenarios)
   */
  getReturningCharacter(
    currentSessionNumber: number,
    advisorState: AdvisorState,
  ): { character: Character; scenario: Scenario } | null {
    // Check for ready follow-ups
    const readyFollowUps = this.getReadyFollowUps(currentSessionNumber);

    if (readyFollowUps.length === 0) return null;

    // Pick first ready follow-up
    const followUp = readyFollowUps[0];

    const character = this.characters.get(followUp.characterId);
    const scenario = this.scenarios.get(followUp.scenarioId);

    if (!character || !scenario) return null;

    // Remove from pending queue
    this.removeFollowUp(followUp.scenarioId);

    return { character, scenario };
  }

  /**
   * Mark scenario as used
   */
  markScenarioUsed(scenarioId: string): void {
    this.usedScenarios.add(scenarioId);
  }

  /**
   * Get characters by topic expertise needed
   */
  getCharactersByTopic(topic: FinancialTopic): Character[] {
    const scenarios = Array.from(this.scenarios.values()).filter(
      (s) => s.topic === topic,
    );

    const characterIds = new Set(scenarios.map((s) => s.characterId));

    return Array.from(characterIds)
      .map((id) => this.characters.get(id))
      .filter((char): char is Character => char !== undefined);
  }

  /**
   * Get character relationships for display
   */
  getCharacterRelationships(advisorId?: string): Array<{
    characterId: string;
    name: string;
    trustLevel: number;
    trustTier: TrustTier;
    visitCount: number;
    lastOutcome: "helped" | "struggling" | "pending" | "unknown";
    lastVisit: string | null;
    progressionHistory: RelationshipProgression[];
    decayApplied: number;
    wasRecommended: boolean;
    recentTrend: "improving" | "declining" | "stable";
  }> {
    const relationships: Array<{
      characterId: string;
      name: string;
      trustLevel: number;
      trustTier: TrustTier;
      visitCount: number;
      lastOutcome: "helped" | "struggling" | "pending" | "unknown";
      lastVisit: string | null;
      progressionHistory: RelationshipProgression[];
      decayApplied: number;
      wasRecommended: boolean;
      recentTrend: "improving" | "declining" | "stable";
    }> = [];

    for (const char of this.characters.values()) {
      // Only include characters that have been met
      if (char.relationshipState.visitCount > 0) {
        // Determine last outcome
        let lastOutcome: "helped" | "struggling" | "pending" | "unknown" =
          "unknown";
        const history = char.relationshipState.adviceFollowedHistory;

        if (history.length > 0) {
          const lastAdvice = history[history.length - 1];
          if (lastAdvice.outcome === "positive" && lastAdvice.followed) {
            lastOutcome = "helped";
          } else if (
            lastAdvice.outcome === "negative" ||
            !lastAdvice.followed
          ) {
            lastOutcome = "struggling";
          } else {
            lastOutcome = "pending";
          }
        } else {
          lastOutcome = "pending";
        }

        // Calculate recent trend from last 3 progression events
        let recentTrend: "improving" | "declining" | "stable" = "stable";
        const recentProgression =
          char.relationshipState.progressionHistory.slice(-3);
        if (recentProgression.length >= 2) {
          const totalChange = recentProgression.reduce(
            (sum, p) => sum + p.trustChange,
            0,
          );
          if (totalChange > 0.05) {
            recentTrend = "improving";
          } else if (totalChange < -0.05) {
            recentTrend = "declining";
          }
        }

        relationships.push({
          characterId: char.characterId,
          name: char.name,
          trustLevel: char.relationshipState.trustLevel,
          trustTier: char.relationshipState.trustTier,
          visitCount: char.relationshipState.visitCount,
          lastOutcome,
          lastVisit: char.relationshipState.lastVisit,
          progressionHistory: char.relationshipState.progressionHistory,
          decayApplied: char.relationshipState.decayApplied,
          wasRecommended: char.relationshipState.wasRecommended,
          recentTrend,
        });
      }
    }

    // Sort by trust level (highest first), then visit count
    relationships.sort((a, b) => {
      if (Math.abs(a.trustLevel - b.trustLevel) > 0.01) {
        return b.trustLevel - a.trustLevel;
      }
      return b.visitCount - a.visitCount;
    });

    return relationships;
  }

  /**
   * Update relationship based on advice outcome
   * Returns true if character might recommend you
   */
  updateRelationship(
    characterId: string,
    adviceOutcome: {
      scenarioId: string;
      adviceGiven: string[];
      followed: boolean;
      outcome: "positive" | "negative" | "neutral";
    },
  ): {
    willRecommend: boolean;
    newTrustLevel: number;
    tierChanged: boolean;
    oldTier: TrustTier;
    newTier: TrustTier;
  } {
    const char = this.characters.get(characterId);
    if (!char) {
      return {
        willRecommend: false,
        newTrustLevel: 0,
        tierChanged: false,
        oldTier: "stranger",
        newTier: "stranger",
      };
    }

    const oldTier = char.relationshipState.trustTier;
    let trustChange = 0;

    // Calculate trust level change
    if (adviceOutcome.outcome === "positive" && adviceOutcome.followed) {
      // Good advice followed: +0.1
      trustChange = 0.1;
    } else if (
      adviceOutcome.outcome === "negative" ||
      !adviceOutcome.followed
    ) {
      // Bad advice or not followed: -0.05
      trustChange = -0.05;
    }

    const newTrustLevel = Math.max(
      0,
      Math.min(1, char.relationshipState.trustLevel + trustChange),
    );

    // Update the relationship
    this.updateCharacterRelationship(characterId, {
      trustLevel: newTrustLevel,
      visitCount: char.relationshipState.visitCount + 1,
      adviceFollowed: adviceOutcome,
      progressionEvent: {
        event:
          adviceOutcome.outcome === "positive" && adviceOutcome.followed
            ? "advice_positive"
            : "advice_negative",
        trustChange,
      },
    });

    // Get updated character to check tier change
    const updatedChar = this.characters.get(characterId);
    const newTier = updatedChar?.relationshipState.trustTier || oldTier;
    const tierChanged = oldTier !== newTier;

    // Check if character will recommend (high trust + good outcome)
    const willRecommend =
      newTrustLevel >= 0.6 && // Close or Best Friend tier
      adviceOutcome.outcome === "positive" &&
      adviceOutcome.followed &&
      Math.random() < 0.3; // 30% chance

    return { willRecommend, newTrustLevel, tierChanged, oldTier, newTier };
  }

  /**
   * Handle character recommendation - unlock a new character
   */
  async handleRecommendation(recommendingCharacterId: string): Promise<{
    success: boolean;
    newCharacterName?: string;
    recommendingCharacterName?: string;
  }> {
    const recommendingChar = this.characters.get(recommendingCharacterId);
    if (!recommendingChar) {
      return { success: false };
    }

    // Find a character that hasn't been met yet
    const unmetCharacters = Array.from(this.characters.values()).filter(
      (char) =>
        char.relationshipState.visitCount === 0 &&
        char.characterId !== recommendingCharacterId,
    );

    if (unmetCharacters.length === 0) {
      return { success: false };
    }

    // Randomly select one to "unlock"
    const newChar =
      unmetCharacters[Math.floor(Math.random() * unmetCharacters.length)];

    // Mark character as "recommended" by setting initial trust slightly higher
    const updatedNewChar = { ...newChar };
    updatedNewChar.relationshipState.trustLevel = 0.6; // Start with higher trust (Trusted tier)
    updatedNewChar.relationshipState.trustTier = calculateTrustTier(0.6);
    updatedNewChar.relationshipState.wasRecommended = true;

    // Track this as a recommendation event
    updatedNewChar.relationshipState.progressionHistory.push({
      timestamp: new Date().toISOString(),
      trustLevel: 0.6,
      event: "recommendation",
      trustChange: 0.1, // Bonus from recommendation
    });

    this.characters.set(newChar.characterId, updatedNewChar);

    return {
      success: true,
      newCharacterName: newChar.name,
      recommendingCharacterName: recommendingChar.name,
    };
  }

  /**
   * Apply trust decay for characters ignored too long
   * Returns list of characters who had decay applied
   */
  applyTrustDecay(currentSessionNumber: number): Array<{
    characterId: string;
    name: string;
    decayAmount: number;
    oldTrustLevel: number;
    newTrustLevel: number;
  }> {
    const decayedCharacters: Array<{
      characterId: string;
      name: string;
      decayAmount: number;
      oldTrustLevel: number;
      newTrustLevel: number;
    }> = [];

    for (const char of this.characters.values()) {
      if (char.relationshipState.visitCount === 0) continue;

      // Calculate sessions since last visit
      const lastVisit = char.relationshipState.lastVisit;
      if (!lastVisit) continue;

      // For simplicity, use session count difference
      // In a real implementation, you'd track session numbers per character
      const sessionsSinceVisit =
        currentSessionNumber - char.relationshipState.visitCount;

      if (sessionsSinceVisit > 10) {
        // Apply decay: -0.02 per session over 10
        const decayAmount = (sessionsSinceVisit - 10) * 0.02;
        const oldTrustLevel = char.relationshipState.trustLevel;
        const newTrustLevel = Math.max(0, oldTrustLevel - decayAmount);

        if (decayAmount > 0) {
          this.updateCharacterRelationship(char.characterId, {
            trustLevel: newTrustLevel,
            progressionEvent: {
              event: "decay",
              trustChange: -decayAmount,
            },
          });

          // Update decay tracker
          const updatedChar = this.characters.get(char.characterId);
          if (updatedChar) {
            updatedChar.relationshipState.decayApplied += decayAmount;
            this.characters.set(char.characterId, updatedChar);
          }

          decayedCharacters.push({
            characterId: char.characterId,
            name: char.name,
            decayAmount,
            oldTrustLevel,
            newTrustLevel,
          });
        }
      }
    }

    return decayedCharacters;
  }

  /**
   * Get statistics about the character pool
   */
  getPoolStats(): {
    totalCharacters: number;
    totalScenarios: number;
    usedScenarios: number;
    pendingFollowUps: number;
    charactersMetCount: number;
  } {
    const charactersMetCount = Array.from(this.characters.values()).filter(
      (char) => char.relationshipState.visitCount > 0,
    ).length;

    return {
      totalCharacters: this.characters.size,
      totalScenarios: this.scenarios.size,
      usedScenarios: this.usedScenarios.size,
      pendingFollowUps: this.pendingFollowUps.length,
      charactersMetCount,
    };
  }

  /**
   * Reset pool state (for testing)
   */
  reset(): void {
    this.usedScenarios.clear();
    this.pendingFollowUps = [];

    // Reset all character relationship states
    for (const [id, char] of this.characters.entries()) {
      this.characters.set(id, {
        ...char,
        relationshipState: {
          trustLevel: 0.5,
          trustTier: "trusted",
          visitCount: 0,
          lastVisit: null,
          adviceFollowedHistory: [],
          progressionHistory: [],
          hasReceivedVoiceMessage: false,
          currentScenarioNumber: 0,
          decayApplied: 0,
          wasRecommended: false,
        },
        conversationHistory: [],
        advisorNotes: "",
      });
    }
  }
}

// Export singleton instance
export const characterPool = new CharacterPoolManager();
