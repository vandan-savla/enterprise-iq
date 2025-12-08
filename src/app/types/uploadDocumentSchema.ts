import { z } from "zod";

export const UploadDocumentSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.enum(["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  size: z.number().max(50_000_000), // 50MB max
});