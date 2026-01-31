
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { QdrantClient } from "@qdrant/js-client-rest";
import path from "path";
import crypto from "crypto";

type IngestInput = {
    filePath: string;
    department: string;
    is_active: boolean;
    allowed_roles: string[];
};

export const ingestData = async (input: IngestInput) => {
    console.log("Starting ingestion for:", input);
    const { filePath, department, allowed_roles, is_active } = input;

    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const docId = crypto.randomUUID();
    // ---------- Step 1: Choose loader ----------
    let loader;
    switch (ext) {
        case ".pdf":
            loader = new PDFLoader(input.filePath);
            break;
        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }

    // ---------- Step 2: Load document ----------
    let docs;
    try {
        docs = await loader.load();
        console.log(`Loaded ${docs.length} raw documents from ${fileName}`);
    } catch (err) {
        console.error("Failed to load file:", err);
        throw new Error("Unable to read or parse document file.");
    }

    // ---------- Step 3: Split into chunks ----------
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks for embedding.`);

    // ---------- Step 4: Prepare embeddings ----------
    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004",
        apiKey: process.env.GOOGLE_API_KEY,
    });


    const collectionName = "enterprise-kb-documents";
    const qdrantUrl = process.env.QDRANT_URL!;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    try {
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: qdrantUrl,
            apiKey: qdrantApiKey,
            collectionName,
        });

        // Attach useful metadata for retrieval filtering later
        // IMPORTANT: Spread original metadata to preserve filename, page numbers, etc.
        const now = new Date().toISOString();
        splitDocs.forEach((doc) => {
            const pageNumber =
                (doc.metadata?.loc as any)?.pageNumber ??
                doc.metadata?.pageNumber;

            doc.metadata = {
                ...doc.metadata,  // Preserve original metadata (filename, loc, pageNumber, etc.)
                filename: fileName,  // Explicitly set filename from input
                doc_id: docId,
                doc_type: ext,
                is_active,
                allowed_roles,
                department,
                uploadedAt: now,
                pageNumber: pageNumber,
            };
        });

        await vectorStore.addDocuments(splitDocs);
        console.log("Document chunks embedded and added to Qdrant.");

        // Create payload indexes for filtering (required by Qdrant for efficient filtering)
        const qdrantClient = new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
        const indexFields = [
            { field_name: "metadata.is_active", field_schema: "bool" as const },
            { field_name: "metadata.department", field_schema: "keyword" as const },
            { field_name: "metadata.allowed_roles", field_schema: "keyword" as const },

        ];

        for (const field of indexFields) {
            try {
                await qdrantClient.createPayloadIndex(collectionName, field);
                console.log(`Index created for ${field.field_name}`);
            } catch {
                // Index might already exist
                console.log(`Index for ${field.field_name} already exists`);
            }
        }

        return vectorStore;
    } catch (err: any) {
        console.error("Qdrant ingestion error:", err);
        throw new Error(
            `Failed to embed or insert document chunks into Qdrant`
        );
    }
};

