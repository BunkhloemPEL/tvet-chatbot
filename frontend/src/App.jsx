import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "http://localhost:8000/chat";
const SESSION_ID = "tvet-user-001";

const SUGGESTED_QUESTIONS = [
  "តើមានកម្មវិធី TVET អ្វីខ្លះនៅភ្នំពេញ?",
  "តើការចូលរៀនតម្រូវអ្វីខ្លះ?",
  "តើថ្លៃសិក្សាប៉ុន្មាន?",
  "តើរយៈពេលសិក្សាយូរប៉ុណ្ណា?",
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#94a3b8",
            animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Message({ role, content, isStreaming }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 6,
        animation: "msgFadeIn 0.25s ease",
      }}
    >
      {!isUser && (
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
            marginRight: 10,
            marginTop: 2,
            fontSize: 14,
            boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
          }}
        >
          🎓
        </div>
      )}
      <div
        style={{
          maxWidth: "75%",
          background: isUser
            ? "linear-gradient(135deg, #1a56db, #1e429f)"
            : "#ffffff",
          color: isUser ? "#ffffff" : "#1e293b",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "11px 16px",
          fontSize: 14.5,
          lineHeight: 1.7,
          // whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: isUser
            ? "0 2px 12px rgba(26,86,219,0.3)"
            : "0 1px 4px rgba(0,0,0,0.08)",
          border: isUser ? "none" : "1px solid #f1f5f9",
          fontFamily: "'Noto Sans Khmer', sans-serif",
        }}
      >
        <div style={{ lineHeight: 1.7 }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {isStreaming && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 15,
              background: "#94a3b8",
              marginLeft: 3,
              verticalAlign: "middle",
              animation: "cursorBlink 1s step-end infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const inputAreaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
  };

  const sendMessage = async (text) => {
    const userMessage = (text || input).trim();
    if (!userMessage || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, message: userMessage }),
      });

      setIsLoading(false);
      setIsStreaming(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6);
            if (chunk === "[DONE]") continue;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + chunk,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "សូមអភ័យទោស មានបញ្ហាក្នុងការតភ្ជាប់ម៉ាស៊ីនមេ។ សូមព្យាយាមម្តងទៀត។",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body {
          font-family: 'DM Sans', 'Noto Sans Khmer', sans-serif;
          background: #f8fafc;
          color: #1e293b;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        textarea { font-family: 'Noto Sans Khmer', 'DM Sans', sans-serif; }
        textarea:focus { outline: none; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .suggestion-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-family: 'Noto Sans Khmer', sans-serif;
          color: #475569;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s ease;
          line-height: 1.5;
        }
        .suggestion-btn:hover {
          background: #f0f7ff;
          border-color: #1a56db;
          color: #1a56db;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26,86,219,0.12);
        }
        .send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.18s ease;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 4px 14px rgba(26,86,219,0.35);
        }
        .send-btn:active:not(:disabled) {
          transform: scale(0.94);
        }
      `}</style>

      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 760,
        margin: "0 auto",
        background: "#f8fafc",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 24px",
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
          }}>
            🎓
          </div>
          <div>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1e293b",
              fontFamily: "'Noto Sans Khmer', sans-serif",
              lineHeight: 1.3,
            }}>
              ជំនួយការ TVET
            </div>
            <div style={{
              fontSize: 12,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 1,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0e9f6e",
              }} />
              អនឡាញ
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 8px",
        }}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60%",
              gap: 24,
              animation: "fadeUp 0.5s ease",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 48,
                  marginBottom: 14,
                  filter: "drop-shadow(0 4px 12px rgba(26,86,219,0.2))",
                }}>
                  🎓
                </div>
                <h1 style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#1e293b",
                  fontFamily: "'Noto Sans Khmer', sans-serif",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}>
                  សួស្ដី! ខ្ញុំជាជំនួយការ TVET
                </h1>
                <p style={{
                  fontSize: 14,
                  color: "#64748b",
                  fontFamily: "'Noto Sans Khmer', sans-serif",
                  lineHeight: 1.8,
                  maxWidth: 380,
                }}>
                  ខ្ញុំអាចជួយអ្នករកព័ត៌មានអំពីកម្មវិធីបណ្តុះបណ្តាលបច្ចេកទេស និងវិជ្ជាជីវៈ (TVET) នៅកម្ពុជា
                </p>
              </div>

              {/* Suggested questions */}
              <div style={{
                width: "100%",
                maxWidth: 520,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    className="suggestion-btn"
                    onClick={() => sendMessage(q)}
                    style={{ animationDelay: `${i * 0.08}s`, animation: "fadeUp 0.4s ease both" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <Message
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
            />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 14,
              }}>
                🎓
              </div>
              <div style={{
                background: "#ffffff",
                borderRadius: "4px 18px 18px 18px",
                padding: "12px 16px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} style={{ height: 8 }} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 20px 20px",
          background: "#f8fafc",
          borderTop: "1px solid #f1f5f9",
        }}
          ref={inputAreaRef}
        >
          {/* Suggested chips when chatting */}
          {!isEmpty && messages.length < 4 && (
            <div style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
            }}>
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    flexShrink: 0,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontFamily: "'Noto Sans Khmer', sans-serif",
                    color: "#475569",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    e.target.style.borderColor = "#1a56db";
                    e.target.style.color = "#1a56db";
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.color = "#475569";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 18,
            padding: "10px 12px 10px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            transition: "border-color 0.2s",
          }}
            onFocus={() => {}}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="សរសេរសំណួររបស់អ្នក..."
              rows={1}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                resize: "none",
                fontSize: 14,
                color: "#1e293b",
                lineHeight: 1.6,
                maxHeight: 130,
                overflow: "auto",
                fontFamily: "'Noto Sans Khmer', sans-serif",
              }}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                background: input.trim() && !isLoading
                  ? "linear-gradient(135deg, #1a56db, #1e429f)"
                  : "#e2e8f0",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5l0 14M5 12l7-7 7 7"
                  stroke={input.trim() && !isLoading ? "#ffffff" : "#94a3b8"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <p style={{
            textAlign: "center",
            fontSize: 11,
            color: "#cbd5e1",
            marginTop: 8,
            fontFamily: "'Noto Sans Khmer', sans-serif",
          }}>
            Enter ដើម្បីផ្ញើ · Shift+Enter សម្រាប់បន្ទាត់ថ្មី
          </p>
        </div>
      </div>
    </>
  );
}
