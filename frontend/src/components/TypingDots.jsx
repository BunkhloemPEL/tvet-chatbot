/**
 * TypingDots
 * Shows a subtle thinking indicator while waiting for the assistant response.
 */
export default function TypingDots() {
    return (
        <div className="typing-dots">
            {[0, 1, 2].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.14}s` }} />
            ))}
        </div>
    );
}
