"use client";

import { useState, useContext, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../App";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, Check, ClipboardList, Activity, ShieldCheck, ArrowRight } from "lucide-react";

const MotionDiv = motion.div;
const MotionButton = motion.button;

const inputClass =
  "w-full h-[52px] !pl-11 border-2 border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 bg-white transition-all duration-200 appearance-none box-border hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:opacity-60";

const FEATURES = [
  { icon: ClipboardList, label: "Track Every Enquiry", desc: "From first contact to closed order" },
  { icon: Activity, label: "Real-Time Dashboard", desc: "Live status across every module" },
  { icon: ShieldCheck, label: "Secure & Reliable", desc: "Role-based access, always in sync" },
];

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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 lg:grid lg:grid-cols-2">
        {/* Left branding panel — desktop only */}
        <div className="hidden lg:flex relative flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-10 xl:p-12">
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          <MotionDiv
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/95 shadow-lg ring-1 ring-indigo-400/30">
              <img src="/logo.png" alt="Passary Refractories logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">Passary Refractories</p>
              <p className="text-xs font-semibold text-white/60">NBD OF CRR</p>
            </div>
          </MotionDiv>

          <div className="relative z-10 flex flex-1 flex-col justify-center py-10">
            <MotionDiv
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[30px] font-extrabold leading-[1.2] tracking-tight text-white">
                Sales &amp; enquiry
                <br />
                operations, unified.
              </h2>
              <p className="mt-3 max-w-sm text-sm font-medium text-white/70">
                Every lead, enquiry, offer and complaint — tracked end to end, in one place.
              </p>

              <div className="mt-8 space-y-4">
                {FEATURES.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-xs font-medium text-white/60">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionDiv>
          </div>
        </div>

        {/* Right — login form */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[380px]"
          >
            {/* Brand — mobile only */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <img src="/logo.png" alt="Passary Refractories logo" className="mb-4 h-14 w-14 object-contain" />
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">NBD OF CRR</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Sign in to continue to your dashboard</p>
            </div>

            <div className="hidden lg:block mb-8">
              <span className="mb-4 inline-block h-1.5 w-12 rounded-full bg-primary" />
              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Sign in to continue to your dashboard</p>
            </div>

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
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rose-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-rose-700">{error}</p>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="h-[18px] w-[18px]" aria-hidden="true" />
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
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-[18px] w-[18px]" aria-hidden="true" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded border-2 transition-colors ${
                      rememberMe
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white group-hover:border-primary/60"
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30`}
                  >
                    {rememberMe && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                  </span>
                  <span className="transition-colors group-hover:text-slate-800">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-semibold text-primary/80 transition-colors hover:text-primary hover:underline underline-offset-2"
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
                className={`group/btn mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-all duration-200 ${
                  isLoading || !isFormValid
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-indigo-800 active:brightness-95"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover/btn:translate-x-0.5" aria-hidden="true" />
                  </>
                )}
              </MotionButton>
            </form>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}

export default Login;
