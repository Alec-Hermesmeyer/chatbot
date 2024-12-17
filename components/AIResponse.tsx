// components/AIResponse.tsx
import React from "react";

type AIResponseProps = {
  content: string;
};

const AIResponse: React.FC<AIResponseProps> = ({ content }) => {
  // Function to render formatted text with bold support
  const renderFormattedContent = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    return lines.map((line, index) => {
      if (line.match(/^\d+\.\s/)) {
        // Detect pre-existing numbered lists
        return (
          <li
            key={index}
            className="text-gray-700 leading-relaxed pl-2"
            style={{ listStyleType: "decimal" }}
          >
            {renderBoldText(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      } else if (line.match(/^[*-]\s/)) {
        // Detect bullet points
        return (
          <li
            key={index}
            className="text-gray-700 leading-relaxed pl-2"
            style={{ listStyleType: "disc" }}
          >
            {renderBoldText(line.replace(/^[*-]\s/, ""))}
          </li>
        );
      } else {
        // Regular paragraph
        return (
          <p key={index} className="mb-3 text-gray-800 leading-relaxed">
            {renderBoldText(line)}
          </p>
        );
      }
    });
  };

  // Function to bold text enclosed with ** or highlight keywords
  const renderBoldText = (line: string) => {
    const boldedContent = line.split(/(\*\*.*?\*\*)/g); // Detect **bolded text**
    return boldedContent.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="text-gray-900 font-semibold">
            {part.replace(/\*\*/g, "")}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="p-2 bg-gray-200 rounded-lg shadow-md px-8 space-y-4">
      <div className="text-gray-800 leading-relaxed">
        {content.includes("\n") ? (
          <ul className="list-outside space-y-2">{renderFormattedContent(content)}</ul>
        ) : (
          <p className="text-gray-800 leading-relaxed">{renderBoldText(content)}</p>
        )}
      </div>
    </div>
  );
};

export default AIResponse;
