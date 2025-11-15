# Error Recovery System

## Overview

The error recovery system ensures that AI failures never crash the game. It implements:

1. **Retry logic with exponential backoff** (agent calls: 2 retries, RAG: 3 retries)
2. **Graceful fallback messages** when all retries fail
3. **Progress preservation** - game state is never lost on error
4. **Comprehensive error logging** for debugging

## Architecture

### Retry Layer Architecture

The system uses a two-layer approach to avoid double retries:

```
┌─────────────────────────────────────────────────┐
│ Orchestrator Layer                              │
│ - Calls tool.execute()                          │
│ - Handles fallbacks on error                    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ Tool Layer (invoke-character-tool, etc.)        │
│ - Calls cachedGenerate()                        │
│ - Has fallback error handling                   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ Agent Execution Layer (agent-execution.ts)      │
│ - runAgentOperation wraps with:                 │
│   * Concurrency limiting                        │
│   * Retry logic (2 retries, exp backoff)        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ Agent Layer                                      │
│ - agent.generate() makes AI call                │
└─────────────────────────────────────────────────┘
```

### Core Components

#### 1. Agent Execution (`src/mastra/agent-execution.ts`)

Primary retry logic for all agent calls:
- `runAgentOperation()` - Wraps agent calls with concurrency limiting + retry
- `runWithRetry()` - Exponential backoff retry (2 retries, 250ms base delay)
- `defaultIsRetryable()` - Classifies errors (rate limits, network, server errors)
- `ConcurrencyLimiter` - Limits concurrent agent calls (default: 5)

#### 2. Error Recovery Utilities (`src/mastra/utils/error-recovery.ts`)

Complementary utilities for special cases:
- `withRetry()` - For non-agent operations (RAG queries, etc.)
- `getUserFriendlyError()` - Converts technical errors to user-friendly messages
- Error logging functions for debugging
- Used by: query-finnish-knowledge-tool for embed() and vectorStore.query()

#### 3. Protected Components

All AI operations are protected with retry + fallback:

- **Game Master Agent** - Character selection and game flow
- **Character Agents** - Character responses and interactions
- **Evaluator Agent** - Advice quality evaluation
- **God/Boss Agent** - Performance reviews
- **Finnish Knowledge Tool** - RAG queries (uses custom withRetry)

### How It Works

#### Retry Logic for Agent Calls

All agent calls go through `cachedGenerate` which uses `runAgentOperation`:

```typescript
// In agent-execution.ts
export function runAgentOperation<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  return defaultAgentLimiter.run(() => runWithRetry(fn, options));
}
```

**Retry sequence (2 retries, exponential backoff):**
1. First attempt fails → wait 250ms → retry
2. Second attempt fails → wait 500ms → retry
3. Third attempt fails → throw error (caught by tool/orchestrator)

#### Retry Logic for RAG Queries

RAG operations use custom `withRetry` from error-recovery.ts:

```typescript
const { embedding } = await withRetry(
  () => embed({ value: query, model }),
  "Embedding Generation",
  {
    maxAttempts: 3,
    shouldRetry: isRetryableError,
  }
);
```

**Retry sequence (3 retries, configurable backoff):**
1. First attempt fails → wait 1s → retry
2. Second attempt fails → wait 2s → retry
3. Third attempt fails → throw error or use fallback

#### Error Classification

Errors are classified as retryable or not:

**Retryable:**
- Network errors (ECONNRESET, ETIMEDOUT)
- Rate limits (HTTP 429)
- Server errors (HTTP 5xx)
- Timeout errors

**Not Retryable:**
- Client errors (HTTP 4xx except 429)
- Validation errors
- In test mode (fail fast for debugging)

#### Fallback Behavior

When all retries fail, the system uses graceful fallbacks:

**Game Master:** Sends a new character (default action)

**Character Agent:** Returns generic polite response
```
"Thanks for your advice! I'll think about this and get back to you."
```

**Evaluator Agent:** Uses neutral evaluation (score: 5/10)

**God/Boss Agent:** Returns encouraging generic review

**Progress:** Always preserved in advisorState

## Usage Examples

### Example 1: Agent Call (Automatic Retry)

```typescript
// In invoke-character-tool.ts
// cachedGenerate automatically wraps with runAgentOperation (retry + concurrency)
const response = await cachedGenerate(
  "agent",
  `character_${character.characterId}`,
  prompt,
  () => characterAgent.generate(prompt),
);
// If all retries fail, error is thrown and caught by orchestrator
```

### Example 2: Tool Call with Fallback (Orchestrator)

