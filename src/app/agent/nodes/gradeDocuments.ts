// src/app/agent/nodes/gradeDocuments.ts
import * as z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * gradeDocuments(nodeState)
 * - Expects messages to include user question and a ToolMessage with retrieved docs content.
 * - Uses structured output (Zod) to return { binaryScore: 'yes' | 'no' }
 * - Based on result, graph will choose next node ("generate" or "rewrite")
 */

const gradePrompt = ChatPromptTemplate.fromTemplate(`
    You are a grader assessing relevance of retrieved documents to a user question.

    Here are the retrieved docs:
    {context}

    User question:
    {question}

    Are these documents relevant to answer the user's question?
    Return a JSON with { "binaryScore": "yes" } if relevant or { "binaryScore": "no" } otherwise.
    `);

const gradeSchema = z.object({
    binaryScore: z.string().describe("'yes' or 'no'"),
});

export function makeGradeDocumentsNode() {
    return async function gradeDocuments(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";
        const retrievedContext = messages.at(-1)?.content ?? "";
        console.log(messages);
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY!,
            temperature: 0,
        }).withStructuredOutput(gradeSchema);

        const parsed = await gradePrompt.pipe(model).invoke({
            question,
            context: retrievedContext,
        });

        const decision = parsed.binaryScore?.toLowerCase() === "yes" ? "generate" : "rewrite";

        return {
            messages: [{ type: "system", content: decision }],
            decision,
        };
    };
}
