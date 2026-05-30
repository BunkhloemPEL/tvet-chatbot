import ReactMarkdown from "react-markdown";

/**
 * Message
 * Renders one user or assistant message with markdown-aware text styling.
 */
export default function Message({ role, content, isStreaming }) {
    const isUser = role === "user";

    return (
        <article className={`message-row ${isUser ? "user-row" : "assistant-row"}`}>
            {!isUser && <div className="assistant-avatar" aria-hidden="true">TV</div>}

            <div className={`message-card ${isUser ? "user-message" : "assistant-message"}`}>
                <div className="message-content">
                    <ReactMarkdown>{content || ""}</ReactMarkdown>
                    {isStreaming && <span className="stream-cursor" aria-hidden="true" />}
                </div>
            </div>
        </article>
    );
}
