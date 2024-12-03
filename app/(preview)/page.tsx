"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import { useActions } from "ai/rsc";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import React from "react";

export default function Home() {
  const { sendMessage } = useActions();

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Array<ReactNode>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [realTimeText, setRealTimeText] = useState<string>(""); // For real-time transcription
  const [pastChats, setPastChats] = useState<{ title: string; messages: Array<ReactNode> }[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null); // Selected chat index
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false); // Toggle state for suggestions
  const [suggestedActions, setSuggestedActions] = useState([
    {
      title: "Review",
      label: "contract clauses",
      action: "Can you review this contract clause?",
    },
    {
      title: "Explain",
      label: "legal terms",
      action: "Explain the term 'indemnification'.",
    },
    {
      title: "Summarize",
      label: "case law",
      action: "Summarize Brown v. Board of Education.",
    },
    {
      title: "Assist",
      label: "with legal filing",
      action: "What forms are needed for a civil lawsuit?",
    },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  useEffect(() => {
    if (messages.length > 0) {
      const updateSuggestions = async () => {
        const newSuggestions = await fetchSuggestions(messages);
        setSuggestedActions(newSuggestions);
      };

      updateSuggestions();
    }
  }, [messages]);

  async function fetchSuggestions(conversation: Array<ReactNode>) {
    try {
      const conversationHistory = conversation
        .map((message) => {
          if (React.isValidElement(message)) {
            const props = message.props;
            return { role: props.role, content: props.content };
          }
          return null;
        })
        .filter((item) => item !== null);

      const response = await fetch("/api/getSuggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: conversationHistory }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.status}`);
      }

      const suggestions = await response.json();
      return suggestions.map((suggestion: any) => ({
        ...suggestion,
        label: suggestion.label
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        action: suggestion.action || "Type your message",
      }));
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSuggestedAction = async (action: string) => {
    setMessages((prev) => [
      ...prev,
      <Message key={prev.length} role="user" content={action} />,
    ]);

    const response: ReactNode = await sendMessage(action);

    setMessages((prev) => [...prev, response]);

    setIsSuggestionsVisible(false);
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRealTimeText("");

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setRealTimeText(transcript);
      };

      recognition.onend = async () => {
        setIsRecording(false);
        setInput(realTimeText);
      };

      recognition.start();
    } catch (error) {
      console.error("Error recording audio:", error);
      setIsRecording(false);
    }
  };

  const submitMessage = async () => {
    const userMessage = input || realTimeText;

    if (!userMessage.trim()) return;

    if (selectedChat === null) {
      const newChat = {
        title: `Chat ${pastChats.length + 1}`,
        messages: [
          ...messages,
          <Message key={messages.length} role="user" content={userMessage} />,
        ],
      };
      setPastChats((prev) => [...prev, newChat]);
      setSelectedChat(pastChats.length);
    } else {
      setPastChats((prev) =>
        prev.map((chat, index) =>
          index === selectedChat
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  <Message key={messages.length} role="user" content={userMessage} />,
                ],
              }
            : chat
        )
      );
    }

    const response: ReactNode = await sendMessage(userMessage);

    setMessages((prev) => [...prev, response]);

    setInput("");
    setRealTimeText("");
  };

  useEffect(() => {
    if (selectedChat !== null) {
      setMessages(pastChats[selectedChat]?.messages || []);
    }
  }, [selectedChat]);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-900">
      <div
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? "w-12" : "w-1/4"
        } bg-[#10275E] shadow-md`}
      >
        <div className="p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {!isSidebarCollapsed && "Past Chats"}
          </h3>
          <button onClick={toggleSidebar} className="p-1 rounded-md text-white">
            {isSidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>
        {!isSidebarCollapsed && (
          <ul className="mt-4 space-y-2 px-4">
            {pastChats.map((chat, index) => (
              <li
                key={index}
                onClick={() => setSelectedChat(index)}
                className={`p-2 rounded-md cursor-pointer ${
                  selectedChat === index
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600"
                }`}
              >
                {chat.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col flex-grow justify-evenly">
        <div
          ref={messagesContainerRef}
          className="flex-grow overflow-y-scroll p-4"
        >
          {messages.map((message, index) => (
            <React.Fragment key={index}>{message}</React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="relative flex items-center justify-center p-4">
          <motion.button
            onClick={() => setIsSuggestionsVisible(!isSuggestionsVisible)}
            className="py-2 px-4 bg-blue-500 text-white rounded-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSuggestionsVisible ? "X" : "Suggestions"}
          </motion.button>

          <AnimatePresence>
            {isSuggestionsVisible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-12 flex w-full items-center justify-center align-middle flex-wrap gap-4 p-4"
              >
                {suggestedActions.map((action, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSuggestedAction(action.action)}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="block font-semibold">{action.title}</span>
                    <span className="block text-sm text-gray-500">{action.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 flex items-center space-x-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await submitMessage();
            }}
            className="flex-grow flex items-center"
          >
            <input
              ref={inputRef}
              className="w-full bg-gray-200 p-2 rounded-md shadow-md dark:bg-zinc-700 dark:text-gray-300"
              placeholder="Type a message..."
              value={realTimeText || input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="button"
              onClick={startRecording}
              className="ml-2 p-2 bg-red-500 rounded-md text-white"
              disabled={isRecording}
            >
              <Mic />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
