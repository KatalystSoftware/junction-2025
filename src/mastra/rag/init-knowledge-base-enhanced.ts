/**
 * Enhanced Multi-language Knowledge Base Initialization
 *
 * This script initializes the knowledge base with support for multiple languages:
 * - Finnish (fi)
 * - Swedish (sv)
 * - English (en)
 *
 * It also integrates recent news articles for up-to-date information.
 */

import { google } from "@ai-sdk/google";
import { LibSQLVector } from "@mastra/libsql";
import { embedMany } from "ai";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchFinnishFinancialNews,
  integrateNewsIntoRAG,
} from "./news-integration.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const KNOWLEDGE_BASES = [
  {
    language: "fi",
    path: path.join(
      __dirname,
      "../../../knowledge-base/finnish-financial-literacy.md",
    ),
    indexName: "finnish_financial_literacy",
  },
  {
    language: "sv",
    path: path.join(
      __dirname,
      "../../../knowledge-base/swedish-financial-literacy.md",
    ),
    indexName: "swedish_financial_literacy",
  },
  {
    language: "en",
    path: path.join(
      __dirname,
      "../../../knowledge-base/english-financial-literacy.md",
    ),
    indexName: "english_financial_literacy",
  },
];

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSION = 768;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

interface Chunk {
  text: string;
  metadata: {
    section: string;
    topic: string;
    source: string;
    language: string;
    chunkIndex: number;
  };
}

/**
 * Extract section from markdown heading
 */
function extractSection(text: string, position: number): string {
  const beforeText = text.substring(0, position);
  const headingMatch = beforeText.match(/#+\s+([^\n]+)$/m);
  return headingMatch ? headingMatch[1].trim() : "Introduction";
}

/**
 * Extract topic tags from section
 */
function extractTopic(section: string): string {
  const topicMap: Record<string, string> = {
    budgeting: "budgeting",
    budgetering: "budgeting",
    budget: "budgeting",
    saving: "saving",
    sparande: "saving",
    spar: "saving",
    investment: "investing",
    investeringar: "investing",
    investing: "investing",
    debt: "debt_management",
    skuld: "debt_management",
    risk: "risk_management",
    försäkring: "risk_management",
    insurance: "risk_management",
    "financial landscape": "financial_system",
    "financial system": "financial_system",
    yrityskylä: "financial_education",
    taloustaito: "financial_education",
    strategy: "policy",
    curriculum: "education",
    pension: "retirement",
    tax: "tax_planning",
  };

  const lowerSection = section.toLowerCase();
  for (const [keyword, topic] of Object.entries(topicMap)) {
    if (lowerSection.includes(keyword)) {
      return topic;
    }
  }
  return "general";
}

/**
 * Extract source citations from text
 */
function extractSource(text: string): string {
  const patterns = [
    /\*\*Source\*\*:\s*([^\n]+)/,
    /\*\*Källa\*\*:\s*([^\n]+)/,
    /\*\*URL\*\*:\s*([^\n]+)/,
    /\*\*Citation\*\*:\s*([^\n]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "Financial Literacy Knowledge Base";
}

/**
 * Chunk markdown content intelligently by sections
 */
function chunkMarkdown(content: string, language: string): Chunk[] {
  const chunks: Chunk[] = [];

  // Split by major sections (## headers)
  const sectionRegex = /^##\s+(.+)$/gm;
  const sections: Array<{ title: string; content: string; start: number }> = [];

  let match;
  let lastIndex = 0;

  while ((match = sectionRegex.exec(content)) !== null) {
    if (lastIndex > 0) {
      const prevMatch = sections[sections.length - 1];
      prevMatch.content = content
        .substring(prevMatch.start, match.index)
        .trim();
    }

    sections.push({
      title: match[1].trim(),
      content: "",
      start: match.index,
    });

    lastIndex = match.index;
  }

  // Handle last section
  if (sections.length > 0) {
    const lastSection = sections[sections.length - 1];
    lastSection.content = content.substring(lastSection.start).trim();
  }

  // If no sections found, fallback to simple chunking
  if (sections.length === 0) {
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < content.length) {
      const chunkEnd = Math.min(currentPosition + CHUNK_SIZE, content.length);
      const chunkText = content.substring(currentPosition, chunkEnd);

      chunks.push({
        text: chunkText.trim(),
        metadata: {
          section: "Introduction",
          topic: "general",
          source: "Financial Literacy Knowledge Base",
          language,
          chunkIndex,
        },
      });

      currentPosition += CHUNK_SIZE - CHUNK_OVERLAP;
      chunkIndex++;
    }

    return chunks;
  }

  // Process each section
  let chunkIndex = 0;
  for (const section of sections) {
    const topic = extractTopic(section.title);
    const source = extractSource(section.content);

    if (section.content.length <= CHUNK_SIZE) {
      chunks.push({
        text: section.content,
        metadata: {
          section: section.title,
          topic,
          source,
          language,
          chunkIndex: chunkIndex++,
        },
      });
    } else {
      let pos = 0;
      while (pos < section.content.length) {
        const end = Math.min(pos + CHUNK_SIZE, section.content.length);
        const chunkText = section.content.substring(pos, end);

        chunks.push({
          text: chunkText.trim(),
          metadata: {
            section: section.title,
            topic,
            source,
            language,
            chunkIndex: chunkIndex++,
          },
        });

        pos += CHUNK_SIZE - CHUNK_OVERLAP;
      }
    }
  }

  return chunks;
}

/**
 * Initialize a single language knowledge base
 */
async function initializeLanguageKnowledgeBase(
  filePath: string,
  indexName: string,
  language: string,
  vectorStore: LibSQLVector,
) {
  console.log(`\n📖 Processing ${language.toUpperCase()} knowledge base...`);

  // Read knowledge base file
  const content = readFileSync(filePath, "utf-8");
  console.log(`   ✓ Loaded ${content.length} characters`);

  // Chunk the content
  const chunks = chunkMarkdown(content, language);
  console.log(`   ✓ Created ${chunks.length} chunks`);

  // Create index if it doesn't exist
  try {
    console.log(`   Creating index "${indexName}"...`);
    await vectorStore.createIndex({
      indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
    });
    console.log(`   ✓ Index created`);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log(`   ⚠️  Index already exists, truncating...`);
      await vectorStore.truncateIndex({ indexName });
    } else {
      throw error;
    }
  }

  // Generate embeddings
  console.log(`   🧠 Generating embeddings...`);
  const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
  });
  console.log(`   ✓ Generated ${embeddings.length} embeddings`);

  // Upsert embeddings
  console.log(`   💾 Storing embeddings...`);
  const ids = await vectorStore.upsert({
    indexName,
    vectors: embeddings,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      section: chunk.metadata.section,
      topic: chunk.metadata.topic,
      source: chunk.metadata.source,
      language: chunk.metadata.language,
      chunkIndex: chunk.metadata.chunkIndex,
    })),
  });
  console.log(`   ✓ Stored ${ids.length} embeddings`);

  return {
    language,
    chunkCount: chunks.length,
    embeddingCount: embeddings.length,
  };
}

/**
 * Initialize news index with recent articles
 */
async function initializeNewsIndex(vectorStore: LibSQLVector) {
  console.log(`\n📰 Initializing news index...`);

  const newsIndexName = "financial_news";

  // Create news index
  try {
    await vectorStore.createIndex({
      indexName: newsIndexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
    });
    console.log(`   ✓ News index created`);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log(`   ⚠️  News index already exists, truncating...`);
      await vectorStore.truncateIndex({ indexName: newsIndexName });
    } else {
      throw error;
    }
  }

  // Fetch recent news for all languages
  const languages: Array<"fi" | "sv" | "en"> = ["fi", "sv", "en"];
  const allArticles = [];

  for (const lang of languages) {
    const newsResults = await fetchFinnishFinancialNews("finance", lang, 5);
    allArticles.push(...newsResults.articles);
  }

  if (allArticles.length === 0) {
    console.log(`   ⚠️  No news articles found`);
    return {
      articleCount: 0,
      embeddingCount: 0,
    };
  }

  // Integrate news into RAG format
  const newsChunks = await integrateNewsIntoRAG(allArticles);
  console.log(`   ✓ Prepared ${newsChunks.length} news articles`);

  // Generate embeddings for news
  console.log(`   🧠 Generating embeddings for news...`);
  const { embeddings } = await embedMany({
    values: newsChunks.map((chunk) => chunk.text),
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
  });
  console.log(`   ✓ Generated ${embeddings.length} embeddings`);

  // Upsert news embeddings
  console.log(`   💾 Storing news embeddings...`);
  const ids = await vectorStore.upsert({
    indexName: newsIndexName,
    vectors: embeddings,
    metadata: newsChunks.map((chunk) => chunk.metadata),
  });
  console.log(`   ✓ Stored ${ids.length} news embeddings`);

  return {
    articleCount: allArticles.length,
    embeddingCount: embeddings.length,
  };
}

/**
 * Initialize complete enhanced knowledge base
 */
export async function initializeEnhancedKnowledgeBase() {
  console.log("🚀 Initializing Enhanced Multi-language Knowledge Base...\n");

  // Initialize LibSQL Vector store
  console.log("🗄️  Initializing LibSQL Vector store...");
  const vectorStore = new LibSQLVector({
    id: "enhanced-financial-literacy",
    connectionUrl: "file:./knowledge-base.db",
  });
  console.log("   ✓ Vector store initialized\n");

  const results = [];

  // Initialize each language knowledge base
  for (const kb of KNOWLEDGE_BASES) {
    const result = await initializeLanguageKnowledgeBase(
      kb.path,
      kb.indexName,
      kb.language,
      vectorStore,
    );
    results.push(result);
  }

  // Initialize news index
  const newsResult = await initializeNewsIndex(vectorStore);

  console.log("\n✅ Enhanced Knowledge Base Initialization Complete!");
  console.log("\n📋 Summary:");
  console.log("   Language Knowledge Bases:");
  results.forEach((r) => {
    console.log(
      `     - ${r.language.toUpperCase()}: ${r.chunkCount} chunks, ${r.embeddingCount} embeddings`,
    );
  });
  console.log(
    `   News Articles: ${newsResult.articleCount} articles, ${newsResult.embeddingCount} embeddings`,
  );

  const totalChunks = results.reduce((sum, r) => sum + r.chunkCount, 0);
  const totalEmbeddings =
    results.reduce((sum, r) => sum + r.embeddingCount, 0) +
    newsResult.embeddingCount;

  console.log(
    `   \n   Total: ${totalChunks} chunks, ${totalEmbeddings} embeddings`,
  );

  return {
    languages: results,
    news: newsResult,
    totalChunks,
    totalEmbeddings,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeEnhancedKnowledgeBase()
    .then((result) => {
      console.log("\n🎉 Success!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error initializing knowledge base:", error);
      process.exit(1);
    });
}
