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
 */



const gradeSchema = z.object({
    binaryScore: z.string().describe("'yes' or 'no'"),
});

export function makeGradeDocumentsNode() {
    return async function gradeDocuments(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";
        const retrievedContext = messages.at(-1)?.content ?? "";

        console.log("🔍 Grading documents...");
        console.log("Question:", question);
        console.log("Context preview:", retrievedContext.slice(0, 200));

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY!,
        }).withStructuredOutput(gradeSchema);

        const parsed = await gradePrompt.pipe(model).invoke({
            question,
            context: retrievedContext,
        });

        const decision = parsed.binaryScore?.toLowerCase() === "yes" ? "generate" : "rewrite";

        console.log("📊 Grading decision:", decision);

        return {
            messages: [new AIMessage({ content: decision })],
        };
    };
} 
