"use client";

import {
    useState,
    useContext,
    useCallback,
    useRef,
    useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../App";

// ─── Motion Components ──────────────────────────────────────────────
const MotionDiv = motion.div;
const MotionButton = motion.button;

// ─── Brand panel content ────────────────────────────────────────────
const FEATURES = [
    { title: "Live Dashboard", desc: "Real-time status across every module" },
    { title: "End-to-End Tracking", desc: "From lead to order, fully visible" },
    { title: "AI Assistant", desc: "Ask questions, get instant answers" },
];

// ─── Main Component ────────────────────────────────────────────────
function Login() {
    const { login, showNotification } = useContext(AuthContext);
    const navigate = useNavigate();

    // ── State ──
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // ── Refs ──
    const usernameInputRef = useRef(null);

    // ── Derived ──
    const isFormValid = username.trim().length > 0 && password.length > 0;

    // ── Effects ──
    useEffect(() => {
        usernameInputRef.current?.focus();
        const saved = localStorage.getItem("rememberMe");
        if (saved === "true") {
            setRememberMe(true);
            const savedUsername = localStorage.getItem("savedUsername");
            if (savedUsername) setUsername(savedUsername);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("rememberMe", String(rememberMe));
        if (rememberMe && username) {
            localStorage.setItem("savedUsername", username);
        } else {
            localStorage.removeItem("savedUsername");
        }
    }, [rememberMe, username]);

    // ── Handlers ──
    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            setError("");

            if (!username.trim() || !password) {
                setError("Please enter both username and password");
                return;
            }

            setIsLoading(true);
            try {
                const success = await login(username.trim(), password);
                if (success) {
                    navigate("/");
                } else {
                    setError("Invalid username or password. Please try again.");
                    setPassword("");
                    setTimeout(() => usernameInputRef.current?.focus(), 100);
                }
            } catch (err) {
                setError("Something went wrong. Please try again.");
                console.error("[Login Error]", err);
            } finally {
                setIsLoading(false);
            }
        },
        [login, navigate, username, password]
    );

    const handleClearError = useCallback(() => setError(""), []);

    const handleForgotPassword = useCallback(
        (e) => {
            e.preventDefault();
            showNotification?.("Please contact your administrator to reset your password.", "info");
        },
        [showNotification]
    );

    // ── Render ──
    return (
        <div className="min-h-screen w-full flex bg-[#F8FAFC] m-0 p-0 relative overflow-hidden">

            {/* ─── Left Brand Panel — desktop only ─── */}
            <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative overflow-hidden bg-gradient-to-br from-[#0F3D2B] via-[#14533A] to-[#0A291D]">
                <MotionDiv
                    className="absolute top-[-15%] right-[-10%] w-[420px] h-[420px] rounded-full bg-secondary/25 blur-[110px] pointer-events-none"
                    animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                />
                <MotionDiv
                    className="absolute bottom-[-15%] left-[-10%] w-[380px] h-[380px] rounded-full bg-white/10 blur-[110px] pointer-events-none"
                    animate={{ x: [0, -15, 0], y: [0, -15, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
                    <div>
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg mb-9">
                            <img src="/logo.png" alt="Passary Refractories" className="h-9 w-9 object-contain" />
                        </div>
                        <h1 className="text-3xl xl:text-[2.25rem] font-extrabold tracking-tight leading-tight">
                            NBD OF CRR
                        </h1>
                        <p className="mt-3 text-white/70 text-[15px] leading-relaxed max-w-sm">
                            Passary Refractories' unified sales, enquiry and order-tracking system.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {FEATURES.map((f) => (
                            <div className="flex items-start gap-3.5" key={f.title}>
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                                    <svg className="h-4 w-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold">{f.title}</p>
                                    <p className="text-[13px] text-white/55 mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-white/40 font-medium">
                        © {new Date().getFullYear()} Passary Refractories. Powered by Botivate.
                    </p>
                </div>
            </div>

            {/* ─── Right Form Panel ─── */}
            <div className="flex-1 flex items-center justify-center relative p-4">

                {/* Background orbs — mobile/tablet only (desktop has its own brand panel) */}
                <MotionDiv
                    className="lg:hidden absolute top-[-25%] left-[-20%] w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px] pointer-events-none"
                    animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                />
                <MotionDiv
                    className="lg:hidden absolute bottom-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full bg-secondary/15 blur-[140px] pointer-events-none"
                    animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />

                <MotionDiv
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 w-full max-w-[400px] bg-white/85 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl shadow-slate-200/60 p-8 lg:bg-white lg:backdrop-blur-none lg:border-none lg:shadow-none"
                    role="main"
                    aria-labelledby="login-heading"
                >
                    {/* ── Mobile branding (hidden on desktop — the left panel covers it) ── */}
                    <div className="lg:hidden">
                        <div className="h-1.5 w-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-secondary to-primary/60" />
                        <MotionDiv
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="flex justify-center mb-4"
                        >
                            <img
                                src="/logo.png"
                                alt="Passary Refractories logo"
                                className="h-16 w-auto object-contain drop-shadow-md"
                                loading="lazy"
                            />
                        </MotionDiv>
                        <h1
                            id="login-heading"
                            className="text-center text-2xl font-extrabold text-[#1A2E35] tracking-tight mb-1"
                        >
                            NBD OF CRR
                        </h1>
                        <p className="text-center text-sm text-muted-foreground mb-7 font-medium">
                            Sign in to your account
                        </p>
                    </div>

                    {/* ── Desktop heading ── */}
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-2xl font-extrabold text-[#1A2E35] tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                            Sign in to continue to your dashboard
                        </p>
                    </div>

                    {/* ─── Error Message ─── */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <MotionDiv
                                key="error"
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="flex items-start gap-3 p-3.5 bg-red-50/90 border border-red-200/70 rounded-xl shadow-sm overflow-hidden"
                                role="alert"
                            >
                                <svg
                                    className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-sm font-medium text-red-700">{error}</p>
                            </MotionDiv>
                        )}
                    </AnimatePresence>

                    {/* ─── Form ─── */}
                    <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>

                        {/* ── Username ── */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
                            >
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    ref={usernameInputRef}
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={handleClearError}
                                    className="w-full h-11 !pl-9 !pr-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-white/70 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 appearance-none box-border hover:border-slate-300"
                                    placeholder="Enter your username"
                                    disabled={isLoading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* ── Password ── */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={handleClearError}
                                    className="w-full h-11 !pl-9 !pr-10 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-white/70 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 appearance-none box-border hover:border-slate-300"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-600 p-1 transition-colors rounded-md hover:bg-slate-100/80"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ── Remember Me + Forgot Password ── */}
                        <div className="flex items-center justify-between pt-0.5">
                            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-600 cursor-pointer select-none group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                        disabled={isLoading}
                                    />
                                    <div
                                        className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all duration-200
                                            ${rememberMe
                                                ? "bg-primary border-primary shadow-sm shadow-primary/20"
                                                : "bg-white border-slate-300 group-hover:border-primary/60"
                                            }`}
                                        aria-hidden="true"
                                    >
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="group-hover:text-slate-800 transition-colors">
                                    Remember me
                                </span>
                            </label>
                            <button
                                type="button"
                                className="text-xs font-semibold text-primary/80 hover:text-primary transition-colors cursor-pointer"
                                onClick={handleForgotPassword}
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* ── Submit ── */}
                        <MotionButton
                            type="submit"
                            disabled={isLoading || !isFormValid}
                            whileHover={!isLoading && isFormValid ? { y: -2 } : {}}
                            whileTap={!isLoading && isFormValid ? { scale: 0.97 } : {}}
                            transition={{ duration: 0.15 }}
                            className={`w-full h-11 mt-2 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all duration-200
                                ${isLoading || !isFormValid
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                    : "bg-primary hover:brightness-110 active:brightness-95 text-primary-foreground shadow-primary/25 hover:shadow-primary/40"
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4.5 w-4.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign In</span>
                                </>
                            )}
                        </MotionButton>
                    </form>

                    {/* ─── Divider + Footer — mobile only (desktop panel already has this) ─── */}
                    <div className="lg:hidden">
                        <div className="relative mt-7 flex items-center">
                            <div className="flex-1 border-t border-slate-200/70" />
                            <span className="mx-3 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                                secure
                            </span>
                            <div className="flex-1 border-t border-slate-200/70" />
                        </div>

                        <p className="mt-5 text-center text-[11px] text-[#9CA3AF] font-medium">
                            Powered by{" "}
                            <a
                                href="https://botivate.in/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-semibold hover:underline underline-offset-2"
                            >
                                Botivate
                            </a>
                        </p>
                    </div>
                </MotionDiv>
            </div>
        </div>
    );
}

export default Login;
