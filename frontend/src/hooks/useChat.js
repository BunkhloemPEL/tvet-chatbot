import { useState } from "react";
import { API_URL, SESSION_ID } from "../constants";


/**
 * useChat
 * Encapsulates all chat state and the send/stream logic.
 * Components only need to know about the returned values — they
 * never touch fetch, readers, or decoders directly.
 *
 * Returns:
 *   messages    {Array<{role, content}>}  Full conversation history
 *   input       {string}                 Current textarea value
 *   isLoading   {boolean}                True while waiting for the first token
 *   isStreaming  {boolean}               True while tokens are arriving
 *   setInput    {function}               Update the input value
 *   sendMessage {(text?: string) => void} Send a message; uses `input` if no text given
 */

export function useChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (text) => {
        const userMessage = (text || input).trim();
        if (!userMessage || isLoading) return;

        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: SESSION_ID, message: userMessage }),
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
            content: "សូមអភ័យទោស មានបញ្ហាក្នុងការតភ្ជាប់ម៉ាស៊ីនមេ។ សូមព្យាយាមម្តងទៀត។",
            },
        ]);
        } finally {
        setIsLoading(false);
        }
    };

    return { messages, input, isLoading, setInput, sendMessage };
}