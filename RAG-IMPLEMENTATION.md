# RAG Implementation for Evaluator Agent

## Overview

This implementation adds Retrieval-Augmented Generation (RAG) to the evaluator agent, enabling it to evaluate financial advice against research-backed Finnish financial literacy standards.

## What Was Added

### 1. Finnish Financial Literacy Knowledge Base

**Location**: `knowledge-base/finnish-financial-literacy.md`

A comprehensive knowledge base compiled from authentic Finnish public sources:

- **Bank of Finland Financial Literacy Centre** - National strategy targeting world's best financial literacy by 2030
- **Finnish National Agency for Education (OPH)** - National curriculum standards for financial education
- **Yrityskylä Program** - Junior Achievement Finland's program reaching 85% of 6th graders (70,000+ students/year)
- **EU/OECD-INFE Framework** - Financial competence framework for children and young people
- **University of Helsinki & Jyväskylä Research** - Academic research on financial literacy outcomes
- **OP Financial Group** - Youth financial education initiatives
- **Helsinki Deaconess Foundation** - Taloustaito project for at-risk youth

**Content Includes**:

- Budgeting principles and best practices
- Saving strategies and allocation recommendations
- Debt management guidelines (avoiding over-indebtedness)
- Investment basics for youth
- Risk and reward concepts
- Quality criteria for evaluating financial advice
- Common mistakes to avoid
- Age-appropriate financial literacy expectations

### 2. Vector Store Implementation

**Technology Stack**:

