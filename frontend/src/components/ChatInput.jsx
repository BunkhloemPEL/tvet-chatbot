import { useRef } from "react";

/**
 * ChatInput
 * Textarea composer plus quick suggestion chips.
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

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    };

    const resetTextarea = () => {
        requestAnimationFrame(() => {
            if (textareaRef.current) textareaRef.current.style.height = "auto";
        });
    };

    const handleChange = (event) => {
        onInputChange(event.target.value);
        resizeTextarea();
    };

    const handleSend = (text) => {
        onSend(text);
        resetTextarea();
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const canSend = input.trim().length > 0 && !isLoading;

    return (
        <footer className="composer-shell">
            <div className="composer-column">
                {showChips && (
                    <div className="suggestion-chip-row" aria-label="Suggested questions">
                        {suggestions.map((question) => (
                            <button
                                key={question}
                                className="suggestion-chip"
                                type="button"
                                onClick={() => handleSend(question)}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}

                <div className={`composer ${isLoading ? "is-loading" : ""}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="សរសេរសំណួររបស់អ្នក..."
                        rows={1}
                        aria-label="Message"
                    />

                    <button
                        className="send-button"
                        type="button"
                        aria-label="ផ្ញើសារ"
                        onClick={() => handleSend()}
                        disabled={!canSend}
                    >
                        ↑
                    </button>
                </div>

                <p className="composer-hint">
                    Enter ដើម្បីផ្ញើ · Shift+Enter សម្រាប់បន្ទាត់ថ្មី
                </p>
            </div>
        </footer>
    );
}
