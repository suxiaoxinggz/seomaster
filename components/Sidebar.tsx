
import React, { useContext, useState } from 'react';
import { Page } from '../types';
import { WandIcon, SettingsIcon, DashboardIcon, DocumentIcon, ImageIcon, GlobeIcon, PublishIcon, ChartBarIcon, RobotIcon, DatabaseIcon, UserIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface SidebarProps {
    currentPage: Page;
    setPage: (page: Page) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isComingSoon?: boolean;
    onClick: () => void;
    isCollapsed: boolean;
}> = ({ icon, label, isActive, isComingSoon, onClick, isCollapsed }) => (
    <button
        onClick={onClick}
        disabled={isComingSoon}
        title={isCollapsed ? label : undefined}
        className={`group relative flex items-center w-full px-4 py-3 my-1 transition-all duration-300 rounded-lg overflow-hidden ${isActive
            ? 'bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-blue-400 border border-blue-500/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
            } ${isComingSoon ? 'cursor-not-allowed opacity-50' : ''}`}
    >
        <div className={`flex-shrink-0 w-5 h-5 transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
            {icon}
        </div>

        <div className={`ml-3 whitespace-nowrap transition-all duration-300 origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px]' : 'opacity-100 w-auto translate-x-0'
            }`}>
            <span className="text-sm font-medium">{label}</span>
        </div>

        {!isCollapsed && isComingSoon && (
            <span className="absolute right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-800 text-gray-500 ml-auto whitespace-nowrap">
                Soon
            </span>
        )}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage }) => {
    const context = useContext(AppContext);
    const { supabase, session } = context || {};
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out bg-[#0a0c10] border-r border-white/5 flex flex-col shrink-0 relative z-20`}>
            {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-white/5 bg-gradient-to-b from-blue-900/5 to-transparent relative overflow-hidden">
                <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 translate-x-[-20px] absolute' : 'opacity-100 translate-x-0'}`}>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight whitespace-nowrap">SEO Copilot</h1>
                    <p className="text-xs text-gray-500 truncate mt-1 max-w-[180px]">{session?.user?.email || 'Guest User'}</p>
                </div>

                {/* Collapsed Logo */}
                <div className={`absolute left-0 right-0 flex justify-center transition-all duration-300 ${isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                    <h1 className="font-bold text-blue-400 text-xl tracking-tighter">SC</h1>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-900 border border-gray-600 rounded-full p-1.5 text-gray-400 hover:text-white hover:border-blue-500 transition-all shadow-lg z-50 group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''} group-hover:scale-110`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col justify-between overflow-y-auto overflow-x-hidden px-3 py-6 custom-scrollbar">
                <nav>
                    <div className={`px-4 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        Strategy
                    </div>
                    <div className="space-y-1 mb-8">
                        <NavItem icon={<DashboardIcon />} label="Overview" isActive={currentPage === 'dashboard'} onClick={() => setPage('dashboard')} isCollapsed={isCollapsed} />
                        <NavItem icon={<ChartBarIcon />} label="SEO Data Center" isActive={currentPage === 'seo-data'} onClick={() => setPage('seo-data')} isCollapsed={isCollapsed} />
                        <NavItem icon={<DatabaseIcon />} label="Data Library" isActive={currentPage === 'seo-assets'} onClick={() => setPage('seo-assets')} isCollapsed={isCollapsed} />
                        <NavItem icon={<RobotIcon />} label="SEO Strategy & Code" isActive={currentPage === 'seo-strategy'} onClick={() => setPage('seo-strategy')} isCollapsed={isCollapsed} />
                        <NavItem icon={<WandIcon />} label="Keyword Map" isActive={currentPage === 'keyword-map'} onClick={() => setPage('keyword-map')} isCollapsed={isCollapsed} />
                        <NavItem icon={<DocumentIcon />} label="Articles" isActive={currentPage === 'outline-article'} onClick={() => setPage('outline-article')} isCollapsed={isCollapsed} />
                    </div>

                    <div className={`px-4 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        Creation
                    </div>
                    <div className="space-y-1">
                        <NavItem icon={<ImageIcon />} label="Image Studio" isActive={currentPage === 'image-text'} onClick={() => setPage('image-text')} isCollapsed={isCollapsed} />
                        <NavItem icon={<GlobeIcon />} label="Localization" isActive={currentPage === 'localization'} isComingSoon={false} onClick={() => setPage('localization')} isCollapsed={isCollapsed} />
                        <NavItem icon={<PublishIcon />} label="Publishing" isActive={currentPage === 'publish'} isComingSoon={false} onClick={() => setPage('publish')} isCollapsed={isCollapsed} />
                    </div>
                </nav>

                {/* Footer */}
                <div className="mt-auto">
                    <div className="pt-4 border-t border-white/5">
                        <NavItem icon={<UserIcon />} label="Account" isActive={currentPage === 'account'} onClick={() => setPage('account')} isCollapsed={isCollapsed} />
                        <NavItem icon={<SettingsIcon />} label="Model Settings" isActive={currentPage === 'settings'} onClick={() => setPage('settings')} isCollapsed={isCollapsed} />
                        <button
                            onClick={handleLogout}
                            className="group relative flex items-center justify-center w-full mt-2 px-4 py-2 transition-colors duration-200 text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg overflow-hidden"
                            title="Log Out"
                        >
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                                <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                                    Log Out
                                </span>
                            </div>
                        </button>
                    </div>
                    <p className={`text-center text-[10px] text-gray-700 mt-4 transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                        v3.3.0 (Crash Fix)
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
