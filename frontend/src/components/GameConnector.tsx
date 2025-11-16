/**
 * GameConnector - Wrapper Component
 *
 * Connects the Figma-generated WhatsAppInterface to the real game backend
 * This keeps the Figma component untouched to avoid merge conflicts
 */

import { useState, useEffect } from "react";
import { WhatsAppInterface, type Message } from "./WhatsAppInterface";
import { useGame } from "../hooks/useGame";
import { Button } from "./ui/button";
import { RotateCcw } from "lucide-react";

// Inferred Contact type from WhatsAppInterface
interface Contact {
  id: string;
  characterId?: string;
  name: string;
  avatar: string;
  avatarImage?: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTime: Date;
  unreadCount: number;
  online: boolean;
  gender?: string;
  trust?: number;
}

export function GameConnector() {
  const game = useGame();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [allMessages, setAllMessages] = useState<{ [key: string]: Message[] }>(
    {},
  );
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [showResetButton, setShowResetButton] = useState(false);

  // Initialize game - start first consultation when ready
  useEffect(() => {
    if (game.advisorState && !game.advisorState.hasCompletedOnboarding) {
      console.log("🎮 Starting first consultation...");
      game.startConsultation();
    }
  }, [game.advisorState?.hasCompletedOnboarding]);

  // Map backend threads to frontend contacts
  useEffect(() => {
    if (!game.advisorState) return;

    const threads = Object.values(game.advisorState.activeThreads || {});

    const mappedContacts: Contact[] = threads.map((thread: any) => {
      // Get the last message from conversation history for this thread
      const threadMessages = allMessages[thread.threadId] || [];
      const lastMsg = threadMessages[threadMessages.length - 1];

      return {
        id: thread.threadId,
        characterId: thread.characterId,
        name: thread.characterName || "Client",
        avatar: (thread.characterName || "CL").substring(0, 2).toUpperCase(),
        avatarImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.characterId}`,
        lastMessage: lastMsg?.content || "New consultation",
        timestamp: new Date(thread.lastMessageAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        lastMessageTime: new Date(thread.lastMessageAt),
        unreadCount: thread.status === "awaiting_response" ? 1 : 0,
        online: thread.status === "active",
        trust: 50, // Could be calculated from relationship data
      };
    });

    setContacts(mappedContacts);

    // Auto-select first thread if none selected
    if (mappedContacts.length > 0 && !selectedContactId) {
      setSelectedContactId(mappedContacts[0].id);
    }
  }, [game.advisorState?.activeThreads, allMessages]);

  // Handle new messages from backend
  useEffect(() => {
    if (!game.lastResponse) return;

    const response = game.lastResponse;

    // Handle onboarding message (boss introduction)
    if (response.type === "onboarding" && response.onboardingMessage) {
      console.log("👔 Boss onboarding:", response.onboardingMessage);
      // Could show a modal or special UI here
      return;
    }

    // Handle character messages
    if (
      response.threadId &&
      response.messages &&
      response.messages.length > 0
    ) {
      const threadId = response.threadId;

      // Add character messages to conversation
      const newMessages: Message[] = response.messages.map((content, idx) => ({
        id: `${threadId}-char-${Date.now()}-${idx}`,
        contactId: threadId,
        role: "contact" as const,
        content,
        timestamp: new Date(),
      }));

      setAllMessages((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), ...newMessages],
      }));

      // Update conversation history for backend
      const newHistory: Array<{ role: "user" | "assistant"; content: string }> =
        response.messages.map((msg) => ({
          role: "assistant" as const,
          content: msg,
        }));
      setConversationHistory((prev) => [...prev, ...newHistory]);

      // Auto-select this thread
      setSelectedContactId(threadId);
    }
  }, [game.lastResponse]);

  // Handle sending a message
  const handleSendMessage = (threadId: string, content: string) => {
    if (!game.advisorState) {
      console.error("Cannot send message: game not initialized");
      return;
    }

    // Add user message to UI immediately (optimistic update)
    const userMessage: Message = {
      id: `${threadId}-user-${Date.now()}`,
      contactId: threadId,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setAllMessages((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), userMessage],
    }));

    // Update conversation history
    const newHistoryEntry = { role: "user" as const, content };
    const updatedHistory = [...conversationHistory, newHistoryEntry];
    setConversationHistory(updatedHistory);

    // Send to backend
    console.log("📤 Sending message to backend:", content);
    game.sendMessage(threadId, content);
  };

  // Show reset button after 10 seconds of loading
  useEffect(() => {
    if (game.isLoading) {
      const timer = setTimeout(() => {
        setShowResetButton(true);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    } else {
      setShowResetButton(false);
    }
  }, [game.isLoading]);

  // Loading state
  if (game.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game session...</p>
          {showResetButton && (
            <div className="mt-6 space-y-3">
              <p className="text-muted-foreground text-sm">
                Taking longer than expected?
              </p>
              <Button
                onClick={() => {
                  console.log("🔄 User triggered game data reset from loading screen");
                  localStorage.clear();
                  window.location.reload();
                }}
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Game Data
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (game.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Connection Error
          </h2>
          <p className="text-muted-foreground mb-4">
            Failed to connect to game server. Make sure the backend is running
            on port 4111.
          </p>
          <code className="text-sm bg-muted p-2 rounded block">
            cd puppet-master && pnpm dev:api
          </code>
        </div>
      </div>
    );
  }

  return (
    <WhatsAppInterfaceWrapper
      contacts={contacts}
      selectedContactId={selectedContactId}
      allMessages={allMessages}
      onSendMessage={handleSendMessage}
      onSelectContact={setSelectedContactId}
      isSending={game.isSending}
      advisorState={game.advisorState}
    />
  );
}

// Internal wrapper that adapts our data to WhatsAppInterface's internal state management
function WhatsAppInterfaceWrapper({
  contacts,
  selectedContactId,
  allMessages,
  onSendMessage,
  onSelectContact,
  isSending,
  advisorState,
}: {
  contacts: Contact[];
  selectedContactId: string | null;
  allMessages: { [key: string]: Message[] };
  onSendMessage: (threadId: string, content: string) => void;
  onSelectContact: (id: string) => void;
  isSending: boolean;
  advisorState: any;
}) {
  // Since WhatsAppInterface manages its own state, we need to pass data through
  // a mechanism it understands. For now, we'll render it and let it use its internal state,
  // but we'll need to modify it slightly to accept external data.

  // Actually, looking at WhatsAppInterface, it has its own internal state management.
  // The cleanest approach is to create our own simplified chat UI or
  // to provide a modified version. Let me create a simple connector UI for now.

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold">💰 BROKE No More!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Advisor Coins: {advisorState?.advisorCoins || 0} • Level:{" "}
            {advisorState?.skillLevel || 1}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No active consultations</p>
              <p className="text-sm mt-2">Waiting for clients...</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => onSelectContact(contact.id)}
                className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedContactId === contact.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{contact.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {contact.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.lastMessage}
                    </p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {contact.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContactId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">
                {contacts.find((c) => c.id === selectedContactId)?.name ||
                  "Client"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Financial Advisor Consultation
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(allMessages[selectedContactId] || []).map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"></div>
                      <div
                        className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem(
                    "message",
                  ) as HTMLInputElement;
                  if (input.value.trim() && selectedContactId) {
                    onSendMessage(selectedContactId, input.value.trim());
                    input.value = "";
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="message"
                  type="text"
                  placeholder="Type your financial advice..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
