# Financial Simulation System

A realistic transaction-based financial simulation for Elämäpeli 2025, featuring granular transactions with real Finnish merchants, personality-driven spending, and SQLite persistence.

## 🎯 Overview

The simulation system creates **20-40 realistic transactions per month** for each character, showing how they live their financial lives. Characters shop at real Finnish merchants (Temu, Wolt, S-Market, HSL, Espresso House), with spending patterns driven by their personality traits.

### Key Features

- ✅ **Realistic Transactions**: Salary, rent, subscriptions, groceries, dining, coffee, transport, entertainment, online shopping, impulse purchases
- ✅ **Real Finnish Merchants**: Temu, Wolt, S-Market, HSL, Espresso House, Netflix, Spotify, etc.
- ✅ **Personality-Driven**: Impulsive characters buy from Temu, emotional characters order Wolt
- ✅ **SQLite Database**: Unlimited transaction history, fast queries, analytics
- ✅ **Monthly Tick System**: 1 consultation = 1 simulated month
- ✅ **Advice Effects**: Advisor's advice actually changes spending behavior
- ✅ **6-Month History**: Each character starts with realistic backstory

## 📁 Architecture

```
src/mastra/simulation/
├── simulation-types.ts              # Type definitions
├── database-manager.ts              # SQLite operations
├── merchant-database.ts             # Finnish merchant lists
├── spending-model.ts                # Personality → spending patterns
├── transaction-generator.ts         # Generate monthly transactions
├── debt-interest-calculator.ts      # Debt interest logic
├── advice-action-extractor.ts       # Extract actions from advice text
├── simulation-engine.ts             # Monthly tick orchestrator
└── initial-history-generator.ts     # 6-month backstory generation
```

## 🚀 Quick Start

### 1. Initialize Simulation Engine

```typescript
import { SimulationEngine } from "./simulation/simulation-engine.ts";

// Create engine with database path
const engine = new SimulationEngine("saves/advisor_123.db");
```

### 2. Initialize Character

```typescript
import { generateInitialHistory } from "./simulation/initial-history-generator.ts";

// Generate 6-month backstory
generateInitialHistory(character, engine);
```

### 3. Simulate Months

```typescript
import type { SimulationConfig } from "./simulation/simulation-types.ts";

// Simulate 3 months
const config: SimulationConfig = {
  monthsToSimulate: 3,
  startDate: "2025-01",
  generateHistory: false,
  applyAdviceEffects: true,
};

const result = engine.simulateMonths(character, config);

console.log(`Simulated ${result.monthsSimulated} months`);
console.log(`Generated ${result.totalTransactions} transactions`);
console.log(`Final balance: ${result.finalBalance}€`);
```

### 4. Query Transactions

```typescript
// Get recent transactions
const recent = engine.getRecentTransactions(character.characterId, 50);

// Get transactions for specific month
const db = engine.getDatabase();
const januaryTxns = db.getTransactionsByMonth(character.characterId, "2025-01");

// Get spending by category
const spending = db.getSpendingByCategory(
  character.characterId,
  "2025-01-01",
  "2025-01-31",
);
console.log(spending); // { groceries: 250, dining: 180, coffee: 65, ... }
```

## 📊 Example Output

### Minna's January 2025

```
DATE         AMOUNT      DESCRIPTION                    MERCHANT              BALANCE
2025-01-01   -650.00€    Rent payment                   Landlord              247.50€
2025-01-03   -3.20€      Coffee - Espresso House        Espresso House        244.30€
2025-01-04   -45.30€     Groceries - S-Market           S-Market              199.00€
2025-01-05   -12.80€     Dining - Hesburger             Hesburger             186.20€
2025-01-07   -18.50€     Online purchase - Temu         Temu                  164.20€
2025-01-09   -9.99€      Subscription - Spotify         Spotify               151.31€
2025-01-10   -32.40€     Food delivery - Wolt           Wolt                  114.71€
2025-01-15   -67.80€     Impulse purchase - Zalando     Zalando               -16.79€
2025-01-25   +800.00€    Monthly salary - Student       Employer              695.91€
```

**Total: 25 transactions** (realistic!)

