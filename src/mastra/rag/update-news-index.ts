/**
 * Update News Index
 *
 * This script updates the financial news index with the latest articles.
 * Should be run periodically (e.g., every 30 minutes) to keep news current.
 */

import { google } from "@ai-sdk/google";
import { LibSQLVector } from "@mastra/libsql";
import { embedMany } from "ai";
import {
  fetchFinnishFinancialNews,
  integrateNewsIntoRAG,
} from "./news-integration.ts";

const NEWS_INDEX_NAME = "financial_news";
const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSION = 768;

/**
 * Update the news index with fresh articles
 */
async function updateNewsIndex() {
  console.log("📰 Updating Financial News Index...\n");

  // Initialize vector store
  console.log("🗄️  Connecting to vector store...");
  const vectorStore = new LibSQLVector({
    id: "enhanced-financial-literacy",
    connectionUrl: "file:./knowledge-base.db",
  });
  console.log("   ✓ Connected\n");

  // Fetch latest news for all languages
  console.log("📡 Fetching latest news...");
  const languages: Array<"fi" | "sv" | "en"> = ["fi", "sv", "en"];
  const allArticles = [];

  for (const lang of languages) {
    try {
      console.log(`   Fetching ${lang.toUpperCase()} news...`);
      const newsResults = await fetchFinnishFinancialNews(
        "finance economy investment savings debt",
        lang,
        5,
      );
      allArticles.push(...newsResults.articles);
      console.log(
        `   ✓ Found ${newsResults.articles.length} ${lang.toUpperCase()} articles`,
      );
    } catch (error: any) {
      console.error(`   ⚠️  Error fetching ${lang} news:`, error.message);
    }
  }

  console.log(`\n   Total articles: ${allArticles.length}\n`);

  if (allArticles.length === 0) {
    console.log("⚠️  No news articles found. Exiting.");
    return;
  }

  // Truncate existing news index
  try {
    console.log("🗑️  Clearing old news...");
    await vectorStore.truncateIndex({ indexName: NEWS_INDEX_NAME });
    console.log("   ✓ Old news cleared\n");
  } catch (error: any) {
    if (error.message?.includes("no such table")) {
      console.log("   Creating new news index...");
      await vectorStore.createIndex({
        indexName: NEWS_INDEX_NAME,
        dimension: EMBEDDING_DIMENSION,
        metric: "cosine",
      });
      console.log("   ✓ Index created\n");
    } else {
      throw error;
    }
  }

  // Integrate news into RAG format
  console.log("📝 Preparing news articles...");
  const newsChunks = await integrateNewsIntoRAG(allArticles);
  console.log(`   ✓ Prepared ${newsChunks.length} articles\n`);

  // Generate embeddings
  console.log("🧠 Generating embeddings...");
  const { embeddings } = await embedMany({
    values: newsChunks.map((chunk) => chunk.text),
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
  });
  console.log(`   ✓ Generated ${embeddings.length} embeddings\n`);

  // Upsert to vector store
  console.log("💾 Storing news in vector database...");
  const ids = await vectorStore.upsert({
    indexName: NEWS_INDEX_NAME,
    vectors: embeddings,
    metadata: newsChunks.map((chunk) => chunk.metadata),
  });
  console.log(`   ✓ Stored ${ids.length} news articles\n`);

  // Summary
  const languageCounts = {
    fi: allArticles.filter((a) => a.language === "fi").length,
    sv: allArticles.filter((a) => a.language === "sv").length,
    en: allArticles.filter((a) => a.language === "en").length,
  };

  console.log("✅ News Index Updated Successfully!\n");
  console.log("📋 Summary:");
  console.log(`   Finnish articles: ${languageCounts.fi}`);
  console.log(`   Swedish articles: ${languageCounts.sv}`);
  console.log(`   English articles: ${languageCounts.en}`);
  console.log(`   Total: ${allArticles.length} articles`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);

  return {
    totalArticles: allArticles.length,
    languageCounts,
    timestamp: new Date(),
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateNewsIndex()
    .then((result) => {
      console.log("🎉 Update complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error updating news index:", error);
      process.exit(1);
    });
}

export { updateNewsIndex };
