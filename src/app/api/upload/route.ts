import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ingestData } from "@/app/agent/ingest/data-ingestion";
import { UploadDocumentSchema } from "@/app/types/uploadDocumentSchema";

export type ApiResponse<T> = {
    data: T | null;
    message: string;
    status: "success" | "error";
};

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null;

    try {
        const form = await request.formData();
        const file = form.get("file") as File | null;

        if (!file) {
            const res: ApiResponse<null> = {
                data: null,
                message: "File is required in form-data under key 'file'.",
                status: "error",
            };
            return NextResponse.json(res, { status: 400 });
        }

        // --- Step 1: Validate file metadata
        try {
            
            const parsed = UploadDocumentSchema.safeParse({
                filename: file.name,
                mimetype: file.type,
                size: file.size,
            });
            if (!parsed.success) {
                const res: ApiResponse<null> = {
                    data: null,
                    message: `File validation failed. ${parsed.error.errors[0].message}`,
                    status: "error",
                };
                console.error("Validation errors:", parsed.error.errors);
                return NextResponse.json(res, { status: 400 });
            }
        } catch (err) {
            console.error("Validation threw error:", err);
            const res: ApiResponse<null> = {
                data: null,
                message: "Internal validation error while processing file metadata.",
                status: "error",
            };
            return NextResponse.json(res, { status: 500 });
        }

        // --- Step 2: Save file to disk
        try {
            const uploadsDir = path.join(process.cwd(), "uploads");
            await fs.mkdir(uploadsDir, { recursive: true });

            const buffer = Buffer.from(await file.arrayBuffer());
            tempFilePath = path.join(uploadsDir, file.name);
            await fs.writeFile(tempFilePath, buffer);

            console.log(` File saved locally at: ${tempFilePath}`);
        } catch (err) {
            console.error("File saving failed:", err);
            const res: ApiResponse<null> = {
                data: null,
                message: "Failed to save uploaded file on server.",
                status: "error",
            };
            return NextResponse.json(res, { status: 500 });
        }

        // --- Step 3: Ingest into vector store
        try {
            await ingestData(tempFilePath);
            console.log(" Ingestion completed successfully");
        } catch (err: any) {
            console.error("Ingestion failed:", err);
            const res: ApiResponse<null> = {
                data: null,
                message: `${err.message || "Unknown error"}`,
                status: "error",
            };
            return NextResponse.json(res, { status: 500 });
        }

        // --- Step 4: Success response
        const res: ApiResponse<{ filePath: string }> = {
            data: { filePath: tempFilePath },
            message: "Document uploaded and indexed successfully.",
            status: "success",
        };
        return NextResponse.json(res, { status: 200 });
    } catch (error: any) {
        console.error("Unhandled error in upload route:", error);
        const res: ApiResponse<null> = {
            data: null,
            message: `${error.message || "Unknown error"}`,
            status: "error",
        };
        return NextResponse.json(res, { status: 500 });
    }
}
