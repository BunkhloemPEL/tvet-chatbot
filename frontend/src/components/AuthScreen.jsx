import { useState } from "react";

/**
 * AuthScreen
 * Login and Register toggled on the same screen.
 */
export default function AuthScreen({ onLogin, onRegister, isLoading, error, theme, onToggleTheme }) {
    const [mode, setMode] = useState("login");
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [success, setSuccess] = useState(null);

    const isLogin = mode === "login";
    const isDark = theme === "dark";

    const handleSubmit = async (event) => {
        event?.preventDefault();

        if (isLogin) {
            await onLogin(phone, password);
            return;
        }

        const ok = await onRegister(phone, username, password);
        if (ok) {
            setSuccess("ចុះឈ្មោះបានជោគជ័យ! សូមចូលគណនី");
            setMode("login");
            setPassword("");
            setUsername("");
        }
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setSuccess(null);
    };

    return (
        <main className="auth-screen">
            <section className="auth-panel" aria-labelledby="auth-title">
                <button
                    className="theme-toggle auth-theme-toggle"
                    type="button"
                    aria-label={isDark ? "ប្តូរទៅ Light mode" : "ប្តូរទៅ Dark mode"}
                    aria-pressed={isDark}
                    onClick={onToggleTheme}
                >
                    <span aria-hidden="true" />
                    {isDark ? "Light" : "Dark"}
                </button>

                <div className="auth-brand">
                    <div className="auth-mark" aria-hidden="true">TV</div>
                    <div>
                        <p>TVET Cambodia</p>
                        <h1 id="auth-title">ជំនួយការ TVET</h1>
                    </div>
                </div>

                <div className="auth-copy">
                    <h2>{isLogin ? "សូមស្វាគមន៍ត្រឡប់មកវិញ" : "បង្កើតគណនីថ្មី"}</h2>
                    <p>
                        {isLogin
                            ? "ចូលគណនី ដើម្បីបន្តសន្ទនា និងរក្សាទុកប្រវត្តិរបស់អ្នក។"
                            : "ចុះឈ្មោះ ដើម្បីចាប់ផ្តើមសន្ទនាជាមួយជំនួយការ TVET។"}
                    </p>
                </div>

                <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                    <button
                        className={isLogin ? "is-active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={isLogin}
                        onClick={() => switchMode("login")}
                    >
                        ចូលគណនី
                    </button>
                    <button
                        className={!isLogin ? "is-active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={!isLogin}
                        onClick={() => switchMode("register")}
                    >
                        ចុះឈ្មោះ
                    </button>
                </div>

                {success && <div className="auth-alert success">{success}</div>}
                {error && <div className="auth-alert error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-field">
                        <span>លេខទូរស័ព្ទ</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="0xx xxx xxx"
                            autoComplete="tel"
                        />
                    </label>

                    {!isLogin && (
                        <label className="auth-field">
                            <span>ឈ្មោះអ្នកប្រើ</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder="sokha123"
                                autoComplete="username"
                            />
                        </label>
                    )}

                    <label className="auth-field">
                        <span>លេខសម្ងាត់</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                    </label>

                    <button className="auth-submit" type="submit" disabled={isLoading}>
                        {isLoading ? "កំពុងដំណើរការ..." : isLogin ? "ចូលគណនី" : "ចុះឈ្មោះ"}
                    </button>
                </form>
            </section>
        </main>
    );
}
