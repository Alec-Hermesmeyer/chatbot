// page.tsx

"use client";

import React, { useState, useRef, useCallback } from "react";
// page.tsx

import { useActions } from "ai/rsc"; // Ensure this path is correct
 // Adjust the import path if necessary
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";

export default function Home() {
  const { sendMessage } = useActions();
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Array<React.ReactNode>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Handle incoming audio data
  const handleAudioDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data);
    }
  };

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", handleAudioDataAvailable);
      mediaRecorder.addEventListener("stop", handleRecordingStop);

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setMessages((prev) => [
        ...prev,
        <Message key={prev.length} role="assistant" content="Failed to start recording." />,
      ]);
    }
  }, []);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Handle recording stop and transcription
  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn("No audio data available.");
      return;
    }
  
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];
  
    // Prepare FormData with the key 'file'
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm"); // Ensure the key is 'file'
  
    try {
      // Send the audio file to the Next.js API route
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to transcribe audio: ${response.status}`);
      }
  
      const { transcription } = await response.json();
  
      // Set the transcribed text to the input field
      setInput(transcription);
  
      // Optionally, scroll the chat view to the bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error processing audio transcription:", error);
      setMessages((prev) => [
        ...prev,
        <Message key={prev.length} role="assistant" content="Failed to transcribe audio." />,
      ]);
    }
  };
  

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-900">
      <div className="flex flex-col flex-grow justify-between">
        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-grow overflow-y-scroll p-8"
        >
          {messages.map((message, index) => (
            <React.Fragment key={index}>{message}</React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input and Recording Controls */}
        <div className="p-4 flex items-center space-x-4">
          {/* Text Input Form */}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const userMessage = input.trim();
              if (!userMessage) return;

              // Append user message to chat
              setMessages((prev) => [
                ...prev,
                <Message key={prev.length} role="user" content={userMessage} />,
              ]);

              // Send message to AI and append response
              const response: React.ReactNode = await sendMessage(userMessage);
              setMessages((prev) => [...prev, response]);

              setInput("");

              // Scroll to bottom after adding new messages
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

          {/* Recording Button */}
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            className={`ml-4 p-4 rounded-full text-white ${
              isRecording ? "bg-red-700" : "bg-red-500"
            } shadow-md`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          >
            <Mic size={24} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
