import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; // Corrected path to root services
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button'; // Corrected path to root components
import Input from '../../components/ui/Input'; // Corrected path to root components
import Card from '../../components/ui/Card'; // Corrected path to root components

const AccountSettings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [session, setSession] = useState<any>(null);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async () => {
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            toast.success("Password updated successfully!");
            setPassword('');
            setConfirmPassword('');
            // If in recovery mode, maybe redirect after success
            if (isRecovery) {
                // Optional: redirect to dashboard or show "Recovery Complete"
                setIsRecovery(false);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="flex justify-center items-center h-full text-gray-400">
                Please log in to manage your account.
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-3xl font-bold text-white mb-8">
                {isRecovery ? "Reset Your Password" : "Account Settings"}
            </h1>

            <Card className="p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
                    {isRecovery ? "Set New Password" : "Update Password"}
                </h2>
                <div className="space-y-4">
                    <Input
                        label="New Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                    />
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleUpdatePassword}
                            isLoading={loading}
                            variant="primary"
                        >
                            {isRecovery ? "Set Password" : "Update Password"}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="mt-8 text-sm text-gray-500 text-center">
                User ID: {session.user.id}
            </div>
        </div>
    );
};

export default AccountSettings;
