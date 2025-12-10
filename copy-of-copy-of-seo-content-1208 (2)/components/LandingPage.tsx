
import React, { useState } from 'react';
import Button from './ui/Button';
import { 
    WandIcon, 
    ChartBarIcon, 
    GlobeIcon, 
    DocumentIcon, 
    LightningIcon, 
    CheckIcon,
    DatabaseIcon,
    ImageIcon,
} from './icons';
import Auth from './Auth';

interface LandingPageProps {
    onLoginClick: () => void;
}

const FeatureCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    desc: string; 
    delay?: string 
}> = ({ icon, title, desc, delay = "0s" }) => (
    <div 
        className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 backdrop-blur-sm"
        style={{ animationDelay: delay }}
    >
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-blue-400 group-hover:text-white group-hover:scale-110 transition-all duration-500 mb-6 shadow-lg shadow-black/50">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
    </div>
);

const StepCard: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex flex-col items-center text-center p-6 relative z-10">
        <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold mb-4 font-mono">
            {number}
        </div>
        <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
        <p className="text-sm text-gray-400 max-w-xs">{children}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const handleAuthOpen = () => setIsAuthOpen(true);
    const handleAuthClose = () => setIsAuthOpen(false);

    return (
        <div className="min-h-screen bg-[#050507] text-gray-100 font-sans selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute top-[20%] left-[20%] w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 w-full border-b border-white/5 backdrop-blur-md bg-[#050507]/70 sticky top-0">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">
                            M
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Mistorify <span className="text-blue-500">SEO</span></span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
                        <button onClick={handleAuthOpen} className="hover:text-white transition-colors">Pricing</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handleAuthOpen} className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block">
                            Log In
                        </button>
                        <Button onClick={handleAuthOpen} className="shadow-lg shadow-blue-900/20 rounded-full px-6">
                            Start for Free
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 pt-24 pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8 animate-fade-in-up">
                        <LightningIcon className="w-3 h-3" />
                        <span>v3.2 is now live with DeepSeek & Gemini 2.0</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1] animate-fade-in-up">
                        The Operating System for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400">Modern SEO Strategy</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Stop guessing. Start dominating. Mistorify combines industrial-grade data intelligence with next-gen AI to automate your entire content workflow—from keyword discovery to publishing.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <Button onClick={handleAuthOpen} size="lg" className="rounded-full px-8 h-14 text-base shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
                            Get Started Free
                        </Button>
                        <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 h-14 rounded-full border border-gray-700 text-gray-300 hover:bg-white/5 hover:text-white hover:border-gray-500 transition-all font-medium text-base">
                            Explore Features
                        </button>
                    </div>

                    {/* Abstract UI Preview */}
                    <div className="mt-20 relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent z-20 h-full w-full"></div>
                        <div className="bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-w-4xl mx-auto transform rotate-x-12 perspective-1000 opacity-90 hover:opacity-100 transition-opacity duration-700">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0a0c10]">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                <div className="ml-4 h-6 w-64 bg-white/5 rounded-md"></div>
                            </div>
                            <div className="p-8 grid grid-cols-3 gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                                <div className="col-span-1 h-64 bg-white/5 rounded-lg border border-white/5"></div>
                                <div className="col-span-2 h-64 bg-white/5 rounded-lg border border-white/5"></div>
                                <div className="col-span-3 h-32 bg-white/5 rounded-lg border border-white/5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="py-32 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Complete SEO Command Center</h2>
                        <p className="text-gray-400">Everything you need to scale from 0 to 1M+ visitors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard 
                            icon={<DatabaseIcon className="w-6 h-6" />}
                            title="Data Intelligence"
                            desc="Real-time keyword metrics, search volume trends, and clickstream data directly from Google & Amazon APIs."
                            delay="0s"
                        />
                        <FeatureCard 
                            icon={<WandIcon className="w-6 h-6" />}
                            title="Keyword Cartography"
                            desc="Visualize your niche. Automatically cluster keywords into user-intent maps (Awareness -> Action) for perfect topical authority."
                            delay="0.1s"
                        />
                        <FeatureCard 
                            icon={<DocumentIcon className="w-6 h-6" />}
                            title="AI Content Engine"
                            desc="Draft SEO-optimized articles in seconds using Claude 3.5, GPT-4o, or DeepSeek. Structured, factual, and engaging."
                            delay="0.2s"
                        />
                        <FeatureCard 
                            icon={<ChartBarIcon className="w-6 h-6" />}
                            title="SERP Reverse Engineering"
                            desc="Analyze top competitors' structures. Extract headings, PAA (People Also Ask), and LSI keywords to outrank them."
                            delay="0.3s"
                        />
                        <FeatureCard 
                            icon={<ImageIcon className="w-6 h-6" />}
                            title="AI Image Studio"
                            desc="Generate stunning, copyright-free visuals for your posts using Flux.1, Midjourney (via proxy), or DALL-E 3."
                            delay="0.4s"
                        />
                        <FeatureCard 
                            icon={<GlobeIcon className="w-6 h-6" />}
                            title="Global Localization"
                            desc="Expand internationally. Translate and culturally adapt content into 10+ languages with DeepL and LLM precision."
                            delay="0.5s"
                        />
                    </div>
                </div>
            </section>

            {/* Workflow Section */}
            <section id="workflow" className="py-24 bg-gradient-to-b from-[#050507] to-[#0a0c10] relative">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Zen Workflow</h2>
                        <p className="text-gray-400">Complexity reduced to a straight line.</p>
                    </div>

                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent hidden md:block"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                            <StepCard number="01" title="Discover">
                                Input a seed keyword. Get a comprehensive map of high-traffic, low-competition opportunities.
                            </StepCard>
                            <StepCard number="02" title="Analyze">
                                Inspect the SERP. Understand search intent and structure your outline based on data.
                            </StepCard>
                            <StepCard number="03" title="Create">
                                Generate articles and images. Refine with AI that understands SEO nuance.
                            </StepCard>
                            <StepCard number="04" title="Publish">
                                Sync directly to WordPress, Shopify, or export to Markdown/HTML. One click.
                            </StepCard>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="relative rounded-3xl bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 p-12 text-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]"></div>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
                        
                        <h2 className="relative z-10 text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                            Ready to scale your organic traffic?
                        </h2>
                        <p className="relative z-10 text-lg text-gray-300 mb-10 max-w-xl mx-auto">
                            Join the new wave of SEO professionals using Mistorify to build digital empires efficiently.
                        </p>
                        <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
                            <Button onClick={handleAuthOpen} size="lg" className="px-10 py-4 text-lg rounded-full">
                                Start Building Now
                            </Button>
                        </div>
                        
                        <div className="relative z-10 mt-8 flex justify-center gap-6 text-sm text-gray-500">
                            <span className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/> No credit card required</span>
                            <span className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/> Free tier available</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#020203] py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-500 text-sm">
                        &copy; 2024 Mistorify Inc. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-gray-400">
                        <a href="https://mistorify.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Home</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </footer>

            {/* Auth Modal Wrapper */}
            {isAuthOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="w-full max-w-md relative">
                        <button 
                            onClick={handleAuthClose} 
                            className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        <Auth onSkip={() => {
                            handleAuthClose();
                            onLoginClick(); // Trigger the parent login flow (Guest mode)
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
