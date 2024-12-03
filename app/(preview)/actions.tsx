import { Message, TextStreamMessage } from "@/components/message";
import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateId } from "ai";
import {
  createAI,
  createStreamableValue,
  getMutableAIState,
  streamUI,
} from "ai/rsc";
import { ReactNode } from "react";
import { z } from "zod";
import { DocumentAnalysisView } from "@/components/document-analysis-view";
import { CaseSummaryView } from "@/components/case-summary-view";

const sendMessage = async (message: string) => {
  "use server";

  const messages = getMutableAIState<typeof AI>("messages");

  messages.update([
    ...(messages.get() as CoreMessage[]),
    { role: "user", content: message },
  ]);

  const contentStream = createStreamableValue("");
  const textComponent = <TextStreamMessage content={contentStream.value} />;

  const { value: stream } = await streamUI({
    model: openai("gpt-4"),
    system: `
      You are an AI paralegal assistant. You are friendly, approachable, and conversational while remaining professional. For example:
      - If the user asks "How are you?", respond warmly, like "I'm doing great! Thanks for asking. How about you?".
      - If the user thanks you, reply with "You're very welcome! Let me know if there's anything else I can help with."
      - Always maintain a tone that feels human, empathetic, and approachable while assisting with legal needs.
    `,
    temperature: 0.8,
    messages: messages.get() as CoreMessage[],
    text: async function* ({ content, done }) {
      if (done) {
        messages.done([
          ...(messages.get() as CoreMessage[]),
          { role: "assistant", content },
        ]);

        contentStream.done();
      } else {
        contentStream.update(content);
      }

      return textComponent;
    },
    tools: {
      analyzeDocument: {
        description: "Analyze a legal document and provide insights.",
        parameters: z.object({
          documentText: z.string(),
        }),
        generate: async function* ({ documentText }) {
          const toolCallId = generateId();

          messages.done([
            ...(messages.get() as CoreMessage[]),
            {
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId,
                  toolName: "analyzeDocument",
                  args: { documentText },
                },
              ],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolName: "analyzeDocument",
                  toolCallId,
                  result: `The analysis of the document is now displayed on the screen.`,
                },
              ],
            },
          ]);

          return (
            <Message
              role="assistant"
              content={<DocumentAnalysisView documentText={documentText} />}
            />
          );
        },
      },
      summarizeCaseLaw: {
        description: "Summarize case law based on a provided case name or details.",
        parameters: z.object({
          caseName: z.string(),
        }),
        generate: async function* ({ caseName }) {
          const toolCallId = generateId();
      
          messages.done([
            ...(messages.get() as CoreMessage[]),
            {
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId,
                  toolName: "summarizeCaseLaw",
                  args: { caseName },
                },
              ],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolName: "summarizeCaseLaw",
                  toolCallId,
                  result: `A summary of the case law for ${caseName} is now displayed.`,
                },
              ],
            },
          ]);
      
          return (
            <Message
              role="assistant"
              content={<CaseSummaryView caseName={caseName} />}
            />
          );
        },
      },
      
      explainLegalTerm: {
        description: "Explain a specific legal term or concept.",
        parameters: z.object({
          term: z.string(),
        }),
        generate: async function* ({ term }) {
          const toolCallId = generateId();

          const explanation = `**${term}**: This is a placeholder explanation for the term.`;

          messages.done([
            ...(messages.get() as CoreMessage[]),
            {
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId,
                  toolName: "explainLegalTerm",
                  args: { term },
                },
              ],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolName: "explainLegalTerm",
                  toolCallId,
                  result: explanation,
                },
              ],
            },
          ]);

          return (
            <Message
              role="assistant"
              content={explanation}
            />
          );
        },
      },
    },
  });

  return stream;
};

export type UIState = Array<ReactNode>;

export type AIState = {
  chatId: string;
  messages: Array<CoreMessage>;
};

export const AI = createAI<AIState, UIState>({
  initialAIState: {
    chatId: generateId(),
    messages: [],
  },
  initialUIState: [],
  actions: {
    sendMessage,
  },
  onSetAIState: async ({ state, done }) => {
    "use server";

    if (done) {
      // Save to database
    }
  },
});
