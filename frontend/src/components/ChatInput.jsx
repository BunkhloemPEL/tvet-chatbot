import { useRef } from "react";

/**
 * ChatInput
 * The textarea + send button at the bottom of the chat.
 * Also shows quick-suggestion chips when the conversation has just started.
 *
 * Props:
 *   input          {string}                   Current input value
 *   onInputChange  {(value: string) => void}  Called on every keystroke
 *   onSend         {() => void}               Called when user hits Send or Enter
 *   isLoading      {boolean}                  Disables the button while waiting
 *   suggestions    {string[]}                 Short-cut chips shown above the input
 *   showChips      {boolean}                  Whether to render the chips row
 */
export default function ChatInput({
    input,
    onInputChange,
    onSend,
    isLoading,
    suggestions,
    showChips,
    }) {
    const textareaRef = useRef(null);

    const adjustTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 130) + "px";
    };

    const handleChange = (e) => {
        onInputChange(e.target.value);
        adjustTextarea();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
        // Reset height after sending
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        }
    };

    const canSend = input.trim() && !isLoading;

    return (
        <div
        style={{
            padding: "12px 20px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
        }}
        >
        {/* Quick-suggestion chips */}
        {showChips && (
            <div
            style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
            }}
            >
            {suggestions.map((q, i) => (
                <button
                key={i}
                className="suggestion-chip"
                onClick={() => onSend(q)}
                >
                {q}
                </button>
            ))}
            </div>
        )}

        {/* Input row */}
        <div
            style={{
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
        >
            <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
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
            onClick={onSend}
            disabled={!canSend}
            style={{
                background: canSend
                ? "linear-gradient(135deg, #1a56db, #1e429f)"
                : "#e2e8f0",
            }}
            >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                d="M12 5l0 14M5 12l7-7 7 7"
                stroke={canSend ? "#ffffff" : "#94a3b8"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                />
            </svg>
            </button>
        </div>

        <p
            style={{
            textAlign: "center",
            fontSize: 11,
            color: "#cbd5e1",
            marginTop: 8,
            fontFamily: "'Noto Sans Khmer', sans-serif",
            }}
        >
            Enter ដើម្បីផ្ញើ · Shift+Enter សម្រាប់បន្ទាត់ថ្មី
        </p>
        </div>
    );
}