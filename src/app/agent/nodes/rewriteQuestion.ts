// src/app/agent/nodes/rewriteQuestion.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { rewritePrompt } from "../prompts/rewriteQuestionPrompt";

/**
 * rewrite(state) - returns improved question in an AIMessage
 */


export function makeRewriteNode() {
    return async function rewrite(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-3-flash-preview",
            apiKey: process.env.GOOGLE_API_KEY!,
        });

        const response = await rewritePrompt.pipe(model).invoke({ question });
        return { messages: [response] };
    };
}
