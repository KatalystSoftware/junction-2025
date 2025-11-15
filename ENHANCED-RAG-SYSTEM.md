# Enhanced RAG System Documentation

## Overview

The Enhanced RAG (Retrieval-Augmented Generation) System provides advanced knowledge retrieval capabilities with multi-language support, semantic reranking, and real-time Finnish financial news integration.

## Features

### 1. Multi-Language Support 🌍

The system supports three languages for comprehensive Nordic region coverage:

- **Finnish (fi)**: Complete Finnish financial literacy content from Bank of Finland, OP Group, and educational institutions
- **Swedish (sv)**: Swedish financial education from Konsumentverket and Finansinspektionen
- **English (en)**: International best practices from OECD, INFE, and global financial literacy frameworks

**Cross-language search**: Query in one language and get relevant results from all language knowledge bases.

### 2. Semantic Reranking 🎯

Instead of relying solely on vector similarity scores, the enhanced system uses AI-powered semantic reranking to improve result quality:

- **AI Relevance Scoring**: Uses Gemini 2.0 Flash to evaluate semantic relevance of each result
- **Weighted Combination**: Combines vector similarity (40%) with AI relevance score (60%)
- **Relevance Explanations**: Provides explanations for why results are relevant
- **Fallback Options**: Includes keyword-based and diversity-aware reranking methods

**Methods available**:

- `rerankResults()`: AI-powered semantic reranking
- `keywordRerank()`: Fast keyword-based reranking
- `diversityRerank()`: Ensures diverse results from different sections

### 3. Real-Time Financial News Integration 📰

Stay current with the latest Finnish financial news:

- **Multi-source news**: Integrates news from Finnish, Swedish, and English sources
- **Topic filtering**: Filter news by financial topics (budgeting, investing, debt, etc.)
- **AI summarization**: Automatically summarizes news articles for quick consumption
- **Actionable insights**: Provides practical advice based on current news

**News sources** (in production):

