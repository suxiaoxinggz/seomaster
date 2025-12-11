import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, ArrowRight, Loader2, Key } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

export const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordMode, setIsPasswordMode] = useState(true); // Default to password mode as requested
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isPasswordMode) {
                // Password Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // Success is handled by onAuthStateChange in ToolApp, but we can also redirect
                navigate('/dashboard');
            } else {
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

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans">
            <Toaster />
            {/* Left Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-indigo-900/20 relative items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-950 z-0" />
                <div className="relative z-10 max-w-lg">
                    <div className="mb-8 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 overflow-hidden">
                        <img src="/logo.jpg" alt="SEO Master" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6">Welcome to SEO Master SaaS</h2>
                    <p className="text-indigo-200 text-lg leading-relaxed">
                        Join thousands of professionals using our Hybrid AI engine to dominate SERPs.
                        Safe, Secure, and Scalable.
                    </p>
                </div>
                {/* Decorative Circles */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl" />
                <div className="absolute top-24 right-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-bold text-white">Sign in to your account</h1>
                        <p className="mt-2 text-slate-400">
                            {isPasswordMode ? 'Enter your credentials to access your dashboard.' : 'Enter your email for a passwordless magic link.'}
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                        {sent && !isPasswordMode ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Check your email</h3>
                                <p className="text-slate-400">We sent a magic link to <span className="text-white font-medium">{email}</span></p>
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-indigo-400 hover:text-indigo-300 text-sm mt-4 font-medium"
                                >
                                    Try another email
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                {/* Toggle */}
                                <div className="flex bg-slate-900/50 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordMode(true)}
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isPasswordMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Password
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordMode(false)}
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isPasswordMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Magic Link
                                    </button>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {isPasswordMode && (
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-slate-500" />
                                            </div>
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                required={isPasswordMode}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {isPasswordMode ? 'Sign In' : 'Send Magic Link'}
                                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
