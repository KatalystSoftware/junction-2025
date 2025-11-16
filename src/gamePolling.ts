export interface PollingState {
  lastCheckAt: number | null;
  isActive: boolean;
}

export function shouldPollForUpdates(
  state: PollingState,
  now: number,
  intervalMs = 10000,
): boolean {
  if (!state.isActive) return false;
  if (state.lastCheckAt === null) return true;
  return now - state.lastCheckAt >= intervalMs;
}