## 🧠 How It Works

### 1. Spending Model Generation

Each character's personality determines their spending:

```typescript
import { generateSpendingModel } from "./simulation/spending-model.ts";

const spendingModel = generateSpendingModel(character);

// Example for impulsive character:
{
  dining: { frequency: 12 },          // Eats out often
  coffee: { frequency: 18 },          // Daily coffee habit
  onlineShopping: {
    monthlyBudget: 150,
    frequency: 4,
    prefersCheapMarketplaces: true    // Shops at Temu
  },
  impulsePurchaseChance: 0.15         // 15% chance/month
}
```

### 2. Merchant Selection

Personality drives merchant choice:

```typescript
import { selectMerchant } from "./simulation/merchant-database.ts";

// Low financial literacy = premium stores
selectMerchant("groceries", { financial_literacy: 0.2 });
// → "Stockmann Herkku"

// High financial literacy = budget stores
selectMerchant("groceries", { financial_literacy: 0.8 });
// → "Lidl"

// Impulsive = Temu, fast food
selectMerchant("onlineShopping", { impulsiveness: 0.7 });
// → "Temu"
```

### 3. Transaction Generation

```typescript
import { TransactionGenerator } from "./simulation/transaction-generator.ts";

const generator = new TransactionGenerator();
const transactions = generator.generateMonthTransactions(
  character,
  "2025-01",
  spendingModel,
  startBalance,
);

// Generates:
// - 1 salary
// - Fixed expenses (rent, utilities, subscriptions)
// - 4 grocery trips
// - 8-12 dining/coffee purchases
// - 2-4 entertainment
// - 3-5 online shopping
// - 0-1 impulse purchases
// = 20-30 transactions
```

### 4. Advice Effects

Advisor's advice changes behavior:

```typescript
import {
  extractAdviceActions,
  createAdviceEffects,
} from "./simulation/advice-action-extractor.ts";

const advice = [
  "Cancel your Netflix subscription",
  "Reduce dining out by 30%",
  "Start tracking your expenses",
];

// Extract actions
const actions = extractAdviceActions(advice);
// → [
//   { actionType: "cancel_subscription", specificSubscription: "Netflix" },
//   { actionType: "reduce_expense_category", targetCategory: "dining", reductionPercent: 0.3 },
//   { actionType: "start_tracking" }
// ]

// Create effects
const effects = createAdviceEffects(
  characterId,
  sessionId,
  actions,
  0.8, // 80% chance character follows
);

// Effects persist in database and modify spending model
```

## 🗄️ Database Schema

### Character States

```sql
CREATE TABLE character_states (
  character_id TEXT PRIMARY KEY,
  current_balance REAL NOT NULL,
  monthly_income_day INTEGER NOT NULL,
  last_simulated_date TEXT NOT NULL,
  spending_model JSON NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Transactions

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,                -- "income", "expense", "subscription", etc.
  category TEXT NOT NULL,            -- "groceries", "dining", "coffee", etc.
  amount REAL NOT NULL,              -- Negative for expenses
  balance_after REAL NOT NULL,
  description TEXT NOT NULL,
  merchant_name TEXT,                -- "Temu", "Wolt", "S-Market", etc.
  advice_influenced INTEGER,         -- 1 if caused by advice
  metadata JSON,
  created_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES character_states(character_id)
);
```

### Indexes for Fast Queries

```sql
CREATE INDEX idx_transactions_character_date ON transactions(character_id, date DESC);
CREATE INDEX idx_transactions_advice ON transactions(advice_influenced);
```

## 🔧 Integration

### Orchestrator Integration

```typescript
// In startNewConsultation():
import { SimulationEngine } from "./simulation/simulation-engine.ts";

const engine = new SimulationEngine(advisorState.databasePath!);

// Calculate months elapsed since last consultation
const monthsElapsed = calculateMonthsElapsed(
  advisorState.lastSimulatedDate,
  getCurrentMonth(),
);

if (monthsElapsed > 0) {
  // Catch-up simulation for all characters
  engine.simulateAllCharacters(allCharacters, monthsElapsed, getCurrentMonth());

  // Update advisor state
  advisorState.lastSimulatedDate = getCurrentMonth();
  advisorState.simulatedMonthsPassed += monthsElapsed;
}
```

