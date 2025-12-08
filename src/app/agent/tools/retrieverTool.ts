// src/app/agent/tools/retrieverTool.ts
import { createRetrieverTool } from "@langchain/classic/tools/retriever";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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

    const tool = createRetrieverTool(retriever, {
        name: "retrieve_kb_documents",
        description: "Search the internal knowledge base and return the most relevant document chunks.",
    });

    return tool;
}
