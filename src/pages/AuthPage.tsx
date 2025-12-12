import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, ArrowRight, Loader2, Key, Github, Chrome } from 'lucide-react';
import { GoogleIcon } from '../../components/icons';
import { Toaster, toast } from 'react-hot-toast';

interface AuthPageProps {
    initialView?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialView = 'login' }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI Mode State
    // 'login' | 'signup' | 'reset' | 'magic_link'
    const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'magic_link'>(
        initialView === 'signup' ? 'signup' : 'login'
    );

    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync internal mode if prop changes (optional, but good for navigation)
    useEffect(() => {
        if (initialView === 'signup') {
            setMode('signup');
        } else if (initialView === 'login' && mode === 'signup') {
            // Only switch back to login if we were in signup, don't override reset/magic
            setMode('login');
        }
    }, [initialView]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                },
            });
            if (error) throw error;
        } catch (error: any) {
            setError(error.message || 'An error occurred with Google Login');
            toast.error(error.message);
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/account-settings',
            });
            if (error) throw error;
            setSent(true);
            toast.success("Password reset email sent!");
        } catch (error: any) {
            setError(error.message || 'An error occurred');
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                // Registration
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/dashboard',
                    }
                });
                if (error) throw error;
                if (data.user && data.session) {
                    navigate('/dashboard');
                } else {
                    setSent(true); // Confirmation email sent
                }

            } else if (mode === 'login') {
                // Password Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                navigate('/dashboard');

            } else if (mode === 'magic_link') {
                // Magic Link Login
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: window.location.origin + '/dashboard',
                    },
                });

                if (error) throw error;
                setSent(true);
            }
        } catch (error: any) {
            setError(error.message || 'An error occurred');
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to switch modes and clear state
    const switchMode = (newMode: typeof mode) => {
        setMode(newMode);
        setError(null);
        setSent(false);
        // We ensure URL matches somewhat for refreshed ux, though simple state switch is faster
        if (newMode === 'signup') navigate('/signup');
        if (newMode === 'login') navigate('/login');
    };

    // Render configuration based on mode
    const getHeadline = () => {
        if (sent) return mode === 'signup' ? 'Check your email' : 'Check your inbox';
        switch (mode) {
            case 'signup': return 'Create your account';
            case 'reset': return 'Reset Password';
            case 'magic_link': return 'Sign in with Magic Link';
            default: return 'Sign in to your account';
        }
    };

    const getSubheadline = () => {
        if (sent) return `We've sent a link to ${email}`;
        switch (mode) {
            case 'signup': return 'Start your 14-day free trial. No credit card required.';
            case 'reset': return "Enter your email and we'll send you a recovery link.";
            case 'magic_link': return 'We will email you a passwordless login link.';
            default: return 'Enter your details to access your dashboard.';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans">
            <Toaster />
            {/* Left Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-indigo-900/20 relative items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-950 z-0" />
                <div className="relative z-10 max-w-lg">
                    <div className="mb-8 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 overflow-hidden bg-slate-900">
                        {/* Ensure logo exists or fallback */}
                        <img src="/logo.jpg" alt="SEO Master" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        <Zap className="w-10 h-10 text-indigo-400 absolute" style={{ display: 'none' }} />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6">
                        {mode === 'signup' ? "Start Ranking Higher Today" : "Welcome Back to SEO Master"}
                    </h2>
                    <p className="text-indigo-200 text-lg leading-relaxed">
                        {mode === 'signup'
                            ? "Join thousands of SEO professionals using our Hybrid AI engine to dominate SERPs. Automate your workflow with enterprise-grade precision."
                            : "Access your campaigns, manage AI models, and track real-time rankings. Your command center for SEO dominance."
                        }
                    </p>
                </div>
                {/* Decorative Circles */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl opacity-50" />
                <div className="absolute top-24 right-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-bold text-white tracking-tight">{getHeadline()}</h1>
                        <p className="mt-2 text-slate-400">{getSubheadline()}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm shadow-xl">
                        {sent ? (
                            <div className="text-center py-8 space-y-6">
                                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                                    <Mail className="w-8 h-8 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Email Sent</h3>
                                    <p className="text-slate-400 mt-2">
                                        We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                                        Please check your inbox (and spam folder) to continue.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setSent(false); if (mode === 'reset') switchMode('login'); }}
                                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline"
                                >
                                    {mode === 'reset' ? 'Return to Login' : 'Use a different email'}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Google Login Button - Global for Login and Signup */}
                                {mode !== 'reset' && (
                                    <>
                                        <button
                                            onClick={handleGoogleLogin}
                                            type="button"
                                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all mb-6"
                                        >
                                            <GoogleIcon className="w-5 h-5" />
                                            <span>Continue with Google</span>
                                        </button>

                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-700"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-2 bg-slate-900 text-slate-500 rounded">Or continue with email</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <form onSubmit={mode === 'reset' ? handleResetPassword : handleAuth} className="space-y-5">

                                    {/* Email Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
                                                placeholder="name@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Fields - Hidden for Magic Link */}
                                    {mode !== 'magic_link' && mode !== 'reset' && (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Key className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        required
                                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
                                                        placeholder="••••••••"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {mode === 'signup' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Confirm Password</label>
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="password"
                                                            required
                                                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
                                                            placeholder="••••••••"
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Forgot Password Link (Login Mode Only) */}
                                    {mode === 'login' && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setMode('reset')}
                                                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                            <Lock className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>
                                                    {mode === 'signup' ? 'Create Account' :
                                                        mode === 'reset' ? 'Send Reset Link' :
                                                            mode === 'magic_link' ? 'Send Magic Link' : 'Sign In'}
                                                </span>
                                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>

                                    {/* Alternate Login Modes (Toggle between Password/Magic Link) */}
                                    {mode !== 'signup' && mode !== 'reset' && (
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setMode(mode === 'login' ? 'magic_link' : 'login')}
                                                className="text-sm text-slate-400 hover:text-white transition-colors"
                                            >
                                                {mode === 'login' ? 'Or sign in with a magic link' : 'Or sign in with password'}
                                            </button>
                                        </div>
                                    )}
                                </form>

                                {/* Footer Links (Login <-> Signup) */}
                                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                    {mode === 'signup' ? (
                                        <p className="text-slate-400">
                                            Already have an account?{' '}
                                            <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                                                Sign in
                                            </button>
                                        </p>
                                    ) : (
                                        <p className="text-slate-400">
                                            Don't have an account?{' '}
                                            <button onClick={() => switchMode('signup')} className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                                                Sign up for free
                                            </button>
                                        </p>
                                    )}
                                    {mode === 'reset' && (
                                        <button onClick={() => switchMode('login')} className="block w-full text-center mt-4 text-slate-400 hover:text-white text-sm">
                                            &larr; Back to Login
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
