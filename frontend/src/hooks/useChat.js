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
    const [isStreaming, setIsStreaming] = useState(false);

    const sendMessage = async (text) => {
        const userMessage = (text || input).trim();
        if (!userMessage || isLoading) return;

        // Clear input right away for a snappy feel
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: SESSION_ID, message: userMessage }),
        });

        // First token arrived — switch from "loading" to "streaming" state
        setIsLoading(false);
        setIsStreaming(true);

        // Seed an empty assistant bubble that will grow as chunks arrive
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).split("\n");
            for (const line of lines) {
            if (line.startsWith("data: ")) {
                const chunk = line.slice(6);
                if (chunk === "[DONE]") continue;

                // Append the chunk to the last message in place
                setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                    ...last,
                    content: last.content + chunk,
                };
                return updated;
                });
            }
            }
        }
        } catch {
        setIsLoading(false);
        setMessages((prev) => [
            ...prev,
            {
            role: "assistant",
            content:
                "សូមអភ័យទោស មានបញ្ហាក្នុងការតភ្ជាប់ម៉ាស៊ីនមេ។ សូមព្យាយាមម្តងទៀត។",
            },
        ]);
        } finally {
        setIsStreaming(false);
        }
    };

    return { messages, input, isLoading, isStreaming, setInput, sendMessage };
}