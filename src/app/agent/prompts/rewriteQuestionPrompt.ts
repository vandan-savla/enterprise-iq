import { ChatPromptTemplate } from "@langchain/core/prompts";

export const rewritePrompt = ChatPromptTemplate.fromTemplate(`
Look at the input and try to reason about the underlying semantic intent.

Here is the initial question:
{question}

Formulate an improved (search-optimized) question for retrieval.
Return only the improved question as the assistant message.
`);