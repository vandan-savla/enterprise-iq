// src/app/agent/nodes/generateAnswer.ts
import { answerPrompt } from "../prompts/generateAnswer";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * generateAnswer(state)
 * - Expects messages: [HumanMessage(question), ToolMessage(retrieved docs)...]
 * - Returns: { messages: [AIMessage] }
 *
 * The AI should produce final plain-text answer and a JSON block with action_suggestion if needed.
 */

export function makeGenerateAnswerNode() {
    return async function generateAnswer(state: any) {
        const messages = state.messages as any[];
        const question = messages.at(0)?.content ?? "";

        // Filter ONLY tool messages (retrieved docs) for context
        const toolMessages = messages.filter((m: any) => m.type === "tool" || m._getType?.() === "tool");

        // Parse the structured JSON from the retriever tool to extract document content
        let retrieved = "";
        for (const toolMsg of toolMessages) {
            try {
                const content = typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
                const parsed = JSON.parse(content);
                if (parsed.documents && Array.isArray(parsed.documents)) {
                    retrieved = parsed.documents
                        .map((doc: any) => doc.content)
                        .join("\n\n---\n\n");
                }
            } catch {
                // Fallback to raw content if not JSON
                const fallbackContent = typeof toolMsg.content === 'string' ? toolMsg.content : '';
                retrieved += fallbackContent + "\n\n";
            }
        }

        console.log("📝 Generating answer...");
        console.log("Question:", question);
        console.log("Tool messages found:", toolMessages.length);
        console.log("Retrieved context length:", retrieved.length);
        console.log("Context preview:", retrieved.slice(0, 300));

        if (!retrieved || retrieved.length === 0) {
            console.warn("⚠️ No context found for answer generation!");
        }

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-3-flash-preview",
            apiKey: process.env.GOOGLE_API_KEY!,
        });

        const response = await answerPrompt.pipe(model).invoke({
            question,
            context: retrieved,
        });

        console.log("Answer generated:", response.content?.slice(0, 100));

        return { messages: [response] };
    };
}
