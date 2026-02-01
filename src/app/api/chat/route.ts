// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildAgentGraph } from "@/app/agent/graph/agentGraph";
import { HumanMessage } from "@langchain/core/messages";
import { ApiResponse, Citation, ChatResponseData } from "@/app/types/apiResponse";

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        // Validate query
        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json<ApiResponse<null>>({
                data: null,
                message: "Query is required",
                status: "error",
            }, { status: 400 });
        }

        const { graph } = await buildAgentGraph();

        const resultState = await graph.invoke({
            messages: [new HumanMessage(query.trim())],
        });

        // Extract final answer from state.messages
        const messages = resultState.messages ?? resultState;

        console.log("Total messages in state:", messages);

        // Find the LAST AI message with substantial content (not routing decisions)
        const finalAIMessage = [...messages]
            .reverse()
            .find((m: any) => {
                const isAI = m.type === "ai" || m._getType?.() === "ai";
                const content = m.content || "";
                const hasSubstantialContent = content.length > 20;
                const isNotRoutingDecision = content !== "generate" && content !== "rewrite";
                return isAI && hasSubstantialContent && isNotRoutingDecision;
            });

        console.log("Selected final message:", finalAIMessage?.content?.slice?.(0, 100));


        const finalText = finalAIMessage?.content ?? "I couldn't find relevant information for your query. Please try again later";
        // Extract citations from tool messages
        const toolMessages = messages.filter((m: any) => m.type === "tool" || m._getType?.() === "tool");

        const citations: Citation[] = [];
        const seenFiles = new Set<string>();

        for (const toolMsg of toolMessages) {

            const content = typeof toolMsg.content === "string" ? toolMsg.content : JSON.stringify(toolMsg.content);
            const parsed = JSON.parse(content);
            if (parsed.documents && Array.isArray(parsed.documents)) {
                for (const doc of parsed.documents) {
                    const filename = doc.metadata?.filename;
                    if (filename && !seenFiles.has(filename)) {
                        seenFiles.add(filename);
                        citations.push({
                            filename,
                            pageNumber: doc.metadata?.pageNumber,
                            uploadedAt: doc.metadata?.uploadedAt,
                        });
                    }
                }
            }

        }

        // Return structured response
        return NextResponse.json<ApiResponse<ChatResponseData>>({
            data: {
                answer: typeof finalText === "string"
                    ? finalText
                    : Array.isArray(finalText)
                        ? finalText.map((block: any) => (typeof block === "string" ? block : block.text ?? "")).join("")
                        : String(finalText),
                citations,
            },
            message: "Chat completed successfully",
            status: "success",

        }, { status: 200 });

    } catch (err: any) {
        console.error("Agent API error:", err);
        return NextResponse.json<ApiResponse<null>>({
            data: null,
            message: err.message ?? "An error occurred while processing your request",
            status: "error",
        }, { status: 500 });
    }
}
