# Frontend-Backend Integration Guide

This guide explains how to connect the React frontend with the Mastra backend.

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd puppet-master
pnpm install
pnpm dev:api  # Starts server on port 4111
```

### 2. Start the Frontend

```bash
cd Aichatinterface
pnpm install
pnpm dev  # Starts on port 3000, proxies /api to backend
```

## 📡 Available Hooks

### `useGameSession()` - Session Management

Initialize and manage the game session:

```tsx
import { useGameSession } from "./hooks/useGameSession";

function MyComponent() {
  const {
    sessionId, // Current session UUID
    advisorState, // Current game state
    isLoading, // Initial load state
    startConsultation, // Start new consultation
    isStarting, // Starting state
    updateAdvisorState, // Manual state update
  } = useGameSession();

  // Auto-starts session on mount
  // Session ID stored in localStorage
}
```

### `useSendMessage()` - Send Messages

Send messages in active conversations:

```tsx
import { useSendMessage } from "./hooks/useSendMessage";

function ChatComponent() {
  const { sendMessage, isSending, data, error } = useSendMessage();
  const { advisorState } = useGameSession();

  const handleSend = (threadId: string, message: string) => {
    sendMessage({
      threadId,
      message,
      advisorState: advisorState!,
      conversationHistory: [], // Optional
    });
  };

  return (
    <div>
      {isSending && <div>Sending...</div>}
      {data && <div>Response: {data.messages?.[0]}</div>}
    </div>
  );
}
```

## 🔄 Integration Pattern

### Pattern 1: Wrapper Component (Recommended for Figma)

Create a wrapper that adapts backend data to Figma component props:

```tsx
// components/GameWhatsAppConnector.tsx
import { WhatsAppInterface } from "./WhatsAppInterface";
import { useGameSession, useSendMessage } from "../hooks";

export function GameWhatsAppConnector() {
  const { advisorState, isLoading } = useGameSession();
  const { sendMessage, isSending } = useSendMessage();

  if (isLoading) return <div>Loading...</div>;

  // Map backend threads to frontend contacts
  const contacts = Object.values(advisorState?.activeThreads || {}).map(
    (thread) => ({
      id: thread.threadId,
      name: thread.characterName || "Unknown",
      lastMessage: "...", // Get from messages
      timestamp: new Date(thread.lastMessageAt).toLocaleTimeString(),
      unreadCount: 0,
      online: true,
    }),
  );

  return (
    <WhatsAppInterface
      initialContacts={contacts}
      onSendMessage={(threadId, message) => {
        sendMessage({
          threadId,
          message,
          advisorState: advisorState!,
        });
      }}
      isTyping={isSending}
    />
  );
}
```

### Pattern 2: Direct Integration

Modify WhatsAppInterface directly (⚠️ Will cause Figma conflicts):

```tsx
// In WhatsAppInterface.tsx
import { useGameSession, useSendMessage } from "../hooks";

