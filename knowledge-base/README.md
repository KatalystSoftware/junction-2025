# Finnish Financial Literacy Knowledge Base

This directory contains the RAG (Retrieval-Augmented Generation) knowledge base for the evaluator agent.

## Overview

The knowledge base provides research-backed Finnish financial literacy education standards to enhance the quality of advice evaluation in the game. It includes materials from:

- **Bank of Finland Financial Literacy Centre** - National strategy and educational resources
- **Finnish National Agency for Education** - Curriculum standards
- **Yrityskylä Program** - Junior Achievement Finland's business villages program
- **EU/OECD-INFE Framework** - Financial competence framework for youth
- **University of Helsinki & Jyväskylä** - Research on financial literacy
- **OP Financial Group** - Youth financial education initiatives
- **Helsinki Deaconess Foundation** - Taloustaito project for at-risk youth

## Files

- **finnish-financial-literacy.md** - Comprehensive knowledge base document with all sources and citations
- **knowledge-base.db** - LibSQL vector database with embeddings (generated)

## Setup

### Prerequisites

1. Node.js >= 22.13.0
2. OpenAI API key (for generating embeddings)

### Environment Variables

Create a `.env` file in the project root with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Initialize the Vector Database

Run the initialization script to chunk the knowledge base, generate embeddings, and store them:

```bash
npm run init:knowledge-base
```

Or directly:

```bash
node --env-file=.env src/mastra/rag/init-knowledge-base.ts
```

This will:
1. Read the Finnish financial literacy knowledge base
2. Chunk it into semantic sections
3. Generate embeddings using OpenAI's `text-embedding-3-small` model
4. Store embeddings in LibSQL vector database
5. Create index for similarity search

## Usage

The evaluator agent automatically has access to the knowledge base through the `queryFinnishKnowledge` tool.

### Query Examples

The tool can be queried for:
- Budgeting best practices
- Debt management principles
- Saving strategies
- Investment education standards
- Quality criteria for financial advice

### Topics

Available topic filters:
- `budgeting`
- `saving`
- `debt_management`
- `investing`
- `risk_management`
- `financial_education`
- `financial_system`
- `general`

## How It Works

1. **Evaluator Agent** receives advice to evaluate
2. **Identifies Topic** from the scenario (budgeting, saving, debt, etc.)
3. **Queries Knowledge Base** using the `queryFinnishKnowledge` tool
4. **Retrieves Relevant Standards** from Finnish financial education sources
5. **Compares Advice** against both scenario ideals and research-backed standards
6. **Cites Sources** in the evaluation feedback

## Knowledge Base Statistics

- **Source Documents**: 10+ official Finnish financial literacy sources
- **Total Characters**: ~18,000
- **Chunks**: ~36 semantic sections
- **Embedding Dimension**: 1536 (OpenAI text-embedding-3-small)
- **Search Method**: Cosine similarity

## Updating the Knowledge Base

To update the knowledge base:

1. Edit `finnish-financial-literacy.md` with new content
2. Re-run the initialization script
3. The vector database will be truncated and rebuilt

## Citations

All content in the knowledge base includes proper citations to:
- Source organization
- Publication date where available
- URLs to original materials
- Research paper references

## Cost Considerations

- **Initialization**: One-time cost for generating ~36 embeddings
- **Query**: Each query generates 1 embedding for the search
- **Model**: OpenAI `text-embedding-3-small` ($0.02 per 1M tokens)

For a knowledge base of this size, initialization costs approximately $0.0001 USD.

## Compliance

This knowledge base uses publicly available Finnish educational materials. All sources are cited and used for educational purposes in alignment with their intended public use for financial literacy education.
