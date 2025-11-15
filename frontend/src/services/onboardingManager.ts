/**
 * Onboarding State Manager
 *
 * Manages onboarding completion state in localStorage
 * Allows skipping intro screens for returning users
 */

const ONBOARDING_KEY = "elamapeli_onboarding_complete";
const PLAYER_NAME_KEY = "elamapeli_player_name";
const PLAYER_GENDER_KEY = "elamapeli_player_gender";

export interface OnboardingState {
  completed: boolean;
  playerName?: string;
  playerGender?: string;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
  console.log("✅ Onboarding marked as complete");
}

/**
 * Get player name from localStorage
 */
export function getPlayerName(): string | null {
  return localStorage.getItem(PLAYER_NAME_KEY);
}

/**
 * Save player name to localStorage
 */
export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
  console.log("💾 Player name saved:", name);
}

/**
 * Get player gender from localStorage
 */
export function getPlayerGender(): string | null {
  return localStorage.getItem(PLAYER_GENDER_KEY);
}

/**
 * Save player gender to localStorage
 */
export function setPlayerGender(gender: string): void {
  localStorage.setItem(PLAYER_GENDER_KEY, gender);
  console.log("💾 Player gender saved:", gender);
}

/**
 * Get all onboarding state
 */
export function getOnboardingState(): OnboardingState {
  return {
    completed: hasCompletedOnboarding(),
    playerName: getPlayerName() || undefined,
    playerGender: getPlayerGender() || undefined,
  };
}

/**
 * Save all onboarding state at once
 */
export function saveOnboardingState(state: Partial<OnboardingState>): void {
  if (state.completed !== undefined) {
    if (state.completed) {
      completeOnboarding();
    } else {
      localStorage.removeItem(ONBOARDING_KEY);
    }
  }

  if (state.playerName) {
    setPlayerName(state.playerName);
  }

  if (state.playerGender) {
    setPlayerGender(state.playerGender);
  }
}

/**
 * Clear all onboarding data (for testing/reset)
 */
export function clearOnboardingData(): void {
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
  localStorage.removeItem(PLAYER_GENDER_KEY);
  console.log("🗑️ Onboarding data cleared");
}
