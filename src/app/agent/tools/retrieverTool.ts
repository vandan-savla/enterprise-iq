// src/app/agent/tools/retrieverTool.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { z } from "zod";

// Interface for retrieved document with metadata
export interface RetrievedDocument {
    content: string;
    metadata: {
        filename: string;
        pageNumber?: number;
        uploadedAt?: string;
    };
}

export async function buildRetrieverTool() {
    const collectionName = process.env.QDRANT_COLLECTION ?? "enterprise-kb-documents";
    const qdrantUrl = process.env.QDRANT_URL!;
    const qdrantApiKey = process.env.QDRANT_API_KEY!;
    const googleApiKey = process.env.GOOGLE_API_KEY!;

    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004",
        apiKey: googleApiKey,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: qdrantUrl,
        apiKey: qdrantApiKey,
        collectionName,
    });

    const retriever = vectorStore.asRetriever(5);

    // Custom tool that returns structured data with metadata
    const tool = new DynamicStructuredTool({
        name: "retrieve_kb_documents",
        description: "Search the internal knowledge base and return the most relevant document chunks with source information.",
        schema: z.object({
            query: z.string().describe("The search query to find relevant documents"),
        }),
        func: async ({ query }) => {
            console.log("🔍 Retrieving documents for query:", query);

            const docs = await retriever.invoke(query);

            console.log(`📚 Retrieved ${docs.length} documents`);

            // Format results with metadata for citations
            const results: RetrievedDocument[] = docs.map((doc, index) => ({
                content: doc.pageContent,
                metadata: {
                    filename: doc.metadata?.filename || `Document ${index + 1}`,
                    pageNumber: doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber,
                    uploadedAt: doc.metadata?.uploadedAt,
                }
            }));

            // Return as structured JSON string for the tool message
            return JSON.stringify({
                documents: results,
                totalFound: results.length,
            });
        },
    });

    return tool;
}
