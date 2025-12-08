
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
        const finalAIMessage = messages?.slice?.(-1)[0] ?? null;
        const finalText = finalAIMessage?.content ?? finalAIMessage?.text ?? "";

        // Extract any tool call traces and tool results for citations
        const toolCalls = messages
            .flatMap((m: any) => (m.tool_calls ? [m.tool_calls] : []))
            .flat();

        // collect tool result contents as citations if ToolMessage existed
        const citations = messages
            .filter((m: any) => m.type === "tool")
            .map((t: any) => ({ excerpt: (t.content || "").slice(0, 300), meta: t.tool_call_args }));

        return NextResponse.json({
            answer: finalText,
            toolCalls,
            citations,
        });
    } catch (err: any) {
        console.error("Agent API error:", err);
        return NextResponse.json({ error: err.message ?? "Agent failed" }, { status: 500 });
    }
}
