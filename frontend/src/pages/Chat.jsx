import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useNavigate } from "react-router-dom";
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    const initUser = async () => {
      // already logged in user
      if (localStorage.getItem("user_id")) return;

      try {
        const res = await fetch("http://localhost:5000/api/auth/anonymous", {
          method: "POST",
        });

        const data = await res.json();

        localStorage.setItem("user_id", data.user_id);
        console.log("🆕 Anonymous user created:", data.user_id);
      } catch (err) {
        console.error("User creation failed:", err);
      }
    };

    initUser();
  }, []);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [inputValue]);

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // ✅ Add USER message first (correct)
    const userMsg = { text: message, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);

    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          user_id: localStorage.getItem("user_id"),
        }),
      });

      const data = await response.json();

      // ✅ Add AI message WITH emotion
      const aiMsg = {
        text: data.reply,
        sender: "ai",
        emotion: data.emotion,
        risk: data.risk,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { text: "Error connecting to AI.", sender: "ai" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const getRiskStyle = (risk) => {
    switch (risk) {
      case "self_harm":
        return "bg-purple-300 text-black border-2 border-purple-600";
      case "threat":
        return "bg-red-300 text-black border-2 border-red-600";
      case "harassment":
        return "bg-orange-300 text-black border-2 border-orange-600";
      default:
        return null;
    }
  };
  const getEmotionStyle = (emotion) => {
    const e = emotion?.toLowerCase();
    switch (e) {
      case "joy":
        return "bg-green-200 text-black";
      case "sadness":
        return "bg-blue-200 text-black";
      case "anger":
        return "bg-red-200 text-black";
      case "fear":
        return "bg-yellow-200 text-black";
      default:
        return "bg-white/90 text-slate-800";
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col font-sans">
      {/* Header */}
      <div className="absolute top-4 left-4 z-50">
        {!localStorage.getItem("token") ? (
          <button
            onClick={() => navigate("/login")}
            className="bg-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
          >
            Login
          </button>
        ) : (
          <div
            onClick={() => navigate("/login")}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer shadow hover:scale-105 transition"
          >
            👤
          </div>
        )}
      </div>
      <header className="bg-white/10 backdrop-blur-xl p-6 text-white text-center shadow-2xl border-b border-white/20">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
          AI Assistant
        </h1>
        <p className="opacity-90 text-lg">
          Your intelligent conversation partner
        </p>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-5 md:p-8 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-white/70">
            <div className="text-5xl mb-4">👋</div>
            <h3 className="text-2xl font-semibold mb-2">
              Start a conversation
            </h3>
            <p>Type your message below and press Enter or click Send</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end mb-6" : "mb-6"
              } gap-4`}
            >
              <div
                className={`max-w-[70%] p-5 rounded-3xl shadow-2xl ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-sm"
                    : `${
                        msg.risk && msg.risk !== "normal"
                          ? getRiskStyle(msg.risk)
                          : getEmotionStyle(msg.emotion)
                      } rounded-bl-sm shadow-xl`
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mb-3">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold mb-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-3 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc ml-6 mb-3">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-6 mb-3">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    code: ({ inline, className, children }) => {
                      const match = /language-(\w+)/.exec(className || "");

                      return !inline ? (
                        <div className="my-4 rounded-xl overflow-hidden shadow-lg">
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match?.[1] || "cpp"}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              padding: "16px",
                              fontSize: "14px",
                              borderRadius: "12px",
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-gray-200 px-1 rounded text-sm font-mono">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex mb-6">
            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl rounded-bl-sm shadow-xl max-w-[70%]">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-8 bg-white/10 backdrop-blur-2xl max-w-4xl mx-auto w-full shadow-2xl border-t border-white/20">
        <div className="flex gap-4 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            disabled={isLoading}
            className="flex-1 p-5 rounded-3xl bg-white/90 backdrop-blur-xl text-slate-800 font-medium text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/30 focus:bg-white transition-all resize-none max-h-32 placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="w-14 h-14 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xl font-bold shadow-2xl hover:scale-105 hover:shadow-3xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? "⏳" : "➤"}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
