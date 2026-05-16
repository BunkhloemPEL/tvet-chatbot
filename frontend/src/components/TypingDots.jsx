/**
 * TypingDots
 * Shows an animated three-dot indicator while the assistant is "thinking"
 * (i.e. before the first streamed token arrives).
 */
export default function TypingDots() {
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