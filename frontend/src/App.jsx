import { useState, useEffect, useRef } from "react";
import "./styles/global.css";

import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { SUGGESTED_QUESTIONS } from "./constants";

import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import Message from "./components/Message";
import TypingDots from "./components/TypingDots";
import SuggestedQuestions from "./components/SuggestedQuestions";
import ChatInput from "./components/ChatInput";

export default function App() {
    const { user, token, isLoading: authLoading, error: authError, login, register, logout } = useAuth();
    const {
        messages,
        input,
        isLoading,
        sessions,
        activeSessionId,
        setInput,
        sendMessage,
        startNewSession,
        switchSession,
    } = useChat(token);

    const bottomRef = useRef(null);
    const isEmpty = messages.length === 0;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!token) {
        return (
            <AuthScreen
                onLogin={login}
                onRegister={register}
                isLoading={authLoading}
                error={authError}
            />
        );
    }

    const handleSelectSession = (sessionId) => {
        switchSession(sessionId);
        setSidebarOpen(false);
    };

    const handleNewSession = () => {
        startNewSession();
        setSidebarOpen(false);
    };

    return (
        <div style={{
            display: "flex",
            height: "100vh",
            background: "#f8fafc",
            overflow: "hidden",
            position: "relative",
        }}>

            {/* Dark overlay — shown when sidebar is open */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 10,
                        animation: "fadeIn 0.2s ease",
                    }}
                />
            )}

            {/* Sidebar — slides in from left */}
            <Sidebar
                isOpen={sidebarOpen}
                sessions={sessions}
                activeSessionId={activeSessionId}
                username={user?.username}
                onNewSession={handleNewSession}
                onSelectSession={handleSelectSession}
                onLogout={logout}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Chat area */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}>

                {/* Header */}
                <div style={{
                    padding: "16px 20px",
                    background: "#ffffff",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                    {/* Hamburger button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 6,
                            borderRadius: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                            flexShrink: 0,
                        }}
                    >
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 20,
                                height: 2,
                                background: "#64748b",
                                borderRadius: 2,
                            }} />
                        ))}
                    </button>

                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
                    }}>
                        🎓
                    </div>
                    <div>
                        <div style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1e293b",
                            fontFamily: "'Noto Sans Khmer', sans-serif",
                            lineHeight: 1.3,
                        }}>
                            ជំនួយការ TVET
                        </div>
                        <div style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 1,
                        }}>
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#0e9f6e",
                            }} />
                            អនឡាញ
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px 20px 8px",
                }}>
                    {isEmpty && (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "60%",
                            gap: 24,
                            animation: "fadeUp 0.5s ease",
                        }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{
                                    fontSize: 48,
                                    marginBottom: 14,
                                    filter: "drop-shadow(0 4px 12px rgba(26,86,219,0.2))",
                                }}>
                                    🎓
                                </div>
                                <h1 style={{
                                    fontSize: 22,
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    fontFamily: "'Noto Sans Khmer', sans-serif",
                                    marginBottom: 8,
                                    lineHeight: 1.5,
                                }}>
                                    សួស្ដី {user?.username}! ខ្ញុំជាជំនួយការ TVET
                                </h1>
                                <p style={{
                                    fontSize: 14,
                                    color: "#64748b",
                                    fontFamily: "'Noto Sans Khmer', sans-serif",
                                    lineHeight: 1.8,
                                    maxWidth: 380,
                                }}>
                                    ខ្ញុំអាចជួយអ្នករកព័ត៌មានអំពីកម្មវិធីបណ្តុះបណ្តាលបច្ចេកទេស និងវិជ្ជាជីវៈ (TVET) នៅកម្ពុជា
                                </p>
                            </div>
                            <SuggestedQuestions
                                questions={SUGGESTED_QUESTIONS}
                                onSelect={sendMessage}
                            />
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <Message
                            key={i}
                            role={msg.role}
                            content={msg.content}
                        />
                    ))}

                    {isLoading && (
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            marginBottom: 6,
                        }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 14,
                            }}>
                                🎓
                            </div>
                            <div style={{
                                background: "#ffffff",
                                borderRadius: "4px 18px 18px 18px",
                                padding: "12px 16px",
                                border: "1px solid #f1f5f9",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                            }}>
                                <TypingDots />
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} style={{ height: 8 }} />
                </div>

                <ChatInput
                    input={input}
                    onInputChange={setInput}
                    onSend={sendMessage}
                    isLoading={isLoading}
                    suggestions={SUGGESTED_QUESTIONS.slice(0, 3)}
                    showChips={!isEmpty && messages.length < 4}
                />
            </div>
        </div>
    );
}