import { ChatPromptTemplate } from "@langchain/core/prompts";


export const gradePrompt = ChatPromptTemplate.fromTemplate(`
    You are a grader assessing relevance of retrieved documents to a user question.

    Here are the retrieved docs:
    {context}

    User question:
    {question}

    If the document contains keywords or semantic meaning related to the user question, grade it as relevant.
    Give a binary score 'yes' or 'no' to indicate whether the document is relevant to the question.
    `);