export function WhatsAppInterface() {
  const { advisorState, startConsultation } = useGameSession();
  const { sendMessage, isSending } = useSendMessage();

  useEffect(() => {
    if (advisorState && !advisorState.hasCompletedOnboarding) {
      startConsultation(advisorState);
    }
  }, [advisorState]);

  // Rest of component...
}
```

## 📦 Data Flow

```
1. Frontend loads → getOrCreateSessionId() from localStorage
2. useGameSession() → POST /api/game/init → Returns advisorState
3. User action → startConsultation() → POST /api/game/start-consultation
4. Backend → Sends character with scenario → GameResponse
5. User sends message → sendMessage() → POST /api/game/send-message
6. Backend processes → Returns character response → GameResponse
7. Frontend updates state → advisorState updated in cache
```

## 🔑 Key Types

### `AdvisorState`

The main game state object:

```ts
{
  advisorId: string;
  reputation: number;        // 0-100
  skillLevel: number;        // 0-10
  totalSessions: number;
  activeThreads: {
    [threadId: string]: {
      threadId: string;
      characterId: string;
      scenarioId: string;
      status: "active" | "awaiting_response" | "resolved";
      createdAt: string;
      lastMessageAt: string;
    }
  };
  advisorCoins: number;
  careerTier: number;        // 1-5
  // ... more fields
}
```

### `GameResponse`

Response from backend actions:

```ts
{
  type: "character_message" | "god_boss_review" | "onboarding" | ...;
  threadId?: string;
  messages?: string[];       // Character's messages
  isNewThread?: boolean;
  characterInfo?: {
    name: string;
    age: number;
    occupation: string;
  };
  stateUpdate: AdvisorState; // Always present - new state
  activeThreads?: ConversationThread[];
}
```

## 🎯 Minimal Integration Example

Here's the absolute minimum code to integrate:

```tsx
// App.tsx or WhatsAppInterface.tsx
import { useGameSession, useSendMessage } from "./hooks";
import { useEffect, useState } from "react";

function Game() {
  const { advisorState, startConsultation, isLoading } = useGameSession();
  const { sendMessage, isSending, data } = useSendMessage();
  const [currentThread, setCurrentThread] = useState<string | null>(null);

  // Start first consultation on load
  useEffect(() => {
    if (advisorState && !advisorState.hasCompletedOnboarding) {
      startConsultation(advisorState);
    }
  }, [advisorState]);

  // Handle new character
  useEffect(() => {
    if (data?.threadId) {
      setCurrentThread(data.threadId);
    }
  }, [data]);

  const handleSend = (message: string) => {
    if (!currentThread || !advisorState) return;

    sendMessage({
      threadId: currentThread,
      message,
      advisorState,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Advisor Coins: {advisorState?.advisorCoins || 0}</h1>
      {data?.messages?.map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
      <input
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleSend(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        placeholder="Type your advice..."
        disabled={isSending}
      />
      {isSending && <div>Character is typing...</div>}
    </div>
  );
}
```

## 🔧 API Endpoints

All proxied via Vite to backend (http://localhost:4111):

- `POST /api/game/init` - Initialize/load session
- `POST /api/game/start-consultation` - Get new character/scenario
- `POST /api/game/send-message` - Send advisor message to character
- `GET /api/game/session/:sessionId` - Check session status

## 💾 Session Management

Sessions are automatically managed:

- UUID generated on first visit
- Stored in `localStorage` as `elamapeli_session_id`
- Persists across page reloads

To reset: `localStorage.clear()` or use `clearSession()` from `sessionManager`.

## 🎨 Keeping Figma Compatibility

**DO:**

- Create wrapper components around Figma components
- Use hooks in parent components
- Pass data down as props
- Keep UI components pure

**DON'T:**

- Modify `components/ui/*` files directly
- Add hooks inside Figma-generated components
- Change prop interfaces of Figma components

## 🐛 Troubleshooting

### "Failed to fetch"

- Check backend is running: `pnpm dev:api`
- Check network tab - requests should go to `/api/game/*`
- Verify Vite proxy in `vite.config.ts`

### "TypeError: Cannot read property 'activeThreads'"

- advisorState is still loading
- Add loading checks: `if (!advisorState) return null;`

### "Session not found"

- Backend restarted (in-memory sessions lost)
- Clear localStorage and reload

### Typing indicator not showing

- Use `isSending` from `useSendMessage` hook
- Set a state variable when mutation is pending

## 📚 Next Steps

1. Map `activeThreads` to `Contact[]` for sidebar
2. Convert `GameResponse.messages` to chat bubbles
3. Handle onboarding flow (boss introduction)
4. Display advisor stats (coins, reputation, skill)
5. Add trust meter integration
6. Handle voice messages (if needed)

## Example: Complete Integration

See `examples/GameIntegrationExample.tsx` for a full working example.
