"use client";

import { useState, useContext, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../App";

const MotionDiv = motion.div;
const MotionButton = motion.button;

const inputClass =
  "w-full h-11 !pl-10 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-white transition-all duration-200 appearance-none box-border hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:opacity-60";

function Login() {
  const { login, showNotification } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const usernameInputRef = useRef(null);
  const isFormValid = username.trim().length > 0 && password.length > 0;

  // Restore remembered username
  useEffect(() => {
    try {
      if (localStorage.getItem("rememberMe") === "true") {
        setRememberMe(true);
        const saved = localStorage.getItem("savedUsername");
        if (saved) setUsername(saved);
      }
    } catch {
      /* ignore */
    }
    usernameInputRef.current?.focus();
  }, []);

  const persistRemember = useCallback((remember, name) => {
    try {
      localStorage.setItem("rememberMe", String(remember));
      if (remember && name.trim()) localStorage.setItem("savedUsername", name.trim());
      else localStorage.removeItem("savedUsername");
    } catch {
      /* ignore */
    }
  }, []);

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
          persistRemember(rememberMe, username);
          navigate("/", { replace: true });
        } else {
          setError("Invalid username or password. Please try again.");
          setPassword("");
          usernameInputRef.current?.focus();
        }
      } catch (err) {
        console.error("[Login Error]", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [login, navigate, username, password, rememberMe, persistRemember]
  );

  const clearError = useCallback(() => setError(""), []);

  const handleForgotPassword = useCallback(
    (e) => {
      e.preventDefault();
      showNotification?.(
        "Please contact your administrator to reset your password.",
        "info"
      );
    },
    [showNotification]
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px]"
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Passary Refractories logo"
            className="mb-4 h-14 w-14 object-contain"
          />
          <h1 className="text-xl font-extrabold tracking-tight text-[#1A2E35]">
            NBD OF CRR
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          {/* Error */}
          <AnimatePresence initial={false}>
            {error && (
              <MotionDiv
                key="error"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 18 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
                role="alert"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
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
                  <p className="text-[13px] font-medium text-red-700">{error}</p>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Username
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                <input
                  ref={usernameInputRef}
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={clearError}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={`${inputClass} !pr-3`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={clearError}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={`${inputClass} !pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="group flex cursor-pointer select-none items-center gap-2.5 text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                    rememberMe
                      ? "border-primary bg-primary"
                      : "border-slate-300 bg-white group-hover:border-primary/60"
                  } peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30`}
                >
                  {rememberMe && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="transition-colors group-hover:text-slate-800">Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-primary/80 transition-colors hover:text-primary hover:underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <MotionButton
              type="submit"
              disabled={isLoading || !isFormValid}
              whileTap={!isLoading && isFormValid ? { scale: 0.98 } : {}}
              transition={{ duration: 0.15 }}
              aria-busy={isLoading}
              className={`mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                isLoading || !isFormValid
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:brightness-110 active:brightness-95"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </MotionButton>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} Passary Refractories · Powered by{" "}
          <a
            href="https://botivate.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-500 transition-colors hover:text-primary hover:underline underline-offset-2"
          >
            Botivate
          </a>
        </p>
      </MotionDiv>
    </div>
  );
}

export default Login;
