import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { UserIcon, LockIcon, CheckIcon } from './icons';
import { toast } from 'react-hot-toast';

const AccountSettings: React.FC = () => {
    const context = useContext(AppContext);
    const { session, supabase } = context || {};

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (session?.user?.email) {
            setEmail(session.user.email);
        }
    }, [session]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters." });
            return;
        }

        if (!supabase) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setMessage({ type: 'success', text: "Password updated successfully!" });
            setPassword('');
            setConfirmPassword('');
            toast.success("Password updated successfully!");
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "Failed to update password." });
            toast.error(error.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-gray-400 mb-8">Manage your profile and security preferences.</p>

            <div className="space-y-6">
                {/* Profile Card */}
                <Card>
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-900/30 rounded-full text-blue-400">
                            <UserIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Profile Information</h2>
                            <p className="text-gray-400 text-sm">Your basic account details.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                            <div className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-300">
                                {email || 'Loading...'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed directly.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                            <div className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-500 font-mono text-xs">
                                {session?.user?.id || '...'}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Security Card */}
                <Card>
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-purple-900/30 rounded-full text-purple-400">
                            <LockIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Security</h2>
                            <p className="text-gray-400 text-sm">Update your password.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                        <Input
                            label="New Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />

                        {message && (
                            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-900/20 text-green-300 border border-green-800' : 'bg-red-900/20 text-red-300 border border-red-800'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" variant="primary" isLoading={loading} disabled={!password || !confirmPassword}>
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default AccountSettings;
