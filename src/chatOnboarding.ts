export interface ChatInputOnboardingContext {
  hasUserMessages: boolean;
  isInputActive: boolean;
}

export function shouldShowChatInputTip({
  hasUserMessages,
  isInputActive,
}: ChatInputOnboardingContext): boolean {
  return !hasUserMessages && !isInputActive;
}