- **Vector Database**: LibSQL (lightweight, file-based SQLite with vector extensions)
- **Embedding Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chunking Strategy**: Semantic section-based chunking (by ## markdown headers)
- **Search Method**: Cosine similarity

**Files**:

- `src/mastra/rag/init-knowledge-base.ts` - Initialization script to chunk, embed, and store knowledge
- `knowledge-base.db` - Vector database (generated after initialization)

### 3. RAG Query Tool

**Location**: `src/mastra/tools/query-finnish-knowledge-tool.ts`

A Mastra tool that enables agents to query the Finnish financial literacy knowledge base.

**Features**:

- Semantic search using embedding similarity
- Topic filtering (budgeting, saving, debt, investing, etc.)
- Configurable result count (topK)
- Source citations included in results
- Relevance scoring

**Input Schema**:

```typescript
{
  query: string,        // e.g., "budgeting best practices"
  topic?: enum,         // Optional filter: budgeting, saving, debt_management, etc.
  topK?: number         // Number of results (1-10, default 3)
}
```

**Output Schema**:

```typescript
{
  results: Array<{
    text: string,       // Content from knowledge base
    section: string,    // Section title
    topic: string,      // Topic category
    source: string,     // Citation/source
    score: number       // Relevance score (0-1)
  }>,
  summary: string       // Brief summary of findings
}
```

### 4. Enhanced Evaluator Agent

**Location**: `src/mastra/agents/evaluator-agent.ts`

The evaluator agent now:

- Has access to `queryFinnishKnowledge` tool
- Is instructed to query the knowledge base for relevant topics before evaluation
- Cross-references advice against Finnish financial literacy standards
- Cites specific sources in evaluation feedback
- Includes `researchBackedEvaluation` field in output JSON

**New Evaluation Workflow**:

1. Review the advice given and identify main topic
2. **Query knowledge base** for relevant Finnish standards
3. Compare advice against scenario ideals AND research-backed standards
4. Check for alignment with best practices
5. **Cite sources** in evaluation (e.g., "Bank of Finland Learn Economy materials")
6. Include research-backed evaluation in output

**New Output Fields**:

```typescript
{
  // ... existing fields ...
  "researchBackedEvaluation": {
    "citedSources": string[],           // Sources consulted
    "alignmentWithStandards": string,   // How advice aligns with Finnish standards
    "qualityScore": string              // Score per Finnish criteria
  }
}
```

### 5. Tool Registration

**Location**: `src/mastra/index.ts`

The `queryFinnishKnowledgeTool` is registered in the main Mastra instance, making it available to all agents.

### 6. Documentation

- `knowledge-base/README.md` - Knowledge base setup and usage guide
- `RAG-IMPLEMENTATION.md` - This file, comprehensive implementation documentation

## Setup Instructions

### Prerequisites

1. **Node.js** >= 22.13.0
2. **OpenAI API Key** - Required for generating embeddings

### Step 1: Set Environment Variables

Create `.env` file in project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 2: Install Dependencies

```bash
npm install
```

New dependencies added:

- `@ai-sdk/openai` - OpenAI SDK for embeddings
- `ai` - Vercel AI SDK for embedding generation

### Step 3: Initialize Knowledge Base

Run the initialization script to build the vector database:

```bash
npm run init:knowledge-base
```

This will:

1. Read `knowledge-base/finnish-financial-literacy.md`
2. Chunk into ~36 semantic sections
3. Generate 1536-dimensional embeddings for each chunk
4. Store in `knowledge-base.db` with LibSQL
5. Create searchable vector index

**Expected Output**:

```
🚀 Initializing Finnish Financial Literacy Knowledge Base...
📖 Reading knowledge base file...
   ✓ Loaded 18774 characters
✂️  Chunking content...
   ✓ Created 36 chunks
🗄️  Initializing LibSQL Vector store...
   ✓ Index created
🧠 Generating embeddings...
   ✓ Generated 36 embeddings
💾 Storing embeddings in vector database...
   ✓ Stored 36 embeddings
📊 Verifying index...
   Index: finnish_financial_literacy
   Dimensions: 1536
   Vector count: 36
   Metric: cosine
✅ Knowledge base initialization complete!
```

### Step 4: Verify Setup

The evaluator agent will automatically use the knowledge base during evaluations. To verify:

1. Run a test game session
2. Observe evaluator output includes `researchBackedEvaluation` field
3. Check for cited sources from Finnish financial literacy programs

## Usage

### For Developers

The RAG system is automatically integrated. When the evaluator agent receives advice to evaluate:

1. It identifies the financial topic (budgeting, saving, debt, etc.)
2. Queries the knowledge base using `queryFinnishKnowledge` tool
3. Retrieves 3-5 most relevant chunks from Finnish standards
4. Compares advisor's advice against research-backed best practices
5. Cites specific sources in evaluation feedback

### Manual Queries (For Testing)

You can also query the knowledge base directly in code:

```typescript
import { queryFinnishKnowledgeTool } from "./src/mastra/tools/query-finnish-knowledge-tool";

const result = await queryFinnishKnowledgeTool.execute({
  context: {
    query: "What are the budgeting best practices for young people?",
    topic: "budgeting",
    topK: 3,
  },
});

console.log(result.summary);
console.log(result.results);
```

### Available Topics

- `budgeting` - Budget creation, allocation, tracking
- `saving` - Saving strategies, emergency funds, goal-based saving
- `debt_management` - Responsible borrowing, debt repayment, avoiding over-indebtedness
- `investing` - Investment basics, risk tolerance, diversification
- `risk_management` - Insurance, risk assessment, mitigation
- `financial_education` - Teaching methods, curricula, programs
- `financial_system` - Banks, financial institutions, consumer rights
- `general` - Cross-cutting financial literacy topics

## Key Features

### 1. Research-Backed Evaluation

All evaluations now reference authentic Finnish financial education standards instead of just hardcoded scenario ideals.

### 2. Source Citations

Every evaluation includes specific citations like:

- "Bank of Finland Learn Economy materials on budgeting"
- "Yrityskylä program curriculum - savings module"
- "Finnish National Financial Literacy Strategy - Budget allocation recommendations"

### 3. Alignment Scoring

Evaluations assess how well advice aligns with Finnish standards:

- "Fully aligns with Finnish budgeting best practices"
- "Partially aligns but missing emergency fund emphasis"
- "Contradicts Finnish debt management guidelines"

### 4. Quality Benchmarking

Advice is scored against Finnish financial education criteria used to reach world's best financial literacy by 2030.

## Cost Considerations

### One-Time Initialization

- **Chunks**: ~36
- **Embeddings**: ~36 at 1536 dimensions
- **Model**: `text-embedding-3-small` @ $0.02 per 1M tokens
- **Cost**: ~$0.0001 USD (negligible)

### Per-Query Costs

- **Embedding Generation**: 1 query embedding per evaluation
- **Cost**: ~$0.000001 USD per evaluation
- **Monthly Cost** (1000 evaluations): ~$0.001 USD

The RAG system adds essentially zero cost to operations.

## Technical Architecture

```
┌─────────────────────────────────────────┐
│   Evaluator Agent Workflow              │
├─────────────────────────────────────────┤
│ 1. Receive advice to evaluate           │
│ 2. Identify topic (budgeting, saving...)│
│ 3. Call queryFinnishKnowledge tool      │
│    ├─ Generate query embedding          │
│    ├─ Search LibSQL vector DB           │
│    ├─ Retrieve top-K results            │
│    └─ Return with citations             │
│ 4. Compare advice vs standards          │
│ 5. Output evaluation with sources       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Knowledge Base Structure              │
├─────────────────────────────────────────┤
│ finnish-financial-literacy.md           │
│   ├─ National Strategy (Bank of FI)    │
│   ├─ EU/OECD Framework                  │
│   ├─ Yrityskylä Curriculum              │
│   ├─ Budgeting Principles               │
│   ├─ Saving Strategies                  │
│   ├─ Debt Management                    │
│   ├─ Investment Basics                  │
│   ├─ Quality Criteria                   │
│   └─ References & Citations             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Vector Database (LibSQL)              │
├─────────────────────────────────────────┤
│ Index: finnish_financial_literacy       │
│ Dimension: 1536                         │
│ Metric: Cosine Similarity               │
│ Chunks: 36 semantic sections            │
│ Metadata:                               │
│   ├─ text (content)                     │
│   ├─ section (title)                    │
│   ├─ topic (category)                   │
│   ├─ source (citation)                  │
│   └─ chunkIndex (sequence)              │
└─────────────────────────────────────────┘
```

## Maintenance

### Updating the Knowledge Base

If Finnish financial literacy standards change or new research is published:

1. Edit `knowledge-base/finnish-financial-literacy.md`
2. Add new content with proper citations
3. Re-run initialization: `npm run init:knowledge-base`
4. Vector database will be truncated and rebuilt

### Monitoring Quality

Review evaluator outputs for:

- Appropriate use of `queryFinnishKnowledge` tool
- Relevant citations in `researchBackedEvaluation`
- Accurate alignment assessments
- Quality scores matching Finnish criteria

## Future Enhancements

Potential improvements:

1. **Multi-language Support** - Add Swedish and English Finnish materials
2. **Temporal Tracking** - Track how advice quality improves over time against standards
3. **Additional Sources** - Expand with more Finnish research and programs
4. **Reranking** - Add semantic reranking for better result quality
5. **Hybrid Search** - Combine keyword and semantic search

## Compliance & Attribution

All content in the knowledge base is compiled from publicly available Finnish educational materials. Sources include:

- Bank of Finland (Suomen Pankki) - Public educational materials
- Finnish National Agency for Education (OPH) - Public curriculum standards
- Junior Achievement Finland - Published program information
- EU/OECD-INFE - Public framework documents
- Published academic research papers

All materials are used for educational purposes in alignment with their intended public use for financial literacy education. Proper citations are maintained throughout.

## Troubleshooting

### "Knowledge base not initialized"

**Solution**: Run `npm run init:knowledge-base`

### "OpenAI API key is missing"

**Solution**: Create `.env` file with `OPENAI_API_KEY=your_key`

### "Package subpath './vector' is not defined"

**Solution**: Import from `@mastra/libsql` not `@mastra/libsql/vector`

### Empty Results from Query

**Possible causes**:

- Query doesn't match knowledge base content
- Topic filter too restrictive
- Increase `topK` parameter

## Summary

This RAG implementation transforms the evaluator from using hardcoded scenario ideals to evaluating against comprehensive, research-backed Finnish financial literacy standards. The system:

✅ Uses authentic Finnish public sources
✅ Provides proper citations for all evaluations
✅ Aligns with Finland's goal of world's best financial literacy by 2030
✅ Adds negligible cost (<$0.001 per 1000 evaluations)
✅ Maintains all sources and attributions
✅ Enables research-backed, objective advice evaluation

The evaluator can now assess financial advice quality against the same standards used to educate 70,000+ Finnish students annually.
