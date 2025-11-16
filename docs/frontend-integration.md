# Frontend Integration Guide

## Overview

This guide explains how to integrate the React frontend with the Mastra backend and the architectural decisions behind the current implementation.

## Project Structure

This is a **monorepo** containing:
- **Backend** (root): Mastra-based game orchestrator and API
- **Frontend** (`frontend/`): React + Vite WhatsApp-style UI

### Directory Structure

```
junction-2025/
├── frontend/                 # Frontend (consolidated, no .git)
├── src/                      # Backend source
├── public/                   # Static assets & frontend build output
└── pnpm-workspace.yaml       # Monorepo config
```

### Configuration Updates

1. **pnpm Workspace**: `pnpm-workspace.yaml` manages frontend as workspace package
2. **Package Scripts**: Frontend commands in root `package.json`
3. **Vite Config**: Updated paths in `frontend/vite.config.ts`
4. **Build Output**: Frontend builds to `../public` for backend to serve
5. **Git**: Frontend tracked by parent repo (no separate `.git`)

## Quick Start

### 1. Start the Backend

```bash
cd junction-2025
pnpm install
pnpm dev:api  # Starts server on port 4111
```

### 2. Start the Frontend

```bash
# From root directory
pnpm dev:frontend  # Starts on port 3000, proxies /api to backend

# Or run both:
pnpm dev  # Runs backend + frontend
```

## State Management Architecture

### Server-First Approach

**IMPORTANT:** The server is the **single source of truth** for all game data.

### Before (Broken)

```
Server → useState → localStorage → useEffect → useState → ... → UI
         ↓                          ↓
    Out of sync!              Race conditions!
```

### After (Fixed)

```
Server → TanStack Query → useMemo → UI
         (cache)          (derive)

User Action → Optimistic Update → Server → Cache Update → UI
```

### Core Hooks

#### 1. `useGameState.ts` - Server State Hook

**Single source of truth for all game data**

```typescript
const game = useGameState();
// ✅ advisorState - from server
// ✅ threadHistories - from server
// ✅ characterInfo - from server
// ✅ Optimistic updates with automatic rollback
// ❌ No localStorage
// ❌ No client-side state duplication
```

**Features:**
- TanStack Query for data fetching/caching
- Optimistic updates for messages (instant UI, rollback on error)
- Automatic cache invalidation
- Built-in loading/error states

#### 2. `useDerivedUIState.ts` - Pure Computation

**Derives UI data on-the-fly from server state**

```typescript
const { contacts, messagesByThread } = useDerivedUIState(
  game.advisorState,
  game.threadHistories,
  game.characterInfo,
);
// ✅ Computed in real-time
// ✅ Always in sync with server
// ❌ No storage
// ❌ No manual synchronization
```

**Features:**
- Memoized computations (React.useMemo)
- Converts server format to UI format
- No state storage - just pure functions

#### 3. `useGameSession()` - Session Management (Legacy)

Initialize and manage the game session:

```tsx
import { useGameSession } from "./hooks/useGameSession";

function MyComponent() {
  const {
    sessionId,          // Current session UUID
    advisorState,       // Current game state
    isLoading,          // Initial load state
    startConsultation,  // Start new consultation
    isStarting,         // Starting state
    updateAdvisorState, // Manual state update
  } = useGameSession();

  // Auto-starts session on mount
  // Session ID stored in localStorage
}
```

#### 4. `useSendMessage()` - Send Messages

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

## Integration Patterns

### Pattern 1: Wrapper Component (Recommended)

Create a wrapper that adapts backend data to UI component props:

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
      lastMessage: "...",
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

### Pattern 2: Server-First State (Current)

Using the new `useGameState` hook for server-first state management:

```tsx
import { useGameState, useDerivedUIState } from "./hooks";

function WhatsAppInterface() {
  const game = useGameState();
  const { contacts, messagesByThread } = useDerivedUIState(
    game.advisorState,
    game.threadHistories,
    game.characterInfo,
  );

  // UI-only state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Send message with optimistic update
  const handleSend = (message: string) => {
    game.sendMessage.mutate({
      threadId: selectedContactId!,
      message,
      advisorState: game.advisorState!,
    });
  };

  return (
    <div>
      <ContactList
        contacts={contacts}
        selectedId={selectedContactId}
        onSelect={setSelectedContactId}
      />
      <ChatWindow
        messages={messagesByThread[selectedContactId]}
        onSend={handleSend}
        isLoading={game.sendMessage.isPending}
      />
    </div>
  );
}
```

## Data Flow

### Complete Flow

```
1. Frontend loads → getOrCreateSessionId() from localStorage
2. useGameState() → POST /api/game/init → Returns advisorState
3. User action → startConsultation() → POST /api/game/start-consultation
4. Backend → Sends character with scenario → GameResponse
5. User sends message → sendMessage() → POST /api/game/send-message
6. Backend processes → Returns character response → GameResponse
7. Frontend updates state → advisorState updated in cache
```

