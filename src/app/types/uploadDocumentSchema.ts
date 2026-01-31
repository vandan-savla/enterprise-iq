// import { z } from "zod";

// export const UploadDocumentSchema = z.object({
//   filename: z.string().min(1),
//   mimetype: z.enum(["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
//   size: z.number().max(50_000_000), // 50MB max
// });

import { z } from "zod";

export const UploadDocumentSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.enum([
    "application/pdf",
    "text/plain",
  ]),
  size: z.number().max(50_000_000),

  is_active: z.boolean().default(true),
  department: z.string().min(1),
  allowed_roles: z.array(z.string()).min(1),
});
