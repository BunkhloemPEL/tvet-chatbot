/**
 * Sidebar
 * Shows session list, new session button, and user info at the bottom.
 *
 * Props:
 *   sessions        {array}              List of session objects
 *   activeSessionId {string | null}      Currently active session
 *   username        {string}             Logged in username
 *   onNewSession    {() => void}         Creates a new session
 *   onSelectSession {(id) => void}       Switches to a session
 *   onLogout        {() => void}         Logs out
 */

export default function Sidebar({
    isOpen,
    sessions,
    activeSessionId,
    username,
    onNewSession,
    onSelectSession,
    onLogout,
    onClose,
}) {
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "85vw",
            background: "#1e293b",
            display: "flex",
            flexDirection: "column",
            zIndex: 20,
            transform: isOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s ease",
            boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
        }}>

            {/* Header */}
            <div style={{
                padding: "20px 16px 12px",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                    }}>
                        🎓
                    </div>
                    <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#f1f5f9",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                    }}>
                        ជំនួយការ TVET
                    </span>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        fontSize: 20,
                        cursor: "pointer",
                        padding: 4,
                        lineHeight: 1,
                        borderRadius: 6,
                        transition: "color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f1f5f9"}
                    onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                >
                    ✕
                </button>
            </div>

            {/* New session button */}
            <div style={{ padding: "12px 16px 0" }}>
                <button
                    onClick={onNewSession}
                    style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #334155",
                        background: "transparent",
                        color: "#cbd5e1",
                        fontSize: 13,
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "#334155";
                        e.currentTarget.style.color = "#f1f5f9";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#cbd5e1";
                    }}
                >
                    <span style={{ fontSize: 16 }}>＋</span>
                    សន្ទនាថ្មី
                </button>
            </div>

            {/* Session list */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 8px",
                scrollbarWidth: "thin",
                scrollbarColor: "#334155 transparent",
            }}>
                {sessions.length === 0 ? (
                    <p style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "#475569",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                        marginTop: 20,
                        lineHeight: 1.6,
                    }}>
                        មិនទាន់មានសន្ទនា
                    </p>
                ) : (
                    sessions.map((session) => {
                        const isActive = session.session_id === activeSessionId;
                        return (
                            <button
                                key={session.session_id}
                                onClick={() => onSelectSession(session.session_id)}
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: isActive ? "#334155" : "transparent",
                                    color: isActive ? "#f1f5f9" : "#94a3b8",
                                    fontSize: 13,
                                    fontFamily: "'Noto Sans Khmer', sans-serif",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    marginBottom: 2,
                                    transition: "all 0.15s ease",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = "#293548";
                                        e.currentTarget.style.color = "#cbd5e1";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#94a3b8";
                                    }
                                }}
                            >
                                💬 {session.title || "សន្ទនាថ្មី"}
                            </button>
                        );
                    })
                )}
            </div>

            {/* User info + logout */}
            <div style={{
                padding: "12px 16px",
                borderTop: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "#94a3b8",
                    }}>
                        👤
                    </div>
                    <span style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                        fontWeight: 500,
                    }}>
                        {username}
                    </span>
                </div>

                <button
                    onClick={onLogout}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#475569",
                        fontSize: 12,
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = "#ef4444";
                        e.currentTarget.style.background = "#1a1a2e";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = "#475569";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    ចេញ
                </button>
            </div>
        </div>
    );
}