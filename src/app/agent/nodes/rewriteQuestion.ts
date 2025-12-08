// src/app/agent/nodes/rewriteQuestion.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * rewrite(state) - returns improved question in an AIMessage
 */
const rewritePrompt = ChatPromptTemplate.fromTemplate(`
Look at the input and try to reason about the underlying semantic intent.

Here is the initial question:
{{question}}

Formulate an improved (search-optimized) question for retrieval.
Return only the improved question as the assistant message.
`);

export function makeRewriteNode() {
    return async function rewrite(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY!,
            temperature: 0,
        });

        const response = await rewritePrompt.pipe(model).invoke({ question });
        return { messages: [response] };
    };
}
