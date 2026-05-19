import { useState } from "react";
import { AUTH_URL } from "../constants";

/**
 * useAuth
 * Handles login, register, and logout.
 * Stores token and user info in memory (useState).
 *
 * Returns:
 *   user        — { user_id, username } or null
 *   token       — JWT string or null
 *   isLoading   — true while request is in flight
 *   error       — error message string or null
 *   login()     — async fn
 *   register()  — async fn
 *   logout()    — clears state
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (phone, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${AUTH_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "បញ្ហាក្នុងការចូល");
                return false;
            }

            setToken(data.access_token);
            setUser({ user_id: data.user_id, username: data.username });
            return true;

        } catch {
            setError("មិនអាចភ្ជាប់ម៉ាស៊ីនមេបានទេ");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (phone, username, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${AUTH_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "បញ្ហាក្នុងការចុះឈ្មោះ");
                return false;
            }

            return true;

        } catch {
            setError("មិនអាចភ្ជាប់ម៉ាស៊ីនមេបានទេ");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
    };

    return { user, token, isLoading, error, login, register, logout };
}