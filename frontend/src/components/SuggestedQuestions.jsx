/**
 * SuggestedQuestions
 * Shown on the empty state (no messages yet).
 * Renders a 2-column grid of clickable question cards.
 *
 * Props:
 *   questions {string[]}           List of question strings to display
 *   onSelect  {(question) => void} Called when the user clicks a question
 */
export default function SuggestedQuestions({ questions, onSelect }) {
    return (
        <div
        style={{
            width: "100%",
            maxWidth: 520,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
        }}
        >
        {questions.map((q, i) => (
            <button
            key={i}
            className="suggestion-btn"
            onClick={() => onSelect(q)}
            style={{
                animationDelay: `${i * 0.08}s`,
                animation: "fadeUp 0.4s ease both",
            }}
            >
            {q}
            </button>
        ))}
        </div>
    );
}