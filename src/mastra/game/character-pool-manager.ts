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
} from "../types/game-types.ts";

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
        this.characters.set(char.characterId, char);
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
    } catch (error) {
      console.error("❌ Error loading character/scenario files:", error);
      throw error;
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
    },
  ): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    const updatedChar = { ...char };

    if (updates.trustLevel !== undefined) {
      updatedChar.relationshipState.trustLevel = Math.max(
        0,
        Math.min(1, updates.trustLevel),
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

    updatedChar.relationshipState.lastVisit = new Date().toISOString();

    this.characters.set(characterId, updatedChar);
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

    // Pick a random new character
    const randomCharIndex = Math.floor(Math.random() * newCharacters.length);
    const selectedCharacter = newCharacters[randomCharIndex];

    // Find initial scenario for this character
    const initialScenarios = Array.from(this.scenarios.values()).filter(
      (s) =>
        s.characterId === selectedCharacter.characterId &&
        !s.triggerConditions.isFollowUp &&
        !this.usedScenarios.has(s.scenarioId) &&
        advisorState.skillLevel >= s.triggerConditions.advisorSkillLevel.min &&
        advisorState.skillLevel <= s.triggerConditions.advisorSkillLevel.max,
    );

    if (initialScenarios.length === 0) {
      console.log(
        `⚠️ No initial scenarios for character ${selectedCharacter.characterId}`,
      );
      return null;
    }

    // Pick first available initial scenario
    const selectedScenario = initialScenarios[0];

    return {
      character: selectedCharacter,
      scenario: selectedScenario,
    };
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
          visitCount: 0,
          lastVisit: null,
          adviceFollowedHistory: [],
        },
      });
    }
  }
}

// Export singleton instance
export const characterPool = new CharacterPoolManager();
