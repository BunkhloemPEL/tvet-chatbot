/**
 * Sidebar
 * Shows session list, new session button, and user info.
 */
export default function Sidebar({
    isOpen,
    sessions,
    activeSessionId,
    username,
    isLoading,
    deletingSessionId,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    onLogout,
    onClose,
}) {
    const handleDeleteSession = (event, session) => {
        event.stopPropagation();

        const sessionTitle = session.title || "សន្ទនាថ្មី";
        const confirmed = window.confirm(`លុប "${sessionTitle}" មែនទេ?`);
        if (!confirmed) return;

        onDeleteSession(session.session_id);
    };

    return (
        <aside className={`sidebar ${isOpen ? "is-open" : ""}`} aria-label="Chat sessions">
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="brand-mark sidebar-mark" aria-hidden="true">TV</div>
                    <div>
                        <strong>ជំនួយការ TVET</strong>
                        <span>ការសន្ទនារបស់អ្នក</span>
                    </div>
                </div>

                <button
                    className="sidebar-close"
                    type="button"
                    aria-label="បិទម៉ឺនុយ"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div className="sidebar-actions">
                <button className="new-session-button" type="button" onClick={onNewSession}>
                    <span aria-hidden="true">+</span>
                    សន្ទនាថ្មី
                </button>
            </div>

            <nav className="session-list" aria-label="Conversation history">
                {sessions.length === 0 ? (
                    <p className="session-empty">មិនទាន់មានសន្ទនា</p>
                ) : (
                    sessions.map((session) => {
                        const isActive = session.session_id === activeSessionId;
                        const isDeleting = session.session_id === deletingSessionId;
                        const isDeleteDisabled = isDeleting || (isActive && isLoading);
                        return (
                            <div
                                key={session.session_id}
                                className={`session-row ${isActive ? "is-active" : ""}`}
                            >
                                <button
                                    className="session-item"
                                    type="button"
                                    onClick={() => onSelectSession(session.session_id)}
                                    title={session.title || "សន្ទនាថ្មី"}
                                >
                                    <span aria-hidden="true" />
                                    <span>{session.title || "សន្ទនាថ្មី"}</span>
                                </button>

                                <button
                                    className="delete-session-button"
                                    type="button"
                                    aria-label={`លុប ${session.title || "សន្ទនាថ្មី"}`}
                                    title="លុបសន្ទនា"
                                    disabled={isDeleteDisabled}
                                    onClick={(event) => handleDeleteSession(event, session)}
                                >
                                    {isDeleting ? "…" : "×"}
                                </button>
                            </div>
                        );
                    })
                )}
            </nav>

            <div className="sidebar-user">
                <div className="user-meta">
                    <div className="user-avatar" aria-hidden="true">
                        {(username || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <span>{username}</span>
                </div>

                <button className="logout-button" type="button" onClick={onLogout}>
                    ចេញ
                </button>
            </div>
        </aside>
    );
}
