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
            temperature: 0,
        }).bindTools(tools);

        // 🌟 Normalize messages for Gemini
        const response = await model.invoke(messages);

        // 🌟 LangGraph requires object with { messages: BaseMessage[] }
        return {
            messages: [response],
        };
    };
}
