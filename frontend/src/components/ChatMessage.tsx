interface ChatMessageProps {
  role: "user" | "agent";
  content: string;
  scenario?: string;
}

export function ChatMessage({ role, content, scenario }: ChatMessageProps) {
  const isUser = role === "user";

  const scenarioEmoji: Record<string, string> = {
    crypto_scam: "⚠️",
    peer_pressure_purchase: "🛍️",
    parent_finds_debt: "👨‍👩‍👧",
    friend_asks_loan: "💸",
    first_paycheck: "💰",
    savings_opportunity: "🏦",
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900 border border-gray-200"
        }`}
      >
        {!isUser && scenario && (
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            {scenarioEmoji[scenario] || "💭"}{" "}
            {scenario.replace(/_/g, " ").toUpperCase()}
          </div>
        )}
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
