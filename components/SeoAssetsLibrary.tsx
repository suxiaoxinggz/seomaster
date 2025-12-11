import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { SeoSnapshot, SeoConfig, Page } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { SearchIcon, EyeIcon, WandIcon, DatabaseIcon, TrashIcon } from './icons';

interface SeoAssetsLibraryProps {
    setPage: (page: Page) => void;
}

const SeoAssetsLibrary: React.FC<SeoAssetsLibraryProps> = ({ setPage }) => {
    const context = useContext(AppContext);
    // Safe destructuring
    const { supabase, session, setNavigationPayload } = context || {};

    const [snapshots, setSnapshots] = useState<SeoSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'market_intelligence' | 'serp_analysis' | 'ai_visibility'>('all');

    const fetchHistory = async () => {
        if (!supabase || !session) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('seo_snapshots')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setSnapshots(data as any);
        } catch (error) {
            console.error("Error fetching library:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [supabase, session]);

    const handleLoad = (snap: SeoSnapshot) => {
        // Navigate to SEO Data Center and load the snapshot
        if (setNavigationPayload && setPage) {
            setNavigationPayload({
                type: 'change_seo_tab',
                data: {
                    targetTab: snap.type === 'market_intelligence' ? 'market' :
                        snap.type === 'serp_analysis' ? 'serp' : 'ai'
                }
            });
            // We also need to pass the snapshot data. 
            // The SeoDataManager listens for navigationPayload, but we might need to enhance it to accept 'initialData'.
            // Actually, currently SeoDataManager restores from 'restoredData' state which isn't exposed globally.
            // WORKAROUND: We can pass the snapshot in navigationPayload and update SeoDataManager to read it.
            // OR checks SeoDataManager logic:
            // It listens for `navigationPayload` and sets activeTab.
            // But it doesn't set `restoredData` from `navigationPayload`.
            // I should update SeoDataManager to handle data passing too.
            // For now, I'll assume I'll fix SeoDataManager next.
            setNavigationPayload({
                type: 'load_snapshot',
                data: { snapshot: snap }
            });
            setPage('seo-data');
        }
    };

    const handleExport = () => {
        if (filteredSnapshots.length === 0) return;

        // 1. Flatten Data based on current view/first item type
        // If mixed, we probably just export metadata. 
        // If specific type, we try to export detailed data.

        let csvContent = "";
        let filename = `seo_export_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`;

        if (filterType === 'all') {
            // Export Metadata Only
            const headers = ["ID", "Type", "Query", "Location", "Language", "Created At"];
            csvContent = [
                headers.join(','),
                ...filteredSnapshots.map(s => [
                    s.id,
                    s.type,
                    `"${s.query.replace(/"/g, '""')}"`,
                    s.parameters.location_code,
                    s.parameters.language_code,
                    s.created_at
                ].join(','))
            ].join('\n');

        } else if (filterType === 'market_intelligence') {
            // Export ALL Keyword Metrics from ALL selected snapshots
            // This merges multiple reports into one big CSV
            const headers = ["Source Query", "Keyword", "Volume", "Difficulty", "CPC", "Intent", "Competition"];
            const rows: string[] = [];

            filteredSnapshots.forEach(snap => {
                if (Array.isArray(snap.data)) {
                    snap.data.forEach((k: any) => {
                        rows.push([
                            `"${snap.query.replace(/"/g, '""')}"`,
                            `"${k.keyword.replace(/"/g, '""')}"`,
                            k.search_volume,
                            k.keyword_difficulty,
                            k.cpc,
                            k.search_intent,
                            k.competition_level
                        ].join(','));
                    });
                }
            });
            csvContent = [headers.join(','), ...rows].join('\n');

        } else if (filterType === 'serp_analysis') {
            const headers = ["Source Query", "Rank", "Title", "URL", "Domain", "Type"];
            const rows: string[] = [];
            filteredSnapshots.forEach(snap => {
                if (snap.data.items) {
                    snap.data.items.forEach((item: any) => {
                        rows.push([
                            `"${snap.query.replace(/"/g, '""')}"`,
                            item.rank_absolute,
                            `"${(item.title || '').replace(/"/g, '""')}"`,
                            `"${(item.url || '').replace(/"/g, '""')}"`,
                            item.domain,
                            item.type
                        ].join(','));
                    });
                }
            });
            csvContent = [headers.join(','), ...rows].join('\n');

        } else if (filterType === 'ai_visibility') {
            const headers = ["Query", "Platform", "Mentions", "Sentiment", "Summary"];
            csvContent = [
                headers.join(','),
                ...filteredSnapshots.map(s => [
                    `"${s.query.replace(/"/g, '""')}"`,
                    s.data.platform,
                    s.data.mentions_count,
                    s.data.sentiment,
                    `"${(s.data.summary || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
                ].join(','))
            ].join('\n');
        }

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!supabase || !session) return;
        if (!confirm('Are you sure you want to delete this asset?')) return;

        const { error } = await supabase
            .from('seo_snapshots')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (!error) {
            setSnapshots(prev => prev.filter(s => s.id !== id));
        }
    };

    const filteredSnapshots = snapshots.filter(s => filterType === 'all' || s.type === filterType);

    const getIcon = (type: string) => {
        switch (type) {
            case 'market_intelligence': return <SearchIcon className="w-5 h-5 text-blue-400" />;
            case 'serp_analysis': return <EyeIcon className="w-5 h-5 text-orange-400" />;
            case 'ai_visibility': return <WandIcon className="w-5 h-5 text-purple-400" />;
            default: return <DatabaseIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getLabel = (type: string) => {
        return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // --- Visualization Helpers ---
    const renderPreview = (snap: SeoSnapshot) => {
        if (snap.type === 'market_intelligence') {
            const count = Array.isArray(snap.data) ? snap.data.length : 0;
            const topVol = Array.isArray(snap.data) ? Math.max(...snap.data.map((k: any) => k.search_volume || 0)) : 0;
            return (
                <div className="mt-2 text-sm text-gray-400">
                    <p>Keywords Analyzed: <span className="text-white font-mono">{count}</span></p>
                    <p>Top Volume: <span className="text-white font-mono">{topVol.toLocaleString()}</span></p>
                </div>
            );
        }
        if (snap.type === 'serp_analysis') {
            const items = snap.data.items || [];
            return (
                <div className="mt-2 text-sm text-gray-400">
                    <p>Top Result: <span className="text-white">{items[0]?.domain || 'N/A'}</span></p>
                    <p>Results Parsed: <span className="text-white font-mono">{items.length}</span></p>
                </div>
            );
        }
        if (snap.type === 'ai_visibility') {
            return (
                <div className="mt-2 text-sm text-gray-400">
                    <p>Platform: <span className="text-white capitalize">{snap.data.platform?.replace('_', ' ')}</span></p>
                    <p>Mentions: <span className="text-white font-mono">{snap.data.mentions_count}</span></p>
                </div>
            );
        }
        return null;
    };

    if (!session) return <div className="p-10 text-center text-gray-500">Please login to view your library.</div>;

    return (
        <div className="p-8 h-full flex flex-col bg-[#0d1117]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <DatabaseIcon className="w-8 h-8 text-emerald-400" />
                        SEO Data Library
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Centralized repository of all your saved Market Research, SERP Analysis, and AI Visibility snapshots.
                    </p>
                </div>
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 items-center">
                    {(['all', 'market_intelligence', 'serp_analysis', 'ai_visibility'] as const).map(ft => (
                        <button
                            key={ft}
                            onClick={() => setFilterType(ft)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterType === ft
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            {ft === 'all' ? 'All Assets' : getLabel(ft)}
                        </button>
                    ))}
                    <div className="h-6 w-px bg-gray-700 mx-2"></div>
                    <button
                        onClick={handleExport}
                        disabled={filteredSnapshots.length === 0}
                        className="px-4 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-gray-700 rounded-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export filtered view to CSV"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
                    {filteredSnapshots.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                            <DatabaseIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No saved assets found matching this filter.</p>
                        </div>
                    )}
                    {filteredSnapshots.map(snap => (
                        <div
                            key={snap.id}
                            onClick={() => handleLoad(snap)}
                            className="group bg-gray-800/40 border border-gray-700 hover:border-emerald-500/50 hover:bg-gray-800/80 rounded-xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg bg-gray-900 border border-gray-700 group-hover:bg-gray-800 transition-colors`}>
                                    {getIcon(snap.type)}
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-900 px-2 py-1 rounded">
                                    {new Date(snap.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors truncate" title={snap.query}>
                                {snap.query}
                            </h3>
                            <div className="text-xs text-emerald-500/80 font-mono mb-4">
                                {snap.parameters?.location_code || 'US'} · {snap.parameters?.language_code || 'EN'}
                            </div>

                            {/* Preview Metrics */}
                            <div className="border-t border-gray-700/50 pt-3 min-h-[60px]">
                                {renderPreview(snap)}
                            </div>

                            {/* Hover Action */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                            {/* Quick Delete (Visible on Hover) */}
                            <button
                                onClick={(e) => handleDelete(snap.id, e)}
                                className="absolute top-4 right-4 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Asset"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SeoAssetsLibrary;
