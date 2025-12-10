import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Zap, Globe, Shield } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="SEO Master Logo" className="w-10 h-10 rounded-lg object-cover" />
                        <span className="font-bold text-xl tracking-tight">SEO Master</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white transition-colors">
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 bg-white text-slate-950 rounded-full font-medium hover:bg-slate-200 transition-all transform hover:scale-105"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />

                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        New: Hybrid Architecture Available
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent pb-2">
                        Master Your SEO with <br /> AI-Powered Precision
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        The only platform that combines real-time DataForSEO intelligence with advanced LLM content generation.
                        Stop guessing, start ranking.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group"
                        >
                            Start Free Trial
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all border border-white/5">
                            View Demo
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Globe className="w-6 h-6 text-blue-400" />}
                            title="Real-Time SERP Data"
                            desc="Direct integration with DataForSEO APIs to get live ranking data, keywords, and competitor analysis."
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-400" />}
                            title="Hybrid AI Engine"
                            desc="Switch seamlessly between OpenAI, DeepSeek, and Gemini models. Bring your own key or use our SaaS infrastructure."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-emerald-400" />}
                            title="Enterprise Security"
                            desc="Built on a secure bastion architecture with data isolation and encrypted credential management."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400">Choose the plan that fits your SEO needs.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard
                            name="Free"
                            price="$0"
                            features={['10 Daily Keyword Lookups', 'Standard AI Models', 'Community Support']}
                            cta="Start Free"
                            action={() => navigate('/login')}
                        />
                        <PricingCard
                            name="Pro"
                            price="$29"
                            features={['Unlimited Keyword Lookups', 'GPT-4 & Claude 3 Opus', 'Priority Support', 'Access to APIs']}
                            popular
                            cta="Get Pro"
                            action={() => navigate('/login?plan=pro')}
                        />
                        <PricingCard
                            name="Agency"
                            price="$99"
                            features={['Everything in Pro', 'White Label Reports', 'Multi-User Teams', 'Dedicated Account Manager']}
                            cta="Contact Sales"
                            action={() => navigate('/contact')}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
                    <p>© 2024 Mistorify Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
        <div className="mb-4 p-3 rounded-lg bg-slate-900 w-fit group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard = ({ name, price, features, popular, cta, action }: any) => (
    <div className={`p-8 rounded-2xl border flex flex-col ${popular ? 'bg-indigo-900/10 border-indigo-500/50 relative' : 'bg-white/5 border-white/5'}`}>
        {popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                Most Popular
            </div>
        )}
        <h3 className="text-lg font-medium text-slate-300 mb-2">{name}</h3>
        <div className="text-4xl font-bold text-white mb-6">{price}<span className="text-lg text-slate-500 font-normal">/mo</span></div>
        <ul className="space-y-4 mb-8 flex-1">
            {features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-slate-400">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span className="text-sm">{f}</span>
                </li>
            ))}
        </ul>
        <button
            onClick={action}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${popular
                ? 'bg-white text-slate-950 hover:bg-slate-200'
                : 'bg-white/10 text-white hover:bg-white/20'
                }`}
        >
            {cta}
        </button>
    </div>
);
