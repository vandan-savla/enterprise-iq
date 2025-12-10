// src/app/agent/nodes/generateQueryOrRespond.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, BaseMessage } from "@langchain/core/messages";

export function makeGenerateQueryOrRespond(tools: any[]) {
    return async function generateQueryOrRespond(state: { messages: BaseMessage[] }) {

        // GUARANTEE messages is an array
        const messages = Array.isArray(state.messages) ? state.messages : [];

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY!,
        }).bindTools(tools);

        console.log("🤖 Deciding whether to retrieve or respond...");
        console.log("User query:", messages.at(0)?.content);

        // 🌟 Normalize messages for Gemini
        const response = await model.invoke(messages);

        console.log("Tool calls requested:", response.tool_calls?.length ?? 0);

        // 🌟 LangGraph requires object with { messages: BaseMessage[] }
        return {
            messages: [response],
        };
    };
}
