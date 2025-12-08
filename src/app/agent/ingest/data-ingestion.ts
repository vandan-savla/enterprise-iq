
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import path from "path";

export const ingestData = async (filePath: string) => {
    console.log("Starting ingestion for:", filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // ---------- Step 1: Choose loader ----------
    let loader;
    switch (ext) {
        case ".pdf":
            loader = new PDFLoader(filePath);
            break;
        case ".docx":
            loader = new DocxLoader(filePath);
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


    console.log(embeddings)

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
        const now = new Date().toISOString();
        splitDocs.forEach((doc) => {
            doc.metadata = {
                ...(doc.metadata || {}),
                filename: fileName,
                uploadedAt: now,
            };
        });

        await vectorStore.addDocuments(splitDocs);
        console.log("Document chunks embedded and added to Qdrant.");
        console.log(vectorStore);
        return vectorStore;
    } catch (err: any) {
        console.error("Qdrant ingestion error:", err);
        throw new Error(
            `Failed to embed or insert document chunks into Qdrant`
        );
    }
};
