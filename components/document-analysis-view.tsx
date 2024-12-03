"use client";

interface DocumentAnalysisViewProps {
  documentText: string;
}

export const DocumentAnalysisView = ({ documentText }: DocumentAnalysisViewProps) => {
  return (
    <div className="p-6 bg-gray-100 dark:bg-zinc-800 rounded-lg shadow-md max-w-4xl w-full">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Document Analysis
      </h2>
      <p className="text-gray-700 dark:text-gray-300">
        This is a placeholder for the document analysis view. Below is the text being analyzed:
      </p>
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm">
        {documentText}
      </div>
      <p className="text-gray-500 dark:text-gray-400 mt-4 italic">
        Insights and analysis will appear here in the future.
      </p>
    </div>
  );
};
