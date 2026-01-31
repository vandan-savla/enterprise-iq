import { DynamicStructuredTool } from "@langchain/core/tools";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { z } from "zod";

export interface RetrievedDocument {
  content: string;
  metadata: {
    filename?: string;
    pageNumber?: number;
    uploadedAt?: string;
    department?: string;
  };
  score?: number;
}

export async function buildRetrieverTool() {
  const collectionName =
    process.env.QDRANT_COLLECTION ?? "enterprise-kb-documents";

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GOOGLE_API_KEY!,
  });

  // LangChain vector store (wraps Qdrant search internally)
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
      collectionName,
    }
  );

  const tool = new DynamicStructuredTool({
    name: "retrieve_kb_documents",
    description:
      "Search the internal knowledge base and return the most relevant document chunks with source information.",
    schema: z.object({
      query: z.string(),
    }),

    func: async ({ query }) => {
      try {
        console.log("LangChain similarity search:", query);

        // IMPORTANT: This is still ANN vector similarity search
        const docs = await vectorStore.similaritySearch(
          query,
          5, 
          {
            must: [
              { key: "metadata.is_active", match: { value: true } },
              {
                key: "metadata.department",
                match: { value: "Human Resources" },
              },
              {
                key: "metadata.allowed_roles",
                match: { any: ["HR"] },
              },
            ],
          }
        );

        const results: RetrievedDocument[] = docs.map((doc, i) => {

          return {
            content: doc.pageContent,
            metadata: {
              filename: doc.metadata?.filename ?? `Document ${i + 1}`,
              pageNumber: doc.metadata?.pageNumber,
              uploadedAt: doc.metadata?.uploadedAt,
              
            },
          };
        });

        return JSON.stringify({
          documents: results,
          totalFound: results.length,
        });
      } catch (err: any) {
        console.error("LangChain Qdrant search error:", err.message);

        return JSON.stringify({
          documents: [],
          totalFound: 0,
          error: err.message,
        });
      }
    },
  });

  return tool;
}
