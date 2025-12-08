// src/app/agent/nodes/generateAnswer.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * generateAnswer(state)
 * - Expects messages: [HumanMessage(question), ToolMessage(retrieved docs)...]
 * - Returns: { messages: [AIMessage] }
 *
 * The AI should produce final plain-text answer and a JSON block with action_suggestion if needed.
 */

const answerPrompt = ChatPromptTemplate.fromTemplate(`
        You are KnowAgent. Use ONLY the provided context (below) to answer the user's question concisely.
            If the question suggests an action (create ticket, schedule meeting), include at the end a JSON block like:

            \`\`\`json
            {{ "action_suggestion": {{ "action_type": "ticket"|"calendar_event"|"none", "payload": {{...}}, "risk_score": 1 }} }}
            \`\`\`

            Context:
            {{context}}

            User question:
            {{question}}

            Answer:
`);

export function makeGenerateAnswerNode() {
    return async function generateAnswer(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";
        // gather context from last ToolMessage / retrieved docs
        const retrieved = messages.filter((m: any) => m.type === "tool")?.map((t: any) => t.content).join("\n\n") ?? messages.at(-1)?.content ?? "";

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_API_KEY!,
            temperature: 0.0,
        });

        const response = await answerPrompt.pipe(model).invoke({
            question,
            context: retrieved,
        });

        return { messages: [response] };
    };
}
