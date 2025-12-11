import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface AuthProps {
    onSkip?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSkip }) => {
    const context = useContext(AppContext);
    const { supabase } = context || {};

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [validationError, setValidationError] = useState('');

    // Check initialization
    React.useEffect(() => {
        // Simulate a brief check or wait for supabase to be ready if needed
        // In this context, context is already provided, so we just unset initializing
        if (context) {
            setInitializing(false);
        }
    }, [context]);

    const validateForm = () => {
        setValidationError('');
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setValidationError('请输入有效的电子邮件地址。');
            return false;
        }
        if (!password || password.length < 6) {
            setValidationError('密码长度至少需要6个字符。');
            return false;
        }
        return true;
    };

    // If supabase is missing but we have onSkip, allow rendering to show the skip button
    if ((!supabase && !onSkip) || initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <Card>
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-center text-gray-300">系统初始化中...</p>
                    </div>
                </Card>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        if (!validateForm()) return;

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? '邮箱或密码错误，请重试。' : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        if (!validateForm()) return;

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setMessage('注册成功！请检查您的邮箱以确认帐户。');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setValidationError('请输入有效的电子邮件地址以发送魔法链接。');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            setMessage('登录链接已发送！请检查您的邮箱。');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-md p-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">SEO Copilot</h1>
                    <p className="text-lg text-gray-400 mt-2">您的内容策略云平台</p>
                </div>
                <Card>
                    <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <Input
                                id="email"
                                label="邮箱"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setValidationError(''); setError(''); }}
                                placeholder="you@example.com"
                                required={!onSkip}
                            />
                            <Input
                                id="password"
                                label="密码"
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setValidationError(''); setError(''); }}
                                placeholder="••••••••"
                                required={!onSkip}
                            />
                        </div>

                        {(error || validationError) && (
                            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md">
                                <p className="text-center text-red-400 text-sm">{validationError || error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded-md">
                                <p className="text-center text-green-400 text-sm">{message}</p>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <Button type="submit" isLoading={loading} className="w-full" disabled={!supabase || loading}>
                                登录
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" variant="secondary" onClick={handleSignup} isLoading={loading} className="w-full" disabled={!supabase || loading}>
                                    注册
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleMagicLink} isLoading={loading} className="w-full" disabled={!supabase || loading}>
                                    魔法链接
                                </Button>
                            </div>

                            {onSkip && (
                                <div className="pt-4 border-t border-gray-700 mt-2">
                                    <Button type="button" variant="secondary" onClick={onSkip} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400">
                                        访客模式 (无需登录)
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                    {!supabase && !onSkip && <p className="mt-4 text-center text-yellow-500 text-xs">数据库连接未配置。</p>}
                </Card>
            </div>
        </div>
    );
};

export default Auth;