- YLE News (Finnish public broadcaster)
- Kauppalehti (Finnish business news)
- Helsingin Sanomat (Finland's largest newspaper)
- Konsumentverket (Swedish Consumer Agency)

### 4. Enhanced Query Tool 🔍

The `queryKnowledgeEnhancedTool` provides comprehensive search capabilities:

```typescript
{
  query: "budgeting best practices",
  language: "all",           // fi, sv, en, or all
  topic: "budgeting",        // optional topic filter
  includeNews: true,         // include recent news
  useSemanticReranking: true, // use AI reranking
  topK: 5                    // number of results
}
```

**Returns**:

- Knowledge base results with relevance scores
- Recent news articles and summaries
- Language breakdown of results
- Relevance explanations (when reranking enabled)

## Architecture

### Knowledge Base Structure

```
knowledge-base/
├── finnish-financial-literacy.md      # Finnish content
├── swedish-financial-literacy.md      # Swedish content
└── english-financial-literacy.md      # English content

knowledge-base.db (LibSQL)
├── finnish_financial_literacy         # Finnish index
├── swedish_financial_literacy         # Swedish index
├── english_financial_literacy         # English index
└── financial_news                     # News index
```

### Components

```
src/mastra/rag/
├── init-knowledge-base.ts             # Original Finnish-only init
├── init-knowledge-base-enhanced.ts    # Enhanced multi-language init
├── semantic-reranker.ts               # Reranking algorithms
└── news-integration.ts                # News fetching and integration

src/mastra/tools/
├── query-finnish-knowledge-tool.ts    # Original Finnish-only query
└── query-knowledge-enhanced-tool.ts   # Enhanced multi-language query
```

## Getting Started

### 1. Initialize the Enhanced Knowledge Base

```bash
npm run init:knowledge-base:enhanced
```

This will:

- Load and chunk all three language knowledge bases
- Generate embeddings for each language (Google text-embedding-004)
- Create separate vector indices for each language
- Fetch and integrate recent financial news
- Create a news index with current articles

**Expected output**:

```
🚀 Initializing Enhanced Multi-language Knowledge Base...

📖 Processing FI knowledge base...
   ✓ Loaded 18,234 characters
   ✓ Created 36 chunks
   ✓ Generated 36 embeddings
   ✓ Stored 36 embeddings

📖 Processing SV knowledge base...
   ✓ Loaded 12,450 characters
   ✓ Created 28 chunks
   ✓ Generated 28 embeddings
   ✓ Stored 28 embeddings

📖 Processing EN knowledge base...
   ✓ Loaded 15,678 characters
   ✓ Created 32 chunks
   ✓ Generated 32 embeddings
   ✓ Stored 32 embeddings

📰 Initializing news index...
   ✓ Prepared 5 news articles
   ✓ Generated 5 embeddings
   ✓ Stored 5 news embeddings

✅ Enhanced Knowledge Base Initialization Complete!

📋 Summary:
   Language Knowledge Bases:
     - FI: 36 chunks, 36 embeddings
     - SV: 28 chunks, 28 embeddings
     - EN: 32 chunks, 32 embeddings
   News Articles: 5 articles, 5 embeddings

   Total: 96 chunks, 101 embeddings
```

### 2. Using the Enhanced Query Tool

The tool is automatically registered in the Mastra framework and available to agents.

**Example usage in an agent**:

```typescript
import { queryKnowledgeEnhancedTool } from "./tools/query-knowledge-enhanced-tool.ts";

// Query in all languages with reranking and news
const result = await queryKnowledgeEnhancedTool.execute({
  query: "pension planning strategies",
  language: "all",
  includeNews: true,
  useSemanticReranking: true,
  topK: 5,
});

console.log(result.summary);
console.log(result.knowledgeBaseResults);
console.log(result.newsResults);
```

### 3. Integrating with Agents

Update your agents to use the enhanced query tool:

```typescript
import { Agent } from "@mastra/core";
import { queryKnowledgeEnhancedTool } from "../tools/query-knowledge-enhanced-tool.ts";

const evaluatorAgent = new Agent({
  name: "Financial Advice Evaluator",
  instructions: `You evaluate financial advice quality using multi-language
                 knowledge base and current financial news.`,
  model: google("gemini-2.0-flash-exp"),
  tools: [queryKnowledgeEnhancedTool],
});
```

## Advanced Usage

### Semantic Reranking

```typescript
import {
  rerankResults,
  keywordRerank,
  diversityRerank,
} from "./rag/semantic-reranker.ts";

// AI-powered semantic reranking
const reranked = await rerankResults(query, candidates, topK);

// Fast keyword reranking
const keywordRanked = keywordRerank(query, candidates, topK);

// Diversity-aware reranking (ensures results from different sections)
const diverseResults = diversityRerank(candidates, topK);
```

### News Integration

```typescript
import {
  fetchFinnishFinancialNews,
  summarizeFinancialNews,
  getNewsEnhancedContext,
} from "./rag/news-integration.ts";

// Fetch recent news
const news = await fetchFinnishFinancialNews("investing", "fi", 5);

// Summarize news articles
const summary = await summarizeFinancialNews(news.articles, "investing");

// Get combined context (knowledge base + news)
const context = await getNewsEnhancedContext("market trends", "all");
```

### Language-Specific Queries

```typescript
// Query only Finnish sources
const finnishResults = await queryKnowledgeEnhancedTool.execute({
  query: "velkaantuminen",
  language: "fi",
  topK: 3,
});

// Query only Swedish sources
const swedishResults = await queryKnowledgeEnhancedTool.execute({
  query: "skuldsättning",
  language: "sv",
  topK: 3,
});

// Query only English sources
const englishResults = await queryKnowledgeEnhancedTool.execute({
  query: "debt management",
  language: "en",
  topK: 3,
});
```

## Performance Considerations

### Embedding Generation

- **Model**: Google text-embedding-004 (768 dimensions)
- **Speed**: ~50ms per embedding (with API latency)
- **Cost**: Very low (Google's embedding API is cost-effective)

### Semantic Reranking

- **AI Reranking**: ~2-3 seconds for 10 candidates (uses Gemini 2.0 Flash)
- **Keyword Reranking**: < 10ms (no API calls)
- **Recommendation**: Use AI reranking for important queries, keyword reranking for real-time applications

### News Fetching

- **Mock Mode**: Instant (returns pre-defined articles)
- **Production Mode**: 1-2 seconds (depends on news API)
- **Caching**: Recommended to cache news for 15-30 minutes

## Production Deployment

### News API Integration

Replace the mock implementation in `news-integration.ts` with real API calls:

```typescript
// YLE News API
const yleNews = await fetch("https://external.api.yle.fi/v1/...", {
  headers: {
    app_id: process.env.YLE_APP_ID,
    app_key: process.env.YLE_APP_KEY,
  },
});

// NewsAPI.org for Finnish sources
const newsApi = await fetch("https://newsapi.org/v2/everything", {
  params: {
    q: query,
    language: "fi",
    sources: "kauppalehti,hs-fi",
    apiKey: process.env.NEWS_API_KEY,
  },
});
```

### Environment Variables

Add to your `.env` file:

```bash
# Existing
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# For news integration (production)
YLE_APP_ID=your_yle_app_id
YLE_APP_KEY=your_yle_app_key
NEWS_API_KEY=your_newsapi_key
KAUPPALEHTI_API_KEY=your_kauppalehti_key
```

### Scheduled Updates

Set up a cron job to update the news index regularly:

```bash
# Update news every 30 minutes
*/30 * * * * cd /path/to/project && npm run update:news
```

Create the update script in package.json:

```json
{
  "scripts": {
    "update:news": "node --env-file=.env src/mastra/rag/update-news-index.ts"
  }
}
```

## Testing

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```typescript
describe("Enhanced RAG System", () => {
  test("should query all languages", async () => {
    const result = await queryKnowledgeEnhancedTool.execute({
      query: "budgeting",
      language: "all",
      topK: 5,
    });

    expect(result.knowledgeBaseResults.length).toBeGreaterThan(0);
    expect(
      result.languageBreakdown.fi +
        result.languageBreakdown.sv +
        result.languageBreakdown.en,
    ).toBe(5);
  });

  test("should include news when requested", async () => {
    const result = await queryKnowledgeEnhancedTool.execute({
      query: "interest rates",
      includeNews: true,
    });

    expect(result.newsResults).toBeDefined();
    expect(result.newsResults?.articles.length).toBeGreaterThan(0);
  });

  test("should rerank results semantically", async () => {
    const result = await queryKnowledgeEnhancedTool.execute({
      query: "pension planning",
      useSemanticReranking: true,
      topK: 5,
    });

    result.knowledgeBaseResults.forEach((r) => {
      expect(r.rerankScore).toBeDefined();
      expect(r.relevanceExplanation).toBeDefined();
    });
  });
});
```

## Troubleshooting

### Knowledge base not initialized error

**Error**: `Enhanced knowledge base not initialized`

**Solution**: Run `npm run init:knowledge-base:enhanced`

### Reranking timeout

**Error**: Semantic reranking times out

**Solution**:

1. Reduce topK to query fewer results
2. Disable reranking: `useSemanticReranking: false`
3. Use `keywordRerank` instead of `rerankResults`

### Missing language results

**Error**: No results for a specific language

**Solution**:

1. Check that the language knowledge base file exists
2. Verify the index was created: `sqlite3 knowledge-base.db ".tables"`
3. Re-run initialization: `npm run init:knowledge-base:enhanced`

## Future Enhancements

### Planned Features

1. **Hybrid Search**: Combine vector search with keyword search (BM25)
2. **Query Expansion**: Automatically expand queries with synonyms
3. **Multi-modal Support**: Add support for images, charts, and infographics
4. **Personalization**: User-specific result ranking based on history
5. **Real-time Monitoring**: Track news sources in real-time
6. **Feedback Loop**: Learn from user feedback to improve ranking

### Contributing

To add new language support:

1. Create a new knowledge base file: `knowledge-base/{language}-financial-literacy.md`
2. Add the language to `KNOWLEDGE_BASES` array in `init-knowledge-base-enhanced.ts`
3. Update the `language` enum in `query-knowledge-enhanced-tool.ts`
4. Run initialization: `npm run init:knowledge-base:enhanced`

## References

- [Original RAG Implementation](./RAG-IMPLEMENTATION.md)
- [Mastra Framework Documentation](https://mastra.ai/docs)
- [Google Embeddings API](https://ai.google.dev/docs/embeddings_guide)
- [LibSQL Vector Store](https://github.com/libsql/libsql)

---

**Version**: 1.0.0
**Last Updated**: November 15, 2025
**Author**: Enhanced RAG System Development Team
