"use client";

import React, { useState, useRef, useEffect } from "react";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion } from "framer-motion";
import { Mic, Menu, X } from "lucide-react";
import AIResponse from "@/components/AIResponse";

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ title: string; action: string }>
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(""); // Dynamic status
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesContainerRef = useScrollToBottom<HTMLDivElement>();
  const [containerRef] = messagesContainerRef;

  const defaultSuggestions = [
    { title: "What are my legal rights?", action: "What are my legal rights in this case?" },
    { title: "Ask about contract law", action: "Explain contract law principles." },
    { title: "How to file a lawsuit?", action: "How do I file a lawsuit?" },
    { title: "Get help with legal terms", action: "Explain the legal term 'breach of contract'." },
  ];

  useEffect(() => {
    setSuggestions(defaultSuggestions);
  }, []);

  const fetchSuggestions = async (
    conversation: Array<{ role: string; content: string }>
  ) => {
    try {
      const response = await fetch("/api/getSuggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });
      if (!response.ok) throw new Error("Failed to fetch suggestions.");
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);
    setLoadingMessage("Thinking...");

    const loadingMessages = ["Analyzing input...", "Generating response...", "Almost there..."];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      setLoadingMessage(loadingMessages[messageIndex]);
      messageIndex = (messageIndex + 1) % loadingMessages.length;
    }, 8000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_MESSAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [...messages, newMessage],
        }),
      });

      const result = await response.json();
      const aiMessage = result.choices[0]?.message?.content || "No response.";
      setMessages((prev) => [...prev, { role: "assistant", content: aiMessage }]);
      fetchSuggestions([...messages, newMessage, { role: "assistant", content: aiMessage }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error processing response." }]);
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioFile = new File([audioBlob], "recording.wav");

      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

      try {
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_MESSAGE_API_KEY}` },
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to transcribe audio.");
        const result = await response.json();
        setInput(result.text); // Update input with transcription
      } catch (error) {
        console.error("Error transcribing audio:", error);
      } finally {
        setIsRecording(false);
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="w-72 bg-gray-700 text-slate-200 flex-shrink-0 p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Menu</h2>
            <button onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav>
            <ul className="space-y-4">
              <li className="hover:text-gray-300 cursor-pointer">🏠 Home</li>
              <li className="hover:text-gray-300 cursor-pointer">📄 History</li>
              <li className="hover:text-gray-300 cursor-pointer">⚙️ Settings</li>
            </ul>
          </nav>
        </aside>
      )}

      {/* Main Chat Section */}
      <div className="flex flex-col flex-grow bg-white shadow-xl">
        <header className="flex items-center justify-between p-4 bg-[#10275E] text-white shadow-md">
          <button onClick={() => setIsSidebarOpen(true)} aria-label="Open Sidebar">
            <Menu />
          </button>
        </header>

        {/* Messages */}
        <div ref={containerRef} className="flex-grow px-40 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              {msg.role === "assistant" ? (
                <AIResponse content={msg.content} />
              ) : (
                <div className="inline-block p-2 bg-blue-500 text-white rounded-lg shadow-md">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="p-2 px-8 w-60 bg-gray-200 rounded-lg shadow-md text-gray-500 animate-pulse"> {loadingMessage} </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center p-4">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion.title)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 shadow-sm"
              >
                {suggestion.title}
              </button>
            ))}
          </div>
        )}

        {/* Input and Controls */}
        <footer className="p-4 bg-gray-100 border-t flex items-center space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow border p-2 rounded-md"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500"
          >
            Send
          </button>
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full text-white ${
              isRecording ? "bg-red-600" : "bg-blue-600"
            }`}
            whileHover={{ scale: 1.1 }}
          >
            <Mic size={24} />
          </motion.button>
        </footer>
      </div>
    </div>
  );
}
