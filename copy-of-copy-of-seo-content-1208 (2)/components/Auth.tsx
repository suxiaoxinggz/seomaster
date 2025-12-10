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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // If supabase is missing but we have onSkip, allow rendering to show the skip button
    if (!supabase && !onSkip) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <Card>
                    <p className="text-center text-gray-300">Initializing...</p>
                </Card>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        setMessage('');
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };
    
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        setMessage('');
        setError('');

        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Registration successful! Please check your email to confirm your account.');
        }
        setLoading(false);
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        setMessage('');
        setError('');
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the login link!');
        }
        setLoading(false);
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
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required={!onSkip} 
                            />
                            <Input
                                id="password"
                                label="密码"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required={!onSkip}
                            />
                        </div>
                        <div className="mt-6 space-y-2">
                             <Button type="submit" isLoading={loading} className="w-full" disabled={!supabase}>
                                登录
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleSignup} isLoading={loading} className="w-full" disabled={!supabase}>
                                注册
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleMagicLink} isLoading={loading} className="w-full" disabled={!supabase}>
                                使用魔法链接登录
                            </Button>
                            {onSkip && (
                                <div className="pt-2 border-t border-gray-700 mt-2">
                                     <Button type="button" variant="secondary" onClick={onSkip} className="w-full bg-gray-700 hover:bg-gray-600">
                                        访客模式 (无需登录)
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                    {message && <p className="mt-4 text-center text-green-400">{message}</p>}
                    {error && <p className="mt-4 text-center text-red-400">{error}</p>}
                    {!supabase && !onSkip && <p className="mt-4 text-center text-yellow-500 text-sm">数据库连接未配置。</p>}
                </Card>
            </div>
        </div>
    );
};

export default Auth;