import { shouldShowChatInputTip } from "./chatOnboarding";

describe("shouldShowChatInputTip", () => {
  it("shows tip when no user messages and input is not active", () => {
    expect(
      shouldShowChatInputTip({
        hasUserMessages: false,
        isInputActive: false,
      }),
    ).toBe(true);
  });

  it("hides tip when user has sent messages", () => {
    expect(
      shouldShowChatInputTip({
        hasUserMessages: true,
        isInputActive: false,
      }),
    ).toBe(false);
  });

  it("hides tip when input is active", () => {
    expect(
      shouldShowChatInputTip({
        hasUserMessages: false,
        isInputActive: true,
      }),
    ).toBe(false);
  });
});

