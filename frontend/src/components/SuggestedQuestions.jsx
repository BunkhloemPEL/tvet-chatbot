/**
 * SuggestedQuestions
 * Starter prompts for an empty conversation.
 */
export default function SuggestedQuestions({ questions, onSelect }) {
    return (
        <div className="suggestion-grid">
            {questions.map((question) => (
                <button
                    key={question}
                    className="suggestion-card"
                    type="button"
                    onClick={() => onSelect(question)}
                >
                    {question}
                </button>
            ))}
        </div>
    );
}
