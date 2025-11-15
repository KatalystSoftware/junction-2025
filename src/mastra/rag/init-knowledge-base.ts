/**
 * Initialize Finnish Financial Literacy Knowledge Base
 *
 * This script reads the Finnish financial literacy knowledge base,
 * chunks it into sections, generates embeddings, and stores them in LibSQL vector store.
 *
 * Based on Mastra vector store patterns.
 */

import { openai } from "@ai-sdk/openai";
import { LibSQLVector } from "@mastra/libsql";
import { embedMany } from "ai";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const KNOWLEDGE_BASE_PATH = path.join(
  __dirname,
  "../../../knowledge-base/finnish-financial-literacy.md",
);
const VECTOR_INDEX_NAME = "finnish_financial_literacy";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions
const EMBEDDING_DIMENSION = 1536;
const CHUNK_SIZE = 800; // characters per chunk
const CHUNK_OVERLAP = 150; // overlap between chunks

interface Chunk {
  text: string;
  metadata: {
    section: string;
    topic: string;
    source: string;
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
    saving: "saving",
    investment: "investing",
    debt: "debt_management",
    risk: "risk_management",
    "financial landscape": "financial_system",
    yrityskylä: "financial_education",
    taloustaito: "financial_education",
    strategy: "policy",
    curriculum: "education",
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
  const sourceMatch = text.match(/\*\*Source\*\*:\s*([^\n]+)/);
  if (sourceMatch) {
    return sourceMatch[1].trim();
  }

  const urlMatch = text.match(/\*\*URL\*\*:\s*([^\n]+)/);
  if (urlMatch) {
    return urlMatch[1].trim();
  }

  const citationMatch = text.match(/\*\*Citation\*\*:\s*([^\n]+)/);
  if (citationMatch) {
    return citationMatch[1].trim();
  }

  return "Finnish Financial Literacy Knowledge Base";
}

/**
 * Chunk markdown content intelligently by sections
 */
function chunkMarkdown(content: string): Chunk[] {
  const chunks: Chunk[] = [];

  // Split by major sections (## headers)
  const sectionRegex = /^##\s+(.+)$/gm;
  const sections: Array<{ title: string; content: string; start: number }> = [];

  let match;
  let lastIndex = 0;

  while ((match = sectionRegex.exec(content)) !== null) {
    if (lastIndex > 0) {
      // Save previous section
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
          source: "Finnish Financial Literacy Knowledge Base",
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

    // If section is small enough, keep it as one chunk
    if (section.content.length <= CHUNK_SIZE) {
      chunks.push({
        text: section.content,
        metadata: {
          section: section.title,
          topic,
          source,
          chunkIndex: chunkIndex++,
        },
      });
    } else {
      // Split large sections into smaller chunks
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
 * Initialize vector store with Finnish financial literacy knowledge
 */
export async function initializeKnowledgeBase() {
  console.log("🚀 Initializing Finnish Financial Literacy Knowledge Base...\n");

  // 1. Read knowledge base file
  console.log("📖 Reading knowledge base file...");
  const content = readFileSync(KNOWLEDGE_BASE_PATH, "utf-8");
  console.log(`   ✓ Loaded ${content.length} characters\n`);

  // 2. Chunk the content
  console.log("✂️  Chunking content...");
  const chunks = chunkMarkdown(content);
  console.log(`   ✓ Created ${chunks.length} chunks\n`);

  // 3. Initialize LibSQL Vector store
  console.log("🗄️  Initializing LibSQL Vector store...");
  const vectorStore = new LibSQLVector({
    id: "finnish-financial-literacy",
    connectionUrl: "file:../knowledge-base.db",
  });

  // 4. Create index if it doesn't exist
  try {
    console.log(`   Creating index "${VECTOR_INDEX_NAME}"...`);
    await vectorStore.createIndex({
      indexName: VECTOR_INDEX_NAME,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
    });
    console.log(`   ✓ Index created\n`);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log(`   ⚠️  Index already exists, truncating...\n`);
      await vectorStore.truncateIndex({ indexName: VECTOR_INDEX_NAME });
    } else {
      throw error;
    }
  }

  // 5. Generate embeddings
  console.log("🧠 Generating embeddings...");
  console.log(`   Using model: ${EMBEDDING_MODEL}`);

  const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: openai.embedding(EMBEDDING_MODEL),
  });

  console.log(`   ✓ Generated ${embeddings.length} embeddings\n`);

  // 6. Upsert embeddings to vector store
  console.log("💾 Storing embeddings in vector database...");
  const ids = await vectorStore.upsert({
    indexName: VECTOR_INDEX_NAME,
    vectors: embeddings,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      section: chunk.metadata.section,
      topic: chunk.metadata.topic,
      source: chunk.metadata.source,
      chunkIndex: chunk.metadata.chunkIndex,
    })),
  });

  console.log(`   ✓ Stored ${ids.length} embeddings\n`);

  // 7. Verify index stats
  console.log("📊 Verifying index...");
  const stats = await vectorStore.describeIndex({
    indexName: VECTOR_INDEX_NAME,
  });
  console.log(`   Index: ${VECTOR_INDEX_NAME}`);
  console.log(`   Dimensions: ${stats.dimension}`);
  console.log(`   Vector count: ${stats.count}`);
  console.log(`   Metric: ${stats.metric}`);

  console.log("\n✅ Knowledge base initialization complete!");

  return {
    chunkCount: chunks.length,
    embeddingCount: embeddings.length,
    indexStats: stats,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeKnowledgeBase()
    .then((result) => {
      console.log("\n📋 Summary:");
      console.log(`   Chunks: ${result.chunkCount}`);
      console.log(`   Embeddings: ${result.embeddingCount}`);
      console.log(`   Vectors in DB: ${result.indexStats.count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error initializing knowledge base:", error);
      process.exit(1);
    });
}
