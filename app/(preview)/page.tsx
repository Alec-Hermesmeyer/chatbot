// ai-sdk-preview-rsc-genui-example/app/(preview)/page.tsx
"use client";

import React, { useState, useRef } from "react";
import { useActions } from "ai/rsc"; // Ensure this path is correct
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
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [audioFile, setAudioFile] = useState<File | null>(null); // State for the audio file

  // Handle sending the message to the chat bot
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) {
      console.error("No message to send");
      return;
    }

    // Add the user's message to the chat
    setMessages((prev) => [
      ...prev,
      <Message key={prev.length} role="user" content={input} />,
    ]);
    
    const conversationHistory = [
      { role: "system", content: "You are an expert in law and provide legal advice." },
      ...messages.map(msg => ({ role: msg.props.role, content: msg.props.content })),
      { role: "user", content: input }
  ];

    // Call the OpenAI API to get a response
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", { // OpenAI API endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Specify the model you want to use
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from OpenAI:", errorData);
        setMessages((prev) => [
          ...prev,
          <Message key={prev.length} role="assistant" content="Error getting response from AI." />,
        ]);
      } else {
        const result = await response.json();
        console.log("OpenAI response:", result);
        const aiMessage = result.choices[0].message.content; // Extract the AI's response
        setMessages((prev) => [
          ...prev,
          <Message key={prev.length} role="assistant" content={aiMessage} />, // Display the AI's response
        ]);
      }
    } catch (error) {
      console.error("Error during fetch:", error);
      setMessages((prev) => [
        ...prev,
        <Message key={prev.length} role="assistant" content="Error processing AI response." />,
      ]);
    }

    setInput(""); // Clear the input after sending
  };

  // Handle audio transcription
  const handleTranscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!audioFile) {
      console.error("No audio file selected");
      return;
    }

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1"); // Add the model parameter

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from API:", errorData);
        setMessages((prev) => [
          ...prev,
          <Message key={prev.length} role="assistant" content="Failed to transcribe audio." />,
        ]);
      } else {
        const result = await response.json();
        console.log("Transcription result:", result);
        setInput(result.text); // Set the transcription result to the input
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error during fetch:", error);
      setMessages((prev) => [
        ...prev,
        <Message key={prev.length} role="assistant" content="Error processing transcription." />,
      ]);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      audioChunksRef.current = []; // Clear the chunks for the next recording
      setAudioFile(new File([audioBlob], "recording.wav")); // Set the audio file for transcription
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Call handleTranscribe after stopping the recording
      handleTranscribe(new Event('submit')); // Simulate form submission
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-900">
      <div className="flex flex-col flex-grow justify-between">
        {/* Messages Container */}
        <div ref={messagesContainerRef} className="flex-grow overflow-y-scroll p-8">
          {messages.map((message, index) => (
            <React.Fragment key={index}>{message}</React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input and Recording Controls */}
        <div className="p-4 flex items-center space-x-4">
          {/* Text Input for Transcription */}
          <form onSubmit={handleSendMessage} className="flex-grow flex items-center">
            <input
              type="text"
              value={input} // Bind the input state
              onChange={(e) => setInput(e.target.value)} // Update input state on change
              className="w-full bg-gray-200 p-2 rounded-md shadow-md dark:bg-zinc-700 dark:text-gray-300"
              placeholder="Enter transcription text"
              title="Transcription Text"
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