import { useEffect, useRef, useState } from "react";
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
        deletingSessionId,
        setInput,
        sendMessage,
        startNewSession,
        switchSession,
        deleteSession,
    } = useChat(token);

    const bottomRef = useRef(null);
    const isEmpty = messages.length === 0;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => {
        const savedTheme = window.localStorage.getItem("tvet-theme");
        if (savedTheme === "dark" || savedTheme === "light") return savedTheme;

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    const isDark = theme === "dark";

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        window.localStorage.setItem("tvet-theme", theme);
    }, [theme]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isLoading]);

    useEffect(() => {
        if (!sidebarOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") setSidebarOpen(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sidebarOpen]);

    if (!token) {
        return (
            <AuthScreen
                onLogin={login}
                onRegister={register}
                isLoading={authLoading}
                error={authError}
                theme={theme}
                onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
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

    const handleDeleteSession = async (sessionId) => {
        await deleteSession(sessionId);
    };

    return (
        <div className="app-shell">
            <button
                className={`sidebar-scrim ${sidebarOpen ? "is-visible" : ""}`}
                aria-label="បិទម៉ឺនុយ"
                onClick={() => setSidebarOpen(false)}
            />

            <Sidebar
                isOpen={sidebarOpen}
                sessions={sessions}
                activeSessionId={activeSessionId}
                username={user?.username}
                isLoading={isLoading}
                deletingSessionId={deletingSessionId}
                onNewSession={handleNewSession}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onLogout={logout}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="chat-workspace">
                <header className="chat-topbar">
                    <button
                        className="icon-button menu-button"
                        type="button"
                        aria-label="បើកម៉ឺនុយ"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <div className="brand-mark" aria-hidden="true">TV</div>

                    <div className="topbar-copy">
                        <strong>ជំនួយការ TVET</strong>
                        <span>
                            <i aria-hidden="true" />
                            អនឡាញ
                        </span>
                    </div>

                    <button
                        className="theme-toggle"
                        type="button"
                        aria-label={isDark ? "ប្តូរទៅ Light mode" : "ប្តូរទៅ Dark mode"}
                        aria-pressed={isDark}
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                    >
                        <span aria-hidden="true" />
                        {isDark ? "Light" : "Dark"}
                    </button>
                </header>

                <section className="message-scroll" aria-label="Conversation">
                    <div className="conversation-column">
                        {isEmpty && (
                            <div className="empty-state">
                                <div className="empty-kicker">TVET Cambodia</div>
                                <h1>សួស្ដី {user?.username || ""}</h1>
                                <p>
                                    ខ្ញុំអាចជួយរកព័ត៌មានអំពីកម្មវិធីបណ្តុះបណ្តាលបច្ចេកទេស
                                    និងវិជ្ជាជីវៈ សាលា លក្ខខណ្ឌចូលរៀន និងការគាំទ្រហិរញ្ញវត្ថុដែលអាចផ្ទៀងផ្ទាត់បាន។
                                </p>
                                <SuggestedQuestions
                                    questions={SUGGESTED_QUESTIONS}
                                    onSelect={sendMessage}
                                />
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <Message
                                key={`${msg.role}-${i}`}
                                role={msg.role}
                                content={msg.content}
                            />
                        ))}

                        {isLoading && (
                            <div className="message-row assistant-row">
                                <div className="assistant-avatar" aria-hidden="true">TV</div>
                                <div className="assistant-typing" aria-label="Assistant is typing">
                                    <TypingDots />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} className="scroll-anchor" />
                    </div>
                </section>

                <ChatInput
                    input={input}
                    onInputChange={setInput}
                    onSend={sendMessage}
                    isLoading={isLoading}
                    suggestions={SUGGESTED_QUESTIONS.slice(0, 3)}
                    showChips={!isEmpty && messages.length < 4}
                />
            </main>
        </div>
    );
}
