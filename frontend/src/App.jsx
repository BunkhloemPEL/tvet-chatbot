import { useEffect, useRef } from "react";

import "./styles/global.css";

import { useChat } from "./hooks/useChat";
import { SUGGESTED_QUESTIONS } from "./constants";

import Message from "./components/Message";
import TypingDots from "./components/TypingDots";
import SuggestedQuestions from "./components/SuggestedQuestions";
import ChatInput from "./components/ChatInput";

/**
 * App
 * The top-level layout shell. Its only jobs are:
 *   1. Wiring the useChat hook to the child components
 *   2. Deciding what to show (empty state vs messages)
 *   3. Managing the auto-scroll ref
 */
export default function App() {
  const { messages, input, isLoading, isStreaming, setInput, sendMessage } =
    useChat();

  const bottomRef = useRef(null);
  const isEmpty = messages.length === 0;

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 760,
        margin: "0 auto",
        background: "#f8fafc",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 24px",
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
          }}
        >
          🎓
        </div>
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1e293b",
              fontFamily: "'Noto Sans Khmer', sans-serif",
              lineHeight: 1.3,
            }}
          >
            ជំនួយការ TVET
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 1,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0e9f6e",
              }}
            />
            អនឡាញ
          </div>
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 8px",
        }}
      >
        {/* Empty state with welcome copy + suggestion grid */}
        {isEmpty && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60%",
              gap: 24,
              animation: "fadeUp 0.5s ease",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 14,
                  filter: "drop-shadow(0 4px 12px rgba(26,86,219,0.2))",
                }}
              >
                🎓
              </div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#1e293b",
                  fontFamily: "'Noto Sans Khmer', sans-serif",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                សួស្ដី! ខ្ញុំជាជំនួយការ TVET
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  fontFamily: "'Noto Sans Khmer', sans-serif",
                  lineHeight: 1.8,
                  maxWidth: 380,
                }}
              >
                ខ្ញុំអាចជួយអ្នករកព័ត៌មានអំពីកម្មវិធីបណ្តុះបណ្តាលបច្ចេកទេស
                និងវិជ្ជាជីវៈ (TVET) នៅកម្ពុជា
              </p>
            </div>

            <SuggestedQuestions
              questions={SUGGESTED_QUESTIONS}
              onSelect={sendMessage}
            />
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((msg, i) => (
          <Message
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={
              isStreaming && i === messages.length - 1 && msg.role === "assistant"
            }
          />
        ))}

        {/* Typing indicator — shown before the first token arrives */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 14,
              }}
            >
              🎓
            </div>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "4px 18px 18px 18px",
                padding: "12px 16px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Input area ──────────────────────────────────────── */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        isLoading={isLoading}
        suggestions={SUGGESTED_QUESTIONS.slice(0, 3)}
        showChips={!isEmpty && messages.length < 4}
      />
    </div>
  );
}