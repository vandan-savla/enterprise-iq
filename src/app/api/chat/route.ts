
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildAgentGraph } from "@/app/agent/graph/agentGraph";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();
        if (!query) {
            return NextResponse.json({ message: "Query is required" }, { status: 400 });
        }

        const { graph } = await buildAgentGraph();

        // initial messages: one user question


        // invoke the graph — exact method depends on LangGraph version; many examples use .invoke(input)
        // const resultState = await graph.invoke?.(input) ?? (await graph.run?.(input));
        const resultState = await graph.invoke({
            messages: [new HumanMessage(query)]
        });

        // Extract final answer from state.messages
        const messages = resultState.messages ?? resultState;

        // Debug: Log all messages to understand the flow
        console.log("📨 Total messages in state:", messages.length);
        messages.forEach((m: any, i: number) => {
            const type = m.type || m._getType?.() || "unknown";
            const hasToolCalls = m.tool_calls?.length > 0;
            const contentPreview = typeof m.content === 'string' ? m.content.slice(0, 80) : JSON.stringify(m.content)?.slice(0, 80);
            console.log(`  [${i}] ${type} | toolCalls: ${hasToolCalls} | content: ${contentPreview}...`);
        });

        // Find the LAST AI message that:
        // 1. Has actual content
        // 2. Is NOT a routing decision ("generate"/"rewrite")
        // 3. Content is longer than a simple decision (more than 20 chars)
        const finalAIMessage = [...messages]
            .reverse()
            .find((m: any) => {
                const isAI = m.type === "ai" || m._getType?.() === "ai";
                const content = m.content || "";
                const hasSubstantialContent = content.length > 20;
                const isNotRoutingDecision = content !== "generate" && content !== "rewrite";
                return isAI && hasSubstantialContent && isNotRoutingDecision;
            });

        console.log("🎯 Selected final message:", finalAIMessage?.content?.slice(0, 100));

        const finalText = finalAIMessage?.content ?? "I couldn't generate an answer. Please try again.";

        // Extract citations from tool messages - parse the structured JSON to get document metadata
        const toolMessages = messages.filter((m: any) => m.type === "tool" || m._getType?.() === "tool");

        interface Citation {
            filename: string;
            pageNumber?: number;
            uploadedAt?: string;
        }

        const citations: Citation[] = [];
        const seenFiles = new Set<string>();

        for (const toolMsg of toolMessages) {
            try {
                const content = typeof toolMsg.content === 'string' ? toolMsg.content : JSON.stringify(toolMsg.content);
                const parsed = JSON.parse(content);
                if (parsed.documents && Array.isArray(parsed.documents)) {
                    for (const doc of parsed.documents) {
                        const filename = doc.metadata?.filename;
                        // Deduplicate by filename to avoid showing same source multiple times
                        if (filename && !seenFiles.has(filename)) {
                            seenFiles.add(filename);
                            citations.push({
                                filename: filename,
                                pageNumber: doc.metadata?.pageNumber,
                                uploadedAt: doc.metadata?.uploadedAt,
                            });
                        }
                    }
                }
            } catch {
                // Fallback for non-JSON tool messages
                citations.push({ filename: toolMsg.name || "Unknown Source" });
            }
        }

        return NextResponse.json({
            answer: finalText,
            citations,
        });
    } catch (err: any) {
        console.error("Agent API error:", err);
        return NextResponse.json({ error: err.message ?? "Agent failed" }, { status: 500 });
    }
}
