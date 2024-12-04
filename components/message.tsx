"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { ReactNode } from "react";
import { StreamableValue, useStreamableValue } from "ai/rsc";
import { Markdown } from "./markdown";

export const TextStreamMessage = ({
  content,
}: {
  content: StreamableValue;
}) => {
  const [text] = useStreamableValue(content);

  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 max-w-4xl w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0 bg-gray-200 rounded-full text-gray-500">
        <BotIcon />
      </div>

      <div className="flex flex-col gap-1 max-w-4xl w-full">
        <div className="bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 p-4 rounded-lg shadow-md">
          <Markdown>{text}</Markdown>
        </div>
      </div>
    </motion.div>
  );
};

export const Message = ({
  role,
  content,
}: {
  role: "assistant" | "user";
  content: string | ReactNode;
}) => {
  // Function to personalize and format assistant responses
  const getFormattedResponse = (content: string) => {
    if (role === "assistant") {
      if (typeof content === "string") {
        // Add specific legal context and disclaimers
        const disclaimer = "\n\n**Disclaimer:** I am an AI paralegal assistant and cannot provide legal advice. Please consult a licensed attorney for definitive guidance.";
        if (content.toLowerCase().includes("what is force majeure")) {
          return `**Force Majeure Explained**:\n\nForce majeure is a clause in contracts that frees parties from liability or obligation when extraordinary events (e.g., natural disasters) prevent fulfilling terms.${disclaimer}`;
        }
        if (content.toLowerCase().includes("next steps in a lawsuit")) {
          return `**Next Steps in a Civil Lawsuit**:\n\n1. File a complaint.\n2. Serve the defendant.\n3. Engage in discovery.\n4. Proceed to mediation or trial.\n\nLet me know if you need assistance drafting any legal documents.${disclaimer}`;
        }
        return content + disclaimer;
      }
    }
    return content;
  };

  const displayedContent =
    role === "assistant" && typeof content === "string"
      ? getFormattedResponse(content)
      : content;

      return (
        <motion.div
          className={`flex flex-row gap-4 px-4 w-full  first-of-type:pt-20 ${
            role === "user" ? "justify-end" : "justify-start"
          }`}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {role === "assistant" && (
            <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0 bg-gray-200 rounded-full text-gray-500">
              <BotIcon />
            </div>
          )}
    
          <div
            className={`flex flex-col gap-1 w-[calc(100% - 120px)] mb-4 ${
              role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`${
                role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300"
              } p-4 rounded-lg shadow-md w-full`}
            >
              {typeof content === "string" ? (
                <Markdown>{content}</Markdown>
              ) : (
                // Render ReactNode directly if it's not a string
                content
              )}
            </div>
          </div>
    
          {role === "user" && (
            <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0 bg-blue-600 text-white rounded-full">
              <UserIcon />
            </div>
          )}
        </motion.div>
      );
    };