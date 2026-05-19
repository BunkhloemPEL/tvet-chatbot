import { useState } from "react";

/**
 * AuthScreen
 * Login and Register toggled on the same screen.
 *
 * Props:
 *   onLogin    {(phone, password) => Promise<boolean>}
 *   onRegister {(phone, username, password) => Promise<boolean>}
 *   isLoading  {boolean}
 *   error      {string | null}
 */
export default function AuthScreen({ onLogin, onRegister, isLoading, error }) {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [success, setSuccess] = useState(null);

    const handleSubmit = async () => {
        if (mode === "login") {
            await onLogin(phone, password);
        } else {
            const ok = await onRegister(phone, username, password);
            if (ok) {
                setSuccess("ចុះឈ្មោះបានជោគជ័យ! សូមចូលគណនី");
                setMode("login");
                setPassword("");
                setUsername("");
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSubmit();
    };

    const toggleMode = () => {
        setMode(mode === "login" ? "register" : "login");
        setSuccess(null);
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#f8fafc",
            padding: 20,
        }}>
            <div style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "40px 36px",
                width: "100%",
                maxWidth: 400,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                border: "1px solid #f1f5f9",
            }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #1a56db, #0e9f6e)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        margin: "0 auto 14px",
                        boxShadow: "0 4px 12px rgba(26,86,219,0.25)",
                    }}>
                        🎓
                    </div>
                    <h1 style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#1e293b",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                        marginBottom: 6,
                    }}>
                        ជំនួយការ TVET
                    </h1>
                    <p style={{
                        fontSize: 13,
                        color: "#94a3b8",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                    }}>
                        {mode === "login" ? "សូមចូលគណនីរបស់អ្នក" : "សូមបង្កើតគណនីថ្មី"}
                    </p>
                </div>

                {/* Success message */}
                {success && (
                    <div style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 10,
                        padding: "10px 14px",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "#16a34a",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                    }}>
                        {success}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 10,
                        padding: "10px 14px",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "#dc2626",
                        fontFamily: "'Noto Sans Khmer', sans-serif",
                    }}>
                        {error}
                    </div>
                )}

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                    {/* Phone */}
                    <div>
                        <label style={labelStyle}>លេខទូរស័ព្ទ</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="0xx xxx xxx"
                            style={inputStyle}
                        />
                    </div>

                    {/* Username — register only */}
                    {mode === "register" && (
                        <div>
                            <label style={labelStyle}>ឈ្មោះអ្នកប្រើ</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="sokha123"
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Password */}
                    <div>
                        <label style={labelStyle}>លេខសម្ងាត់</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="••••••••"
                            style={inputStyle}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        style={{
                            marginTop: 4,
                            padding: "12px",
                            borderRadius: 12,
                            border: "none",
                            background: isLoading
                                ? "#e2e8f0"
                                : "linear-gradient(135deg, #1a56db, #1e429f)",
                            color: isLoading ? "#94a3b8" : "#ffffff",
                            fontSize: 14,
                            fontWeight: 500,
                            fontFamily: "'Noto Sans Khmer', sans-serif",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        {isLoading
                            ? "កំពុងដំណើរការ..."
                            : mode === "login" ? "ចូលគណនី" : "ចុះឈ្មោះ"
                        }
                    </button>
                </div>

                {/* Toggle */}
                <p style={{
                    textAlign: "center",
                    marginTop: 20,
                    fontSize: 13,
                    color: "#64748b",
                    fontFamily: "'Noto Sans Khmer', sans-serif",
                }}>
                    {mode === "login" ? "មិនទាន់មានគណនី?" : "មានគណនីហើយ?"}
                    {" "}
                    <span
                        onClick={toggleMode}
                        style={{
                            color: "#1a56db",
                            cursor: "pointer",
                            fontWeight: 500,
                        }}
                    >
                        {mode === "login" ? "ចុះឈ្មោះ" : "ចូលគណនី"}
                    </span>
                </p>
            </div>
        </div>
    );
}

const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#475569",
    fontFamily: "'Noto Sans Khmer', sans-serif",
    marginBottom: 6,
};

const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "'Noto Sans Khmer', sans-serif",
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
};