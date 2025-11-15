import { useState } from "react";
import { ChatMessage } from "./components/ChatMessage";
import { PlayerStats } from "./components/PlayerStats";
import { MessageInput } from "./components/MessageInput";
import type { PlayerState, GameResponse } from "./types";

function App() {
  const [playerId] = useState(() => `player-${Date.now()}`);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "agent"; content: string; scenario?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize game on first render
  useState(() => {
    const initGame = async () => {
      try {
        const response = await fetch("/game/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
        const data = await response.json();
        setPlayerState(data.playerState);

        // Welcome message
        setMessages([
          {
            role: "agent",
            content:
              "Tervetuloa Elämäpeli 2025:een! Olet juuri täyttänyt 18 vuotta ja saanut ensimmäisen pankkikorttisi. Seuraavat 10 vuotta muokkaavat taloudellista tulevaisuuttasi. Mitä teet ensiksi? 💰",
          },
        ]);
      } catch (error) {
        console.error("Failed to start game:", error);
      }
    };
    initGame();
  });

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const response = await fetch("/game/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          message,
          playerState,
        }),
      });

      const data: GameResponse = await response.json();

      // Add agent response
      setMessages((prev) => [
        ...prev,
        ...data.messages.map((msg) => ({
          role: "agent" as const,
          content: msg,
          scenario: data.scenarioType,
        })),
      ]);

      // Update player state
      setPlayerState(data.playerState);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: "Virhe: Viestin lähetys epäonnistui. Yritä uudelleen.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Elämäpeli 2025 🎮
            </h1>
            {playerState && (
              <div className="text-sm text-gray-600">
                Kuukausi {playerState.currentMonth} / 120
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Player Stats Sidebar */}
          <div className="lg:col-span-1">
            {playerState && <PlayerStats playerState={playerState} />}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    scenario={msg.scenario}
                  />
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span>Kirjoittaa...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <MessageInput onSend={sendMessage} disabled={isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