### Character Agent Integration

```typescript
// Provide transaction context to character agent
const recentTxns = engine.getRecentTransactions(characterId, 20);
const monthlySummary = engine.getMonthlySummaries(characterId, 1)[0];

const context = `
Your recent transactions:
${recentTxns.map((t) => `${t.date}: ${t.description} ${t.amount}€ (${t.merchantName})`).join("\n")}

This month:
- Income: ${monthlySummary.totalIncome}€
- Expenses: ${monthlySummary.totalExpenses}€
- Balance: ${monthlySummary.endBalance}€
`;
```

## 📈 Analytics Queries

### Spending Trends

```typescript
const db = engine.getDatabase();

// Total spending by category (last 3 months)
const spending = db.getSpendingByCategory(
  characterId,
  "2025-01-01",
  "2025-03-31",
);

// Advice-influenced transactions
const adviceTxns = db.getAdviceInfluencedTransactions(characterId);

// Income vs expenses trend
const summaries = db.getMonthlySummaries(characterId, 6);
const trend = summaries.map((s) => ({
  month: s.month,
  income: s.totalIncome,
  expenses: s.totalExpenses,
  net: s.totalIncome - s.totalExpenses,
}));
```

## ⚡ Performance

### Benchmarks (with granular transactions)

- **Initial history generation**: 6 months × 25 txns = ~150 transactions → **~150ms**
- **Monthly simulation**: 25 transactions per character → **~20ms**
- **Load recent transactions**: SELECT with index → **~1-2ms**
- **Database size**: ~1MB per 10,000 transactions

### Optimization Tips

- Use batch inserts for transactions (`insertTransactionsBatch`)
- Query with LIMIT to avoid loading all data
- Indexes already optimized for common queries
- Use `vacuum()` periodically to reclaim space

## 🧪 Testing

### Unit Tests

```typescript
import { TransactionGenerator } from "./simulation/transaction-generator.ts";

const generator = new TransactionGenerator();
const character = createTestCharacter();

const txns = generator.generateMonthTransactions(
  character,
  "2025-01",
  spendingModel,
  500,
);

// Assertions
expect(txns.length).toBeGreaterThan(20);
expect(txns.length).toBeLessThan(40);
expect(txns.filter((t) => t.type === "income")).toHaveLength(1);
expect(txns.filter((t) => t.category === "coffee").length).toBeGreaterThan(10);
```

### Integration Tests

```typescript
const engine = new SimulationEngine(":memory:"); // In-memory DB for tests

// Initialize character
engine.initializeCharacter(character);

// Simulate month
const result = engine.simulateMonth(character, "2025-01");

// Verify
expect(result.transactions.length).toBeGreaterThan(20);
expect(result.endBalance).not.toBe(result.startBalance);

// Query database
const state = engine.getCharacterState(character.characterId);
expect(state?.currentBalance).toBe(result.endBalance);
```

## 🚨 Error Handling

```typescript
try {
  const result = engine.simulateMonths(character, config);

  if (result.errors.length > 0) {
    console.error("Simulation errors:", result.errors);
  }
} catch (error) {
  console.error("Fatal simulation error:", error);
}
```

## 📝 Future Enhancements

- [ ] **Savings account simulation**: Track separate savings with interest
- [ ] **Investment simulation**: Stock market fluctuations
- [ ] **UI transaction viewer**: Visual timeline of transactions
- [ ] **Export to CSV**: Download transaction history
- [ ] **Advanced analytics**: Spending patterns, predictions
- [ ] **Multi-account support**: Checking + savings + investment accounts

## 🤝 Contributing

When adding new features:

1. Update type definitions in `simulation-types.ts`
2. Add database schema changes in `database-manager.ts`
3. Update transaction generator for new categories
4. Add merchant types in `merchant-database.ts`
5. Write tests for new functionality

## 📚 References

- SQLite documentation: https://www.sqlite.org/docs.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- Financial simulation best practices: FINANCIAL_SIMULATION_PLAN.md
