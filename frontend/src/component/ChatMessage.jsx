import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const ChatMessage = ({ message }) => {
  return (
    <div className="chat-message">
      <ReactMarkdown
        components={{
          code({ inline, className, children }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || "cpp"}
                PreTag="div"
              >
                {String(children).trim()}
              </SyntaxHighlighter>
            ) : (
              <code className="inline-code">{children}</code>
            );
          },
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessage;
