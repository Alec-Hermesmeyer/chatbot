"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { useActions } from "ai/rsc";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion, AnimatePresence } from "framer-motion";
import { useConversation } from "@11labs/react";
import { Mic } from "lucide-react";
import React from "react";

export default function Home() {
  const { sendMessage } = useActions();

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Array<ReactNode>>([]);
  const [pastChats, setPastChats] = useState<{ title: string; messages: Array<ReactNode> }[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
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

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

    const conversation = useConversation({
      onConnect: () => console.log("Voice conversation connected."),
      onDisconnect: () => console.log("Voice conversation disconnected."),
      onMessage: (message) => handleConversationMessage(message),
      onError: (error) => {
        console.error("Voice conversation error:", error);
        alert("Failed to connect or process the voice conversation. Please try again.");
      },
    });
    
    const handleConversationMessage = (message: string) => {
      if (message) {
        console.log("Received voice response:", message);
    
        setMessages((prev) => [
          ...prev,
          <Message key={prev.length} role="assistant" content={message} />,
        ]);
    
        updateSuggestions();
      } else {
        console.error("Empty message received from ElevenLabs.");
      }
    };
    
    const toggleRecording = useCallback(async () => {
      if (conversation.status === "connected") {
        await conversation.endSession();
      } else {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          await conversation.startSession({
            agentId: "bi9oqnqiYUItkWSSP7WA", // Replace with your agent ID
          });
        } catch (error) {
          console.error("Failed to start conversation:", error);
        }
      }
    }, [conversation]);
    
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const submitMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();

    setMessages((prev) => [
      ...prev,
      <Message key={prev.length} role="user" content={userMessage} />,
    ]);

    const response: ReactNode = await sendMessage(userMessage);

    setMessages((prev) => [...prev, response]);

    setInput("");
    updateSuggestions();
  };

  const handleSuggestedAction = async (action: string) => {
    // Transform the action into a user-friendly format
    const formattedAction = action
      .replace(/_/g, " ")
       // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Split camelCase into separate words
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
  
    // Add user-friendly message to conversation
    setMessages((prev) => [
      ...prev,
      <Message key={prev.length} role="user" content={formattedAction} />,
    ]);
  
    // Send the descriptive title directly to the AI for processing
    const response: ReactNode = await sendMessage(action);
  
    // Add the AI response to the chat
    setMessages((prev) => [...prev, response]);
  
    // Collapse suggestions after the user selects one
    setIsSuggestionsVisible(false);
  };

  const startRecordingWithTranscription = async () => {
  try {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }

      // Append the transcription to the chat as the user's input
      setMessages((prev) => [
        ...prev,
        <Message key={prev.length} role="user" content={transcript} />,
      ]);
      console.log("User Transcription:", transcript);

      // Optionally send the transcription to ElevenLabs
      sendMessage(transcript);
    };

    recognition.onerror = (error: any) => {
      console.error("Speech recognition error:", error);
    };

    recognition.start();
  } catch (error) {
    console.error("Error starting transcription:", error);
  }
};

