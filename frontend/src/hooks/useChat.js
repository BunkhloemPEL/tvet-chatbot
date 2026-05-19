import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../constants";

export function useChat(token) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);

    // const fetchSessions = useCallback(async () => {
    //     try {
    //         const response = await fetch(`${API_URL}/sessions`, {
    //             headers: { Authorization: `Bearer ${token}` },
    //         });
    //         const data = await response.json();
    //         setSessions(data);
    //     } catch {
    //         console.error("Failed to fetch sessions");
    //     }
    // }, [token]);

    useEffect(() => {
        if (!token) return;

        const loadSessions = async () => {
            try {
                const response = await fetch(`${API_URL}/sessions`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                setSessions(data);
            } catch {
                console.error("Failed to fetch sessions");
            }
        };

        loadSessions();
    }, [token]);

    const startNewSession = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/session`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setSessions((prev) => [data, ...prev]);
            setActiveSessionId(data.session_id);
            setMessages([]);
        } catch {
            console.error("Failed to create session");
        }
    }, [token]);

    const switchSession = useCallback(async (sessionId) => {
        if (sessionId === activeSessionId) return;
        setActiveSessionId(sessionId);
        setMessages([]);

        try {
            const response = await fetch(`${API_URL}/session/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setMessages(data.messages);
        } catch {
            console.error("Failed to load session messages");
        }
    }, [token, activeSessionId]);

    const sendMessage = useCallback(async (text) => {
        const userMessage = (text || input).trim();
        if (!userMessage || isLoading) return;

        setInput("");

        let sessionId = activeSessionId;
        if (!sessionId) {
            try {
                const response = await fetch(`${API_URL}/session`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                sessionId = data.session_id;
                setActiveSessionId(sessionId);
                setSessions((prev) => [data, ...prev]);
            } catch {
                console.error("Failed to create session");
                return;
            }
        }

        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/no-stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userMessage,
                }),
            });

            const data = await response.json();

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.response },
            ]);

        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "សូមអភ័យទោស មានបញ្ហាក្នុងការតភ្ជាប់។ សូមព្យាយាមម្តងទៀត។",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [token, input, isLoading, activeSessionId]);

    return {
        messages,
        input,
        isLoading,
        sessions,
        activeSessionId,
        setInput,
        sendMessage,
        startNewSession,
        switchSession,
    };
}