```typescript
// In orchestrator.ts
let characterResponse: any;
try {
  // Tool internally uses cachedGenerate (automatic retry)
  characterResponse = await characterTool.execute({
    character,
    scenario,
    advisorMessage,
  });
} catch (error) {
  // Fallback: graceful response after all retries failed
  characterResponse = {
    messages: ["Thanks for your advice! I'll think about this."],
    conversationEnding: true,
  };
}
```

### Example 3: RAG Query with Custom Retry

```typescript
// In query-finnish-knowledge-tool.ts
// Custom retry for operations that don't use cachedGenerate
const { embedding } = await withRetry(
  () => embed({ value: query, model }),
  "Embedding Generation",
  { maxAttempts: 3, shouldRetry: isRetryableError }
);
```

## Error Logging

Errors are logged for debugging:

```typescript
// Get recent errors
const recentErrors = getRecentErrors(10);

// Each error log entry contains:
{
  timestamp: "2025-01-15T10:30:00Z",
  context: "Character Agent (Anna)",
  error: "Network timeout",
  attempt: 3,
  maxAttempts: 3,
  recovered: false
}
```

### Console Output

```
❌ [Character Agent (Anna)] Attempt 1/3: Network timeout
⏳ [Character Agent (Anna)] Retrying in 1000ms...
❌ [Character Agent (Anna)] Attempt 2/3: Network timeout
⏳ [Character Agent (Anna)] Retrying in 2000ms...
✅ [Character Agent (Anna)] Recovered after 3 attempts
```

## Testing

Run error recovery tests:

```bash
node src/mastra/utils/error-recovery.test.ts
```

Tests cover:
- Successful recovery after retries
- Fallback when all retries fail
- Error classification
- User-friendly error messages
- Error logging

## Best Practices

### 1. Use cachedGenerate for Agent Calls

✅ **Good:**
```typescript
// Automatic retry + concurrency limiting
const result = await cachedGenerate(
  "agent",
  "agent_name",
  prompt,
  () => agent.generate(prompt)
);
```

❌ **Bad:**
```typescript
// No retry or concurrency limiting!
const result = await agent.generate(prompt);
```

### 2. Always Have Fallbacks in Orchestrator

✅ **Good:**
```typescript
try {
  return await tool.execute(...);
} catch (error) {
  console.error("Tool failed:", error);
  return fallbackValue; // Never crash!
}
```

❌ **Bad:**
```typescript
return await tool.execute(...); // Could crash game!
```

### 3. Don't Add Double Retry

❌ **Bad:**
```typescript
// Double retry! cachedGenerate already retries
await withRetry(
  () => cachedGenerate(...),
  "Context"
);
```

✅ **Good:**
```typescript
// Single retry layer
await cachedGenerate(...);
```

### 4. Use withRetry for Non-Agent Operations

✅ **Good:**
```typescript
// RAG operations need custom retry
const { embedding } = await withRetry(
  () => embed({ value: query, model }),
  "Embedding Generation"
);
```

## Performance Considerations

- **Agent Calls:**
  - 2 retries with exponential backoff (250ms base delay)
  - Concurrency limited to 5 concurrent operations (configurable via AGENT_CONCURRENCY)
  - Total max time: ~875ms for 3 attempts (250ms + 500ms + network time)

- **RAG Queries:**
  - 3 retries with exponential backoff (1s base delay)
  - Max delay capped at 10 seconds
  - Total max time: ~7s for 4 attempts (1s + 2s + 4s + network time)

- **Test Mode:** No retries in test cache mode (fail fast for debugging)
- **Error Log Size:** Limited to 100 entries (in-memory)

## Future Improvements

Potential enhancements:

1. **Circuit Breaker:** Stop retrying if service is consistently down
2. **Metrics:** Track error rates and recovery success
3. **Adaptive Timeouts:** Adjust delays based on error patterns
4. **Persistent Logging:** Save errors to file for analysis
5. **User Notifications:** Alert users when service degrades

## Summary

The error recovery system ensures a smooth player experience by:

✅ **Never crashing** - All AI failures are caught and handled
✅ **Smart retries** - Two-layer retry system:
  - Agent calls: runAgentOperation (2 retries, 250ms backoff)
  - RAG queries: withRetry (3 retries, 1s backoff)
✅ **Concurrency control** - Limits concurrent agent calls to prevent overload
✅ **Graceful degradation** - Sensible fallbacks maintain game flow
✅ **Progress safety** - Game state is always preserved
✅ **Debug visibility** - Comprehensive error logging
✅ **No double retry** - Single retry layer per operation

**Architecture Benefits:**
- Agent execution layer handles retry + concurrency for all AI calls
- Error recovery layer provides fallbacks and user-friendly messages
- RAG operations use custom retry for non-agent operations
- Clear separation prevents double retry (was 9 attempts, now 3)

**Result:** Players can always continue playing, even when AI services fail temporarily.