const handleAIResponseWithTranscription = async (audioBlob: Blob) => {
  try {
    // Transcribe the AI's audio response
    const transcription = await fetch('/api/transcribe', {
      method: 'POST',
      body: audioBlob
    }).then(res => res.text());

    // Append the transcription to the chat
    setMessages((prev) => [
      ...prev,
      <Message key={prev.length} role="assistant" content={transcription} />,
    ]);
  } catch (error) {
    console.error("Error transcribing AI response:", error);
  }
};

  

  const updateSuggestions = async () => {
    try {
      console.log("Fetching suggestions...");
      const conversationHistory = messages
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
      console.log("Suggestions fetched:", suggestions);

      setSuggestedActions(
        suggestions.map((suggestion: any) => ({
          ...suggestion,
          label: suggestion.label
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char: string) => char.toUpperCase()),
        }))
      );
    } catch (error) {
      console.error("Error updating suggestions:", error);
    }
  };

  useEffect(() => {
    if (selectedChat !== null) {
      setMessages(pastChats[selectedChat]?.messages || []);
    }
  }, [selectedChat]);

  useEffect(() => {
    // Update suggestions whenever messages change
    if (messages.length > 0) {
      updateSuggestions();
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-900">
      {/* Sidebar for past chats */}
      <div
  className={`transition-all duration-300 ${
    isSidebarCollapsed ? "w-12" : "w-1/4"
  } bg-[#10275E] shadow-md flex flex-col`}
>
  {/* Sidebar Header */}
  <div className="p-4 flex justify-between items-center border-b border-gray-600">
    {!isSidebarCollapsed && (
      <h3 className="text-lg font-bold text-white">Past Chats</h3>
    )}
    <button
      onClick={toggleSidebar}
      className="p-2 rounded-md text-white hover:bg-blue-700 transition"
    >
      {isSidebarCollapsed ? "▶" : "◀"}
    </button>
  </div>

  {/* Chat Search */}
  {!isSidebarCollapsed && (
    <div className="p-4 border-b border-gray-600">
      <input
        type="text"
        placeholder="Search chats..."
        className="w-full bg-gray-800 p-2 rounded-md text-white"
        onChange={(e) => {
          // Update filtered chats here
        }}
      />
    </div>
  )}

  {/* Chat List */}
  <div className="flex-grow overflow-y-auto">
    {pastChats.length > 0 ? (
      <ul className="mt-2 space-y-2 px-4">
        {pastChats.map((chat, index) => (
          <li
            key={index}
            onClick={() => setSelectedChat(index)}
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
              selectedChat === index
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600"
            }`}
          >
            <span className="truncate">{chat.title}</span>
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle chat rename
                  }}
                  className="text-gray-500 hover:text-white"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle chat delete
                    setPastChats((prev) =>
                      prev.filter((_, idx) => idx !== index)
                    );
                  }}
                  className="text-gray-500 hover:text-white"
                >
                  🗑️
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <div className="p-4 text-white text-center">
        {isSidebarCollapsed ? null : "No chats available"}
      </div>
    )}
  </div>

  {/* Add Chat Button */}
  {!isSidebarCollapsed && (
    <div className="p-4">
      <button
        onClick={() => {
          const newChat = { title: `New Chat ${pastChats.length + 1}`, messages: [] };
          setPastChats((prev) => [...prev, newChat]);
          setSelectedChat(pastChats.length);
        }}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
      >
        + New Chat
      </button>
    </div>
  )}
</div>


      {/* Main chat area */}
      <div className="flex flex-col flex-grow justify-between">
        {/* Messages container */}
        <div
          ref={messagesContainerRef}
          className="flex-grow overflow-y-scroll p-8"
        >
          {messages.map((message, index) => (
            <React.Fragment key={index}>{message}</React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Toggle */}
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
                className="absolute bottom-12 flex  w-full items-center justify-center align-middle flex-wrap gap-4 p-4"
              >
                {suggestedActions.map((action, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSuggestedAction(action.action)}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition w-52"
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

        {/* Input and controls */}
        <div className="p-4 flex items-center space-x-4">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await submitMessage();
            }}
            className="flex-grow flex items-center"
          >
            <input
              className="w-full bg-gray-200 p-2 rounded-md shadow-md dark:bg-zinc-700 dark:text-gray-300"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Send
            </button>
          </form>

          {/* Record/Stop button */}
          <motion.button
            onClick={() => toggleRecording()}
            className={`ml-4 p-4 rounded-full text-white ${
              conversation.status === "connected" ? "bg-red-700" : "bg-red-500"
            } shadow-md`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={
              conversation.status === "connected" ? "Stop Recording" : "Start Recording"
            }
          >
            <Mic size={24} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
