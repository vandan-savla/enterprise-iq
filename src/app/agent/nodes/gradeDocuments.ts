// src/app/agent/nodes/gradeDocuments.ts
import * as z from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage } from "@langchain/core/messages";
import { gradePrompt } from "../prompts/gradeDocumentPrompt";

/**
 * gradeDocuments(nodeState)
 * - Expects messages to include user question and a ToolMessage with retrieved docs content.
 * - Uses structured output (Zod) to return { binaryScore: 'yes' | 'no' }
 * - Based on result, graph will choose next node ("generate" or "rewrite")
 * 
 * Special cases:
 * - No documents found → Proceed to "generate" (which handles fallback response)
 */

const gradeSchema = z.object({
    binaryScore: z.string().describe("'yes' or 'no'"),
});

export function makeGradeDocumentsNode() {
    return async function gradeDocuments(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";
        const retrievedContext = messages.at(-1)?.content ?? "";

        console.log("Grading documents...");
        console.log("Question:", question);

        // Check if we have any documents to grade
        let documentCount = 0;

        const parsed = JSON.parse(retrievedContext);
        documentCount = parsed.documents && Array.isArray(parsed.documents)
            ? parsed.documents.length
            : (retrievedContext.trim().length > 0 ? 1 : 0);


        // If no documents found, skip grading and proceed to generate (fallback response)
        if (documentCount === 0) {
            console.log("⚠️ No documents to grade - proceeding to fallback response");
            return {
                messages: [new AIMessage({ content: "generate" })],
            };
        }

        console.log("Documents to grade:", documentCount);
        console.log("Context preview:", retrievedContext.slice(0, 200));

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-3-flash-preview",
            apiKey: process.env.GOOGLE_API_KEY!,
        }).withStructuredOutput(gradeSchema);

        const parsedContent = await gradePrompt.pipe(model).invoke({
            question,
            context: retrievedContext,
        });

        const decision = parsedContent.binaryScore?.toLowerCase() === "yes" ? "generate" : "rewrite";

        console.log("📊 Grading decision:", decision);

        return {
            messages: [new AIMessage({ content: decision })],
        };
    };
} 
