# Error Recovery System

## Overview

The error recovery system ensures that AI failures never crash the game. It implements:

1. **Retry logic with exponential backoff** (3 attempts by default)
2. **Graceful fallback messages** when all retries fail
3. **Progress preservation** - game state is never lost on error
4. **Comprehensive error logging** for debugging

## Architecture

### Core Components

#### 1. Error Recovery Utilities (`src/mastra/utils/error-recovery.ts`)

- `withRetry()` - Wraps async operations with retry logic
- `withRetryAndFallback()` - Wraps operations with a fallback value
- `isRetryableError()` - Classifies errors as retryable or not
- `getUserFriendlyError()` - Converts technical errors to user-friendly messages
- Error logging functions for debugging

#### 2. Protected Components

All AI agent calls and tools are protected:

- **Game Master Agent** - Character selection and game flow
- **Character Agents** - Character responses and interactions
- **Evaluator Agent** - Advice quality evaluation
- **God/Boss Agent** - Performance reviews
- **Finnish Knowledge Tool** - RAG queries

### How It Works

#### Retry Logic

```typescript
const result = await withRetry(
  () => someAsyncOperation(),
  "Operation Name",
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
  }
);
```

**Retry sequence:**
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

### Example 1: Character Response with Error Recovery

```typescript
// In orchestrator.ts
let characterResponse: any;
try {
  characterResponse = await withRetry(
    () => characterTool.execute({ character, scenario, advisorMessage }),
    `Character Tool (${character.name})`,
    { maxAttempts: 3, shouldRetry: isRetryableError }
  );
} catch (error) {
  // Fallback: graceful response
  characterResponse = {
    messages: ["Thanks for your advice! I'll think about this."],
    conversationEnding: true,
  };
}
```

### Example 2: Advice Evaluation with Error Recovery

```typescript
// In orchestrator.ts
let adviceEvaluation: any;
try {
  adviceEvaluation = await withRetry(
    () => evaluateTool.execute({ advice, scenario, character }),
    "Advice Evaluation Tool",
    { maxAttempts: 3, shouldRetry: isRetryableError }
  );
} catch (error) {
  // Fallback: neutral evaluation
  adviceEvaluation = {
    qualityScore: 5,
    outcome: "neutral",
    strengths: ["Provided guidance"],
    // ... other default values
  };
}
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

### 1. Always Use Retry Wrappers

✅ **Good:**
```typescript
const result = await withRetry(
  () => agent.generate(prompt),
  "Agent Name",
  { shouldRetry: isRetryableError }
);
```

❌ **Bad:**
```typescript
const result = await agent.generate(prompt); // No retry!
```

### 2. Provide Meaningful Context Names

✅ **Good:**
```typescript
await withRetry(fn, "Character Agent (Anna)", config);
```

❌ **Bad:**
```typescript
await withRetry(fn, "agent", config);
```

### 3. Always Have Fallbacks

✅ **Good:**
```typescript
try {
  return await withRetry(...);
} catch (error) {
  return fallbackValue; // Never crash!
}
```

❌ **Bad:**
```typescript
return await withRetry(...); // Could crash!
```

### 4. Log Errors for Debugging

```typescript
catch (error) {
  logError("Context", error, 3, 3, false);
  return fallbackValue;
}
```

## Performance Considerations

- **Test Mode:** No retries (fail fast for debugging)
- **Production:** 3 retries with exponential backoff
- **Max Delay:** Capped at 10 seconds to prevent long waits
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
✅ **Smart retries** - Exponential backoff with error classification
✅ **Graceful degradation** - Sensible fallbacks maintain game flow
✅ **Progress safety** - Game state is always preserved
✅ **Debug visibility** - Comprehensive error logging

**Result:** Players can always continue playing, even when AI services fail temporarily.