### Reload Resilience

What happens on reload:

1. ✅ Fetch session from `/api/game/init`
2. ✅ Server returns: advisorState, threadHistories, characterInfo
3. ✅ UI derives contacts and messages from server data
4. ✅ Everything just works™

### What's Persisted

- ✅ All game state (server-side)
- ✅ Thread histories (server-side)
- ✅ Character info (server-side)
- ✅ Session ID (sessionStorage only)

### What's NOT Persisted

- ❌ UI state (selectedContactId, showChat)
- ❌ Temporary advice choices
- ❌ Conversation end data (shown once)

## Key Types

### `AdvisorState`

The main game state object:

```typescript
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

```typescript
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

## API Endpoints

All proxied via Vite to backend (http://localhost:4111):

- `POST /api/game/init` - Initialize/load session
- `POST /api/game/start-consultation` - Get new character/scenario
- `POST /api/game/send-message` - Send advisor message to character
- `GET /api/game/session/:sessionId` - Check session status

## Session Management

Sessions are automatically managed:

- UUID generated on first visit
- Stored in `localStorage` as `elamapeli_session_id`
- Persists across page reloads

To reset: `localStorage.clear()` or use `clearSession()` from `sessionManager`.

## Component Architecture

### WhatsAppInterface Simplification

**From 733 lines to ~200 lines!**

**Removed:**
- ❌ `useState` for messages, contacts, characterInfo
- ❌ `convertMessagesToThreadHistories` helper
- ❌ Complex useEffect chains syncing states
- ❌ localStorage reads/writes
- ❌ Manual state updates on responses

**Kept:**
- ✅ UI-only state (selectedContactId, showChat)
- ✅ Temporary state for advice choices (not persisted)
- ✅ Response handling (simpler, mutation-based)

## Minimal Integration Example

```tsx
import { useGameState, useDerivedUIState } from "./hooks";
import { useEffect, useState } from "react";

function Game() {
  const game = useGameState();
  const { contacts, messagesByThread } = useDerivedUIState(
    game.advisorState,
    game.threadHistories,
    game.characterInfo,
  );
  const [currentThread, setCurrentThread] = useState<string | null>(null);

  // Start first consultation on load
  useEffect(() => {
    if (game.advisorState && !game.advisorState.hasCompletedOnboarding) {
      game.startConsultation.mutate(game.advisorState);
    }
  }, [game.advisorState]);

  const handleSend = (message: string) => {
    if (!currentThread || !game.advisorState) return;

    game.sendMessage.mutate({
      threadId: currentThread,
      message,
      advisorState: game.advisorState,
    });
  };

  if (game.isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Advisor Coins: {game.advisorState?.advisorCoins || 0}</h1>
      {messagesByThread[currentThread]?.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      <input
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleSend(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        placeholder="Type your advice..."
        disabled={game.sendMessage.isPending}
      />
    </div>
  );
}
```

## Benefits of Server-First Approach

### 1. Reload Resilience
- No more "character names lost on reload"
- No more state inconsistencies
- Server always has the latest state

### 2. Optimistic Updates
- Messages appear instantly
- Automatic rollback on errors
- Better UX

### 3. Simplified Code
- ~60% less code in WhatsAppInterface
- No manual state synchronization
- Easier to reason about

### 4. Type Safety
- Shared types in `/types/ui.ts`
- Consistent interfaces across components
- Ready for server/client type sharing

## Keeping UI Components Pure

### DO

✅ Create wrapper components around UI components
✅ Use hooks in parent components
✅ Pass data down as props
✅ Keep UI components pure

### DON'T

❌ Modify `components/ui/*` files directly (if from Figma)
❌ Add hooks inside UI components (keep them dumb)
❌ Change prop interfaces of external components

## Troubleshooting

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
- Or use `game.sendMessage.isPending` from TanStack Query

## Files Overview

### New Files
- `src/hooks/useGameState.ts` - Server state management
- `src/hooks/useDerivedUIState.ts` - UI derivation
- `src/types/ui.ts` - Shared types

### Modified Files
- `src/components/WhatsAppInterface.tsx` - Simplified (now uses server-first state)

### Legacy Files (can be removed)
- `src/hooks/useGameSession.ts` - Old session management
- `src/hooks/useGame.ts` - Old game hook

## Next Steps

1. Map `activeThreads` to `Contact[]` for sidebar
2. Convert `GameResponse.messages` to chat bubbles
3. Handle onboarding flow (boss introduction)
4. Display advisor stats (coins, reputation, skill)
5. Add trust meter integration
6. Handle voice messages (if needed)
7. Remove old hooks after migration complete
8. Share types between backend and frontend

## Additional Resources

- [Mastra Documentation](https://mastra.ai/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Vite Documentation](https://vitejs.dev/)
