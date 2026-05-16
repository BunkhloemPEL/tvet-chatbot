import ReactMarkdown from "react-markdown";

/**
 * Message
 * Renders a single chat bubble — either from the user (right-aligned)
 * or the assistant (left-aligned with avatar).
 *
 * Props:
 *   role        {string}  "user" | "assistant"
 *   content     {string}  Markdown string to render
 *   isStreaming {boolean} When true, shows a blinking cursor at the end
 */
export default function Message({ role, content, isStreaming }) {
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
        {/* Avatar — only shown for assistant messages */}
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

        {/* Bubble */}
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

            {/* Blinking cursor shown while streaming */}
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