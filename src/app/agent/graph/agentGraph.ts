import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";

import { makeGenerateQueryOrRespond } from "../nodes/generateQueryOrRespond";
import { makeGradeDocumentsNode } from "../nodes/gradeDocuments";
import { makeRewriteNode } from "../nodes/rewriteQuestion";
import { makeGenerateAnswerNode } from "../nodes/generateAnswer";
import { buildRetrieverTool } from "../tools/retrieverTool"

/**
 * The State shape used by our LangGraph.
 * Each node will receive `state.messages` (an array of Message-like objects)
 */
// export interface GraphState {
//     messages: any[];
//     lastNodeResult?: string;
// }

/**
 * Build and compile the Agentic RAG graph.
 */

import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

export async function buildAgentGraph() {
    // --- 🧰 1. Initialize tools ---
    const retrieverTool = await buildRetrieverTool();
    const tools = [retrieverTool];

    // --- 🧠 2. Build node functions ---
    const generateQueryOrRespond = makeGenerateQueryOrRespond(tools);
    const gradeDocuments = makeGradeDocumentsNode();
    const rewrite = makeRewriteNode();
    const generateAnswer = makeGenerateAnswerNode();

    // --- ⚙️ 3. Create the Tool Node ---
    const toolNode = new ToolNode(tools);

    // --- 🧩 4. Conditional function to decide if retrieval is needed ---
    function shouldRetrieve(state: { messages: any; }) {
        const { messages } = state;
        const lastMessage = messages.at(-1);

        if (AIMessage.isInstance(lastMessage) && lastMessage.tool_calls?.length) {
            // model requested a tool (retrieval)
            return "retrieve";
        }

        return END;
    }

    // --- 🧩 5. Routing function after grading documents ---
    function routeAfterGrading(state: { messages: any; }) {
        const { messages } = state;
        const lastMessage = messages.at(-1);

        // gradeDocuments puts the decision ("generate" or "rewrite") in an AIMessage
        const decision = lastMessage?.content;
        console.log("🔀 Routing after grading, decision:", decision);

        if (decision === "generate" || decision === "rewrite") {
            return decision;
        }
        return "generate"; // fallback to generate if decision unclear
    }

    const builder = new StateGraph(GraphState)
        // Nodes
        .addNode("generateQueryOrRespond", generateQueryOrRespond)
        .addNode("retrieve", toolNode)
        .addNode("gradeDocuments", gradeDocuments)
        .addNode("rewrite", rewrite)
        .addNode("generate", generateAnswer)

        // Edges
        .addEdge(START, "generateQueryOrRespond")

        // After generateQueryOrRespond: check if tool was called
        .addConditionalEdges("generateQueryOrRespond", shouldRetrieve)

        // After retrieve: ALWAYS grade documents (CRITICAL FIX)
        .addEdge("retrieve", "gradeDocuments")

        // After grading: route based on relevance
        .addConditionalEdges("gradeDocuments", routeAfterGrading)

        // After rewrite: try again with improved question
        .addEdge("rewrite", "generateQueryOrRespond")

        // After generate: done
        .addEdge("generate", END);

    // --- 6️⃣ Compile and return ---
    const graph = builder.compile();
    return { graph, tools };

}
