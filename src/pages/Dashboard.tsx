import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Activity, FileText, Search, User } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // Fetch profile data (credits, tier)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) setProfile(data);
            setLoading(false);
        };

        fetchProfile();
    }, [navigate]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Top Bar */}
            <header className="h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.jpg" alt="Brand" className="w-8 h-8 rounded-md object-cover" />
                    <div className="font-bold text-xl tracking-tight">SEO Master <span className="text-slate-500 text-sm font-normal ml-2">Console</span></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {profile?.credits_balance || 0} Credits
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={handleSignOut}>
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-300">Sign Out</span>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <aside className="w-64 border-r border-white/5 bg-slate-900/30 p-4 space-y-2 hidden md:block">
                    <NavItem icon={<Activity />} label="Overview" active />
                    <NavItem icon={<Search />} label="Keyword Research" onClick={() => navigate('/app/keywords')} />
                    <NavItem icon={<FileText />} label="Article Writer" onClick={() => navigate('/app/writer')} />
                    <NavItem icon={<CreditCard />} label="Billing" />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
                            <p className="text-slate-400">Here's what's happening with your SEO projects.</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Current Plan" value={profile?.subscription_tier?.toUpperCase() || 'FREE'} sub="Upgrade for more features" />
                            <StatCard title="Credits Available" value={profile?.credits_balance || 0} sub="Refills on Nov 1st" highlight />
                            <StatCard title="Words Generated" value="12,450" sub="This month" />
                        </div>

                        {/* Quick Actions */}
                        <div className="gap-6 grid md:grid-cols-2">
                            <div
                                onClick={() => navigate('/app/keywords')}
                                className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group"
                            >
                                <div className="p-3 bg-indigo-500/10 w-fit rounded-lg mb-4 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Search className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">New Keyword Research</h3>
                                <p className="text-slate-400">Analyze keyword difficulty, volume, and SERP data in real-time.</p>
                            </div>

                            <div
                                onClick={() => navigate('/app/writer')}
                                className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-slate-900 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group"
                            >
                                <div className="p-3 bg-purple-500/10 w-fit rounded-lg mb-4 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Write New Article</h3>
                                <p className="text-slate-400">Generate high-ranking content using our Hybrid AI engine.</p>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${active ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        {React.cloneElement(icon, { size: 20 })}
        <span className="font-medium">{label}</span>
    </div>
);

const StatCard = ({ title, value, sub, highlight }: any) => (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
        <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
        <div className={`text-3xl font-bold mb-1 ${highlight ? 'text-indigo-400' : 'text-white'}`}>{value}</div>
        <div className="text-xs text-slate-500">{sub}</div>
    </div>
);
