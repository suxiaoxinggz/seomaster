import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { SeoConfig, SeoSearchParams, KeywordMetric, SerpAnalysisData, AiVisibilityData, ContentGenParams, ContentGenResult, GrammarError, SeoSnapshot } from '../types';
import { fetchKeywordData, fetchSerpAnalysis, fetchAiVisibility, fetchContentGeneration, formatVolume, getKdColor } from '../services/seoDataService';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import { DatabaseIcon, SearchIcon, EyeIcon, SettingsIcon, ExternalLinkIcon, PlusIcon, ChevronDownIcon, DownloadIcon, TrashIcon, GlobeIcon, DocumentIcon, PencilIcon, WandIcon, CheckIcon, CloudIcon, PublishIcon } from './icons';
import { toast } from 'react-hot-toast';

// --- CONSTANTS & DATA ---

// Commonly used DataForSEO locations
const LOCATIONS = [
    { code: 2840, name: "United States", flag: "🇺🇸" },
    { code: 2826, name: "United Kingdom", flag: "🇬🇧" },
    { code: 2036, name: "Australia", flag: "🇦🇺" },
    { code: 2124, name: "Canada", flag: "🇨🇦" },
    { code: 2250, name: "France", flag: "🇫🇷" },
    { code: 2276, name: "Germany", flag: "🇩🇪" },
    { code: 2380, name: "Italy", flag: "🇮🇹" },
    { code: 2724, name: "Spain", flag: "🇪🇸" },
    { code: 2076, name: "Brazil", flag: "🇧🇷" },
    { code: 2392, name: "Japan", flag: "🇯🇵" },
    { code: 2356, name: "India", flag: "🇮🇳" },
    { code: 2156, name: "China", flag: "🇨🇳" },
    { code: 2702, name: "Singapore", flag: "🇸🇬" },
    { code: 2756, name: "Switzerland", flag: "🇨🇭" },
    { code: 2528, name: "Netherlands", flag: "🇳🇱" },
];

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ja", name: "Japanese" },
    { code: "zh", name: "Chinese (Simplified)" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "ru", name: "Russian" },
    { code: "ar", name: "Arabic" },
];

// --- UTILS ---

const exportToCsv = (data: KeywordMetric[], filename: string) => {
    const headers = [
        "Keyword", "Search Volume", "Clickstream Vol", "Trend (Last mo)", "CPC",
        "Competition (0-1)", "Competition Level", "Bid Low", "Bid High", "Intent", "KD",
        "Impressions Potential (Daily)"
    ];

    const rows = data.map(k => [
        `"${k.keyword}"`,
        k.search_volume,
        k.clickstream_volume || 0,
        k.trend_history[k.trend_history.length - 1], // Last month
        k.cpc,
        k.competition,
        k.competition_level,
        k.low_top_of_page_bid || 0,
        k.high_top_of_page_bid || 0,
        k.search_intent || '',
        k.keyword_difficulty || '',
        k.impressions_potential || ''
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const exportSerpToCsv = (data: SerpAnalysisData, filename: string) => {
    const headers = [
        "Rank", "Type", "Title", "URL", "Domain", "Description"
    ];

    const rows = data.items.map(item => [
        item.rank_absolute,
        item.type,
        `"${item.title.replace(/"/g, '""')}"`,
        item.url,
        item.domain,
        `"${item.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- HELPER FOR SAVING ---
async function saveSnapshotHelper(
    type: 'market_intelligence' | 'serp_analysis' | 'ai_visibility',
    query: string,
    params: any,
    data: any,
    supabase: any,
    session: any,
    setSavingState: (s: boolean) => void
) {
    if (!supabase || !session) {
        toast.error("Please login to save data.");
        return;
    }
    setSavingState(true);
    try {
        const payload: Partial<SeoSnapshot> = {
            user_id: session.user.id,
            type,
            query,
            parameters: params,
            data,
            created_at: new Date().toISOString()
        };
        // Use any cast on client to avoid strict schema inference issues
        const { error } = await (supabase as any).from('seo_snapshots').insert(payload);
        if (error) throw error;
        toast.success("Snapshot saved!");
    } catch (e) {
        toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
        setSavingState(false);
    }
}

// --- VISUALIZATION COMPONENTS ---

const Sparkline: React.FC<{ data: number[], color?: string }> = ({ data, color = 'bg-blue-500' }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data, 1);

    return (
        <div className="flex items-end gap-0.5 h-8 w-24" title={`Trend: ${data.join(' -> ')}`}>
            {data.map((val, i) => (
                <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${color} opacity-70 hover:opacity-100 transition-opacity`}
                    style={{ height: `${Math.max((val / max) * 100, 10)}%` }}
                ></div>
            ))}
        </div>
    );
};

const SerpPreview: React.FC<{ title: string, desc: string }> = ({ title, desc }) => {
    return (
        <div className="bg-white p-4 rounded-lg font-arial border border-gray-300 max-w-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <div className="bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center">
                    <GlobeIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="leading-tight">
                    <div className="text-sm text-[#202124] font-medium">Your Website</div>
                    <div className="text-xs text-[#202124]">https://www.example.com › article</div>
                </div>
            </div>
            <div className="text-[#1a0dab] text-xl font-medium hover:underline cursor-pointer truncate">
                {title || 'Page Title will appear here'}
            </div>
            <div className="text-[#4d5156] text-sm mt-1 leading-snug break-words">
                {desc || 'Meta description text will appear here. It should be concise and engaging to attract clicks from search engine users.'}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const ParameterControl: React.FC<{
    params: SeoSearchParams,
    setParams: (p: SeoSearchParams) => void,
    mode: 'market' | 'serp'
}> = ({ params, setParams, mode }) => {

    return (
        <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <GlobeIcon className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-gray-200">Targeting Parameters</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Location</label>
                    <select
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        value={params.location_code}
                        onChange={(e) => setParams({ ...params, location_code: parseInt(e.target.value) })}
                    >
                        {LOCATIONS.map(loc => (
                            <option key={loc.code} value={loc.code}>
                                {loc.flag} {loc.name} ({loc.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Language Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
                    <select
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        value={params.language_code}
                        onChange={(e) => setParams({ ...params, language_code: e.target.value })}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name} ({lang.code})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mode Specific Controls */}
            {mode === 'market' && (
                <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-700/30">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-300 font-medium">Clickstream Data</span>
                            <span className="text-[10px] text-gray-500">Real user volume calibration</span>
                        </div>
                        <Checkbox
                            checked={params.include_clickstream}
                            onChange={e => setParams({ ...params, include_clickstream: e.target.checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-700/30">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-300 font-medium">Search Depth</span>
                            <span className="text-[10px] text-gray-500">Discovery level (0-2)</span>
                        </div>
                        <input
                            type="number" min="0" max="2"
                            value={params.depth}
                            onChange={e => setParams({ ...params, depth: parseInt(e.target.value) })}
                            className="w-12 bg-gray-800 border border-gray-600 rounded text-center text-sm py-1"
                        />
                    </div>
                </div>
            )}

            {mode === 'serp' && (
                <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Device</label>
                        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setParams({ ...params, device: 'desktop' })}
                                className={`flex-1 py-1 text-xs rounded-md transition-colors ${params.device === 'desktop' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Desktop
                            </button>
                            <button
                                onClick={() => setParams({ ...params, device: 'mobile' })}
                                className={`flex-1 py-1 text-xs rounded-md transition-colors ${params.device === 'mobile' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Mobile
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Operating System</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={params.os}
                            onChange={(e) => setParams({ ...params, os: e.target.value as any })}
                        >
                            <option value="windows">Windows</option>
                            <option value="macos">macOS</option>
                            <option value="android">Android</option>
                            <option value="ios">iOS</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdvancedContentSettings: React.FC<{
    includeWords: string,
    setIncludeWords: (val: string) => void,
    avoidWords: string,
    setAvoidWords: (val: string) => void,
    avoidStartingWords: string,
    setAvoidStartingWords: (val: string) => void,
    creativity: number,
    setCreativity: (val: number) => void,
    useAdvancedParams: boolean,
    setUseAdvancedParams: (val: boolean) => void,
    topK: number,
    setTopK: (val: number) => void,
    topP: number,
    setTopP: (val: number) => void,
    temperature: number,
    setTemperature: (val: number) => void
}> = (props) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
            <button
                className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                Advanced Constraints & Params
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-gray-900/50 space-y-6">
                    {/* Constraints */}
                    <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-blue-400">Vocabulary Control</h5>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Include Words</label>
                            <Input
                                value={props.includeWords}
                                onChange={e => props.setIncludeWords(e.target.value)}
                                placeholder="e.g. ai, future (comma separated)"
                                className="text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Avoid Words</label>
                            <Input
                                value={props.avoidWords}
                                onChange={e => props.setAvoidWords(e.target.value)}
                                placeholder="e.g. very, just (comma separated)"
                                className="text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Avoid Starting Words</label>
                            <Input
                                value={props.avoidStartingWords}
                                onChange={e => props.setAvoidStartingWords(e.target.value)}
                                placeholder="e.g. But, And (comma separated)"
                                className="text-xs"
                            />
                        </div>
                    </div>

                    {/* Params */}
                    <div className="space-y-3 pt-3 border-t border-gray-700/50">
                        <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-blue-400">Sampling Parameters</h5>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500">Custom Params</span>
                                <Checkbox checked={props.useAdvancedParams} onChange={e => props.setUseAdvancedParams(e.target.checked)} />
                            </div>
                        </div>

                        {!props.useAdvancedParams ? (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-400">Creativity Index</label>
                                    <span className="text-xs text-blue-400">{props.creativity}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={props.creativity} onChange={e => props.setCreativity(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Temp ({props.temperature})</label>
                                    <input type="range" min="0" max="1" step="0.1" value={props.temperature} onChange={e => props.setTemperature(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Top P ({props.topP})</label>
                                    <input type="range" min="0" max="1" step="0.1" value={props.topP} onChange={e => props.setTopP(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Top K ({props.topK})</label>
                                    <input type="number" min="1" max="100" value={props.topK} onChange={e => props.setTopK(parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-600 rounded px-1 text-xs" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- MAIN MODULES ---

const MarketIntelligence: React.FC<{ config: SeoConfig, initialData?: { query: string, params: any, result: any } }> = ({ config, initialData }) => {
    const { supabase, session } = useContext(AppContext) || {};
    const [keywords, setKeywords] = useState('');
    const [params, setParams] = useState<SeoSearchParams>({ location_code: 2840, language_code: 'en', include_clickstream: true, depth: 1 });
    const [results, setResults] = useState<{ overview: KeywordMetric[], related: KeywordMetric[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Restore from history if provided
    useEffect(() => {
        if (initialData) {
            setKeywords(initialData.query);
            setParams(initialData.params);
            setResults(initialData.result);
            toast.success("Market intelligence snapshot loaded.");
        }
    }, [initialData]);

    const handleRun = async () => {
        if (!keywords.trim()) { toast.error("Please enter keywords."); return; }
        setLoading(true);
        try {
            const data = await fetchKeywordData(keywords, params, config);
            setResults(data);
            toast.success("Data fetched successfully.");
        } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
    };

    const handleSave = () => {
        if (!results) return;
        saveSnapshotHelper('market_intelligence', keywords, params, results, supabase, session, setIsSaving);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
                <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
                    <Card className="flex-1 flex flex-col bg-gray-800/50">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Seed Keywords</label>
                        <textarea className="w-full h-40 bg-gray-900 border border-gray-600 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none mb-4" placeholder="Enter keywords..." value={keywords} onChange={e => setKeywords(e.target.value)} />
                        <ParameterControl params={params} setParams={setParams} mode="market" />
                        <Button onClick={handleRun} isLoading={loading} className="w-full mt-4"><SearchIcon className="w-4 h-4 mr-2" />Analyze Market</Button>
                    </Card>
                </div>
                <div className="col-span-8 overflow-y-auto">
                    {results ? (
                        <div className="space-y-6">
                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-white">Overview</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={handleSave} isLoading={isSaving}><CloudIcon className="w-4 h-4 mr-1" /> Save</Button>
                                        <Button size="sm" variant="secondary" onClick={() => exportToCsv(results.overview, 'overview.csv')}><DownloadIcon className="w-4 h-4 mr-1" /> CSV</Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-400 uppercase bg-gray-900/50"><tr><th className="px-4 py-3">Keyword</th><th className="px-4 py-3">Vol</th><th className="px-4 py-3">Trend</th><th className="px-4 py-3">KD</th><th className="px-4 py-3">CPC</th></tr></thead><tbody>{results.overview.map((k, i) => (<tr key={i} className="border-b border-gray-800"><td className="px-4 py-3">{k.keyword}</td><td className="px-4 py-3">{formatVolume(k.search_volume)}</td><td className="px-4 py-3"><Sparkline data={k.trend_history} /></td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs border ${getKdColor(k.keyword_difficulty || 0)}`}>{k.keyword_difficulty}</span></td><td className="px-4 py-3">${k.cpc}</td></tr>))}</tbody></table></div>
                            </Card>
                        </div>
                    ) : <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">Enter keywords to analyze.</div>}
                </div>
            </div>
        </div>
    );
};

const SerpAnalysis: React.FC<{ config: SeoConfig, initialData?: { query: string, params: any, result: any } }> = ({ config, initialData }) => {
    const { supabase, session } = useContext(AppContext) || {};
    const [keyword, setKeyword] = useState('');
    const [params, setParams] = useState<SeoSearchParams>({ location_code: 2840, language_code: 'en', device: 'desktop', os: 'windows', depth: 20 });
    const [result, setResult] = useState<SerpAnalysisData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Restore from history
    useEffect(() => {
        if (initialData) {
            setKeyword(initialData.query);
            setParams(initialData.params);
            setResult(initialData.result);
            toast.success("SERP snapshot loaded.");
        }
    }, [initialData]);

    const handleRun = async () => {
        if (!keyword.trim()) { toast.error("Please enter a keyword."); return; }
        setLoading(true);
        try { const data = await fetchSerpAnalysis(keyword, params, config); setResult(data); toast.success("SERP data fetched."); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
    };

    const handleSave = () => {
        if (!result) return;
        saveSnapshotHelper('serp_analysis', keyword, params, result, supabase, session, setIsSaving);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
                <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
                    <Card className="flex-1 flex flex-col bg-gray-800/50">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Target Keyword</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                    placeholder="e.g. 'best running shoes'"
                                    className="w-full bg-[#0d1117] border border-gray-600 text-white text-lg rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600 shadow-inner transition-all group-hover:border-gray-500"
                                />
                                <div className="absolute right-3 top-3.5 text-gray-600">
                                    <SearchIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex justify-between">
                                <span>Enter a keyword to analyze top results.</span>
                                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800/50">Live Mode</span>
                            </p>
                        </div>
                        <ParameterControl params={params} setParams={setParams} mode="serp" />
                        <Button onClick={handleRun} isLoading={loading} className="w-full mt-4"><SearchIcon className="w-4 h-4 mr-2" />Fetch SERP</Button>
                    </Card>
                </div>
                <div className="col-span-8 overflow-y-auto">
                    {result ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-white">Top 20 Results</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={handleSave} isLoading={isSaving}><CloudIcon className="w-4 h-4 mr-1" /> Save</Button>
                                    <Button size="sm" variant="secondary" onClick={() => exportSerpToCsv(result, 'serp.csv')}><DownloadIcon className="w-4 h-4 mr-1" /> CSV</Button>
                                </div>
                            </div>
                            {result.items.map((item, i) => (<Card key={i} className="p-4"><div className="flex items-start gap-4"><span className="text-2xl font-bold text-gray-500">#{item.rank_absolute}</span><div className="flex-1"><a href={item.url} target="_blank" className="text-blue-400 hover:underline block">{item.title}</a><p className="text-sm text-gray-400">{item.description}</p></div></div></Card>))}
                        </div>
                    ) : <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">Enter keyword to analyze SERP.</div>}
                </div>
            </div>
        </div>
    );
};

const AiVisibility: React.FC<{ config: SeoConfig, initialData?: { query: string, params: any, result: any } }> = ({ config, initialData }) => {
    const { supabase, session } = useContext(AppContext) || {};
    const [keyword, setKeyword] = useState('');
    const [result, setResult] = useState<AiVisibilityData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Restore from history
    useEffect(() => {
        if (initialData) {
            setKeyword(initialData.query);
            setResult(initialData.result);
            toast.success("AI Visibility snapshot loaded.");
        }
    }, [initialData]);

    const handleRun = async () => {
        if (!keyword.trim()) return;
        setLoading(true);
        try { const data = await fetchAiVisibility(keyword, config); setResult(data); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
    };

    const handleSave = () => {
        if (!result) return;
        saveSnapshotHelper('ai_visibility', keyword, {}, result, supabase, session, setIsSaving);
    };

    return (
        <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto">
            <Card className="p-6"><div className="flex gap-4 items-end"><div className="flex-1"><Input label="Query" value={keyword} onChange={e => setKeyword(e.target.value)} /></div><Button onClick={handleRun} isLoading={loading}>Check</Button></div></Card>
            {result && (
                <Card className="p-6 relative">
                    <div className="absolute top-4 right-4">
                        <Button size="sm" variant="secondary" onClick={handleSave} isLoading={isSaving}><CloudIcon className="w-4 h-4 mr-1" /> Save</Button>
                    </div>
                    <div className="text-4xl font-bold text-white mb-2">{result.mentions_count} Mentions</div>
                    <p className="text-gray-300">{result.summary}</p>
                </Card>
            )}
        </div>
    );
};


const ContentEngine: React.FC<{ config: SeoConfig }> = ({ config }) => {
    const [mode, setMode] = useState<'generate' | 'paraphrase' | 'grammar' | 'summary' | 'meta_tags' | 'sub_topics'>('generate');
    const [subMode, setSubMode] = useState<'text' | 'topic'>('text'); // For generate vs generate_text

    // Standard Inputs
    const [inputText, setInputText] = useState('');
    const [topic, setTopic] = useState('');
    const [wordCount, setWordCount] = useState(500);
    const [maxTokens, setMaxTokens] = useState(200);
    const [targetLang, setTargetLang] = useState('en');

    // Advanced Constraints
    const [includeWords, setIncludeWords] = useState('');
    const [avoidWords, setAvoidWords] = useState('');
    const [avoidStartingWords, setAvoidStartingWords] = useState('');

    // Advanced Parameters
    const [creativity, setCreativity] = useState(0.8);
    const [useAdvancedParams, setUseAdvancedParams] = useState(false); // Toggle between creativity vs detailed
    const [topK, setTopK] = useState(40);
    const [topP, setTopP] = useState(0.9);
    const [temperature, setTemperature] = useState(0.7);

    // Outputs
    const [result, setResult] = useState<ContentGenResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        // Validation logic based on UI State (mode)
        const requiresTopic = (mode === 'generate' && subMode === 'topic') || mode === 'sub_topics';
        if (requiresTopic && !topic) {
            toast.error("Please enter a topic."); return;
        }

        const requiresText = (mode === 'generate' && subMode === 'text') || ['paraphrase', 'grammar', 'summary', 'meta_tags'].includes(mode);
        if (requiresText && !inputText) {
            toast.error("Please enter input text."); return;
        }

        setLoading(true);
        setResult(null);

        try {
            // Determine core mode string for API
            let apiMode: ContentGenParams['mode'] = 'generate';
            if (mode === 'generate') {
                apiMode = subMode === 'topic' ? 'generate_text' : 'generate';
            } else if (mode === 'grammar') apiMode = 'check_grammar';
            else if (mode === 'summary') apiMode = 'text_summary';
            else if (mode === 'meta_tags') apiMode = 'generate_meta_tags';
            else if (mode === 'sub_topics') apiMode = 'generate_sub_topics';
            else apiMode = 'paraphrase';

            const params: ContentGenParams = {
                mode: apiMode,
            };

            // Add Params based on logic
            if (!useAdvancedParams) {
                params.creativity_index = creativity;
            } else {
                params.top_k = topK;
                params.top_p = topP;
                params.temperature = temperature;
            }

            // Important: Use apiMode for all conditional parameter setting
            if (apiMode === 'generate_text') {
                params.topic = topic;
                params.word_count = wordCount;
                if (includeWords) params.include_words = includeWords.split(',').map(s => s.trim());
            } else if (apiMode === 'generate') {
                params.text = inputText;
                params.max_tokens = maxTokens;
                if (avoidWords) params.avoid_words = avoidWords.split(',').map(s => s.trim());
                if (avoidStartingWords) params.avoid_starting_words = avoidStartingWords.split(',').map(s => s.trim());
            } else if (apiMode === 'check_grammar') {
                params.text = inputText;
                params.language_code = targetLang;
            } else if (apiMode === 'generate_meta_tags' || apiMode === 'text_summary' || apiMode === 'paraphrase') {
                params.text = inputText;
            } else if (apiMode === 'generate_sub_topics') {
                params.topic = topic;
            }

            const data = await fetchContentGeneration(params, config);
            setResult(data);
            toast.success("Generation complete.");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-center overflow-x-auto pb-1">
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 whitespace-nowrap">
                    {[
                        { id: 'generate', label: 'Generator' },
                        { id: 'paraphrase', label: 'Rewriter' },
                        { id: 'grammar', label: 'Grammar' },
                        { id: 'summary', label: 'Summary' },
                        { id: 'meta_tags', label: 'Meta Tags' },
                        { id: 'sub_topics', label: 'Sub Topics' }
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id as any); setResult(null); }}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === m.id ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* LEFT: Inputs */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <Card className="flex-1 flex flex-col bg-gray-800/50">
                        {mode === 'generate' && (
                            <div className="mb-4 flex bg-gray-900 rounded p-1 border border-gray-700">
                                <button onClick={() => setSubMode('text')} className={`flex-1 py-1 text-xs rounded transition ${subMode === 'text' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>Complete Text</button>
                                <button onClick={() => setSubMode('topic')} className={`flex-1 py-1 text-xs rounded transition ${subMode === 'topic' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>From Topic</button>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col gap-4">
                            {(mode === 'generate' && subMode === 'topic') || mode === 'sub_topics' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Topic / Main Keyword</label>
                                    <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Benefits of Green Tea" />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        {mode === 'generate' ? 'Start Text / Prompt' :
                                            mode === 'meta_tags' ? 'Content for Meta Generation' :
                                                'Input Text'}
                                    </label>
                                    <textarea
                                        className="w-full flex-1 bg-gray-900 border border-gray-600 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none min-h-[150px]"
                                        placeholder={mode === 'meta_tags' ? "Paste your article content here..." : "Enter your text here..."}
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Standard Parameters */}
                            <div className="border-t border-gray-700 pt-4 space-y-4">
                                {mode === 'generate' && subMode === 'topic' && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Target Word Count</label>
                                        <Input type="number" value={wordCount} onChange={e => setWordCount(parseInt(e.target.value))} />
                                    </div>
                                )}

                                {mode === 'generate' && subMode === 'text' && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Max Tokens</label>
                                        <Input type="number" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} />
                                    </div>
                                )}

                                {mode === 'grammar' && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Language</label>
                                        <select
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                            value={targetLang} onChange={e => setTargetLang(e.target.value)}
                                        >
                                            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {mode !== 'summary' && mode !== 'grammar' && (
                                    <AdvancedContentSettings
                                        includeWords={includeWords} setIncludeWords={setIncludeWords}
                                        avoidWords={avoidWords} setAvoidWords={setAvoidWords}
                                        avoidStartingWords={avoidStartingWords} setAvoidStartingWords={setAvoidStartingWords}
                                        creativity={creativity} setCreativity={setCreativity}
                                        useAdvancedParams={useAdvancedParams} setUseAdvancedParams={setUseAdvancedParams}
                                        topK={topK} setTopK={setTopK}
                                        topP={topP} setTopP={setTopP}
                                        temperature={temperature} setTemperature={setTemperature}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <Button onClick={handleRun} isLoading={loading} className="w-full">
                                <WandIcon className="w-4 h-4 mr-2" />
                                Run {mode === 'grammar' ? 'Check' : mode === 'meta_tags' ? 'Generate Tags' : mode}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: Results */}
                <div className="col-span-12 lg:col-span-8 overflow-y-auto custom-scrollbar">
                    {result ? (
                        <div className="space-y-4 animate-fade-in-up pb-10">
                            {/* Summary View */}
                            {mode === 'summary' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="text-center p-4 bg-blue-900/20 border-blue-800">
                                        <div className="text-3xl font-bold text-blue-400">{result.readability_score?.toFixed(1)}</div>
                                        <div className="text-xs text-gray-400 uppercase mt-1 tracking-wider">Readability Score</div>
                                    </Card>
                                    <Card className="text-center p-4">
                                        <div className="text-3xl font-bold text-white">{result.words}</div>
                                        <div className="text-xs text-gray-400 uppercase mt-1 tracking-wider">Word Count</div>
                                    </Card>
                                    <Card className="text-center p-4">
                                        <div className="text-3xl font-bold text-white">{result.grade_level?.toFixed(1)}</div>
                                        <div className="text-xs text-gray-400 uppercase mt-1 tracking-wider">Grade Level</div>
                                    </Card>
                                </div>
                            )}

                            {/* Meta Tags View (Google Snippet Simulator) */}
                            {mode === 'meta_tags' && (
                                <Card>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-white">SERP Preview</h3>
                                        <div className="flex gap-2 text-xs">
                                            <span className={`${(result.meta_title?.length || 0) > 60 ? 'text-red-400' : 'text-green-400'}`}>
                                                Title: {result.meta_title?.length || 0}/60 chars
                                            </span>
                                            <span className="text-gray-600">|</span>
                                            <span className={`${(result.meta_description?.length || 0) > 160 ? 'text-red-400' : 'text-green-400'}`}>
                                                Desc: {result.meta_description?.length || 0}/160 chars
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <SerpPreview title={result.meta_title || ''} desc={result.meta_description || ''} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs text-gray-400 uppercase font-semibold">Meta Title</label>
                                            <div className="bg-black/30 p-3 rounded border border-gray-700 mt-1 text-blue-300 font-medium">
                                                {result.meta_title}
                                            </div>
                                            <button onClick={() => copyToClipboard(result.meta_title || '')} className="absolute right-2 top-6 p-1 bg-gray-700 rounded hover:bg-white hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                                <DocumentIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs text-gray-400 uppercase font-semibold">Meta Description</label>
                                            <div className="bg-black/30 p-3 rounded border border-gray-700 mt-1 text-gray-300 text-sm leading-relaxed">
                                                {result.meta_description}
                                            </div>
                                            <button onClick={() => copyToClipboard(result.meta_description || '')} className="absolute right-2 top-6 p-1 bg-gray-700 rounded hover:bg-white hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                                <DocumentIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Sub Topics View */}
                            {mode === 'sub_topics' && result.sub_topics && (
                                <Card>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-white">Generated Sub-Topics</h3>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => downloadText(result.sub_topics?.join('\n') || '', 'sub-topics.txt')}
                                        >
                                            <DownloadIcon className="w-4 h-4 mr-2" /> Export List
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {result.sub_topics.map((topic, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-700 hover:border-blue-500/50 transition-colors group">
                                                <span className="text-gray-300">{topic}</span>
                                                <button
                                                    onClick={() => copyToClipboard(topic)}
                                                    className="opacity-0 group-hover:opacity-100 text-xs bg-gray-800 px-2 py-1 rounded text-blue-400 hover:text-white transition-opacity"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Main Text Output */}
                            {(mode === 'generate' || mode === 'paraphrase') && (
                                <Card className="relative min-h-[400px]">
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                                        <h3 className="font-bold text-white">Generated Output</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => copyToClipboard(result.generated_text || '')} className="text-xs text-blue-400 hover:text-white">Copy</button>
                                            <button onClick={() => downloadText(result.generated_text || '', 'generated.txt')} className="text-xs text-blue-400 hover:text-white">Download</button>
                                        </div>
                                    </div>
                                    <div className="whitespace-pre-wrap text-gray-300 font-serif leading-relaxed">
                                        {result.generated_text}
                                    </div>
                                    <div className="absolute bottom-2 right-4 text-xs text-gray-600">
                                        Tokens: {result.new_tokens} (Total: {result.output_tokens})
                                    </div>
                                </Card>
                            )}

                            {/* Grammar Output */}
                            {mode === 'grammar' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                    <Card className="flex flex-col h-full bg-gray-800/30">
                                        <h3 className="font-bold text-gray-400 mb-2">Original</h3>
                                        <div className="whitespace-pre-wrap text-gray-400 text-sm flex-1">{result.input_text}</div>
                                    </Card>
                                    <Card className="flex flex-col h-full bg-green-900/10 border-green-900/30">
                                        <h3 className="font-bold text-green-400 mb-2">Corrected</h3>
                                        <div className="whitespace-pre-wrap text-gray-200 text-sm flex-1">{result.corrected_text}</div>
                                    </Card>

                                    {result.grammar_errors && result.grammar_errors.length > 0 && (
                                        <div className="col-span-1 md:col-span-2">
                                            <h3 className="font-bold text-red-400 mb-2">Errors Found ({result.grammar_errors.length})</h3>
                                            <div className="space-y-2">
                                                {result.grammar_errors.map((err, i) => (
                                                    <div key={i} className="bg-red-900/10 border border-red-900/30 p-3 rounded text-sm hover:bg-red-900/20 transition-colors">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="uppercase text-[10px] font-bold bg-red-900 text-red-200 px-1.5 rounded">{err.type}</span>
                                                            <span className="text-gray-300 font-medium">{err.description}</span>
                                                        </div>
                                                        <div className="mt-1 flex items-center text-green-400 text-xs">
                                                            <span className="text-gray-500 mr-2">Suggestion:</span>
                                                            <span className="font-mono bg-green-900/30 px-1 rounded">{err.suggestions.join(', ')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/20">
                            <div className="text-center">
                                <WandIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Select a mode and run the engine to see results.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HistoryView: React.FC<{ onLoad: (snapshot: SeoSnapshot) => void }> = ({ onLoad }) => {
    const { supabase, session } = useContext(AppContext) || {};
    const [snapshots, setSnapshots] = useState<SeoSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!supabase || !session) return;
            setIsLoading(true);
            const { data, error } = await supabase
                .from('seo_snapshots')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (!error && data) setSnapshots(data as any);
            setIsLoading(false);
        };
        fetchHistory();
    }, [supabase, session]);

    const handleDelete = async (id: string) => {
        if (!supabase || !session) return;
        if (!confirm('Are you sure?')) return;
        // Strict Multi-Tenancy Enforcement
        const { error } = await supabase.from('seo_snapshots').delete().eq('id', id).eq('user_id', session.user.id);
        if (!error) setSnapshots(prev => prev.filter(s => s.id !== id));
    };

    if (!session) return <div className="p-8 text-gray-500">Please login to view history.</div>;

    return (
        <div className="h-full overflow-y-auto pb-10">
            <h2 className="text-xl font-bold text-white mb-4">Saved Research History</h2>
            {isLoading ? <p className="text-gray-500">Loading...</p> : (
                <div className="grid grid-cols-1 gap-4">
                    {snapshots.length === 0 && <p className="text-gray-500">No saved snapshots found.</p>}
                    {snapshots.map(snap => (
                        <Card key={snap.id} className="p-4 flex justify-between items-center bg-gray-800 hover:bg-gray-750">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${snap.type === 'market_intelligence' ? 'bg-blue-900 text-blue-300' :
                                        snap.type === 'serp_analysis' ? 'bg-orange-900 text-orange-300' :
                                            'bg-purple-900 text-purple-300'
                                        }`}>
                                        {snap.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-gray-500 text-xs">{new Date(snap.created_at).toLocaleString()}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mt-1">{snap.query}</h3>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => onLoad(snap)} className="text-green-400 hover:text-white hover:bg-green-600/20">
                                    <PublishIcon className="w-4 h-4 mr-1 transform rotate-90" /> Load
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(snap.id)}><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

const SeoDataManager: React.FC = () => {
    const context = useContext(AppContext);
    const { navigationPayload, setNavigationPayload } = context || {};

    const [activeTab, setActiveTab] = useState<'market' | 'serp' | 'ai' | 'content' | 'history'>('market');
    const [restoredData, setRestoredData] = useState<{ type: string, data: { query: string, params: any, result: any } } | null>(null);

    // Handle Dashboard Navigation
    useEffect(() => {
        if (navigationPayload && navigationPayload.type === 'change_seo_tab') {
            if (navigationPayload.data.targetTab) {
                setActiveTab(navigationPayload.data.targetTab as any);
            }
            setNavigationPayload && setNavigationPayload(null);
        }
    }, [navigationPayload, setNavigationPayload]);

    if (!context) return null;
    const { seoConfig } = context;

    const handleLoadSnapshot = (snapshot: SeoSnapshot) => {
        // Map snapshot type to tab id
        const tabMap: Record<string, string> = {
            'market_intelligence': 'market',
            'serp_analysis': 'serp',
            'ai_visibility': 'ai'
        };

        const targetTab = tabMap[snapshot.type];
        if (targetTab) {
            setActiveTab(targetTab as any);
            setRestoredData({
                type: snapshot.type,
                data: {
                    query: snapshot.query,
                    params: snapshot.parameters,
                    result: snapshot.data
                }
            });
        }
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <DatabaseIcon className="w-8 h-8 text-blue-400" />
                SEO Data Center
            </h1>
            <p className="text-gray-400 mb-6">
                Comprehensive suite for keyword research, SERP analysis, and AI-driven content optimization.
                <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-700">
                    Provider: {seoConfig.provider === 'mock' ? 'Mock Data' : seoConfig.provider.toUpperCase()}
                </span>
            </p>

            <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg border border-gray-700 w-fit mb-6">
                {[
                    { id: 'market', label: 'Market Intelligence', icon: <SearchIcon className="w-4 h-4" /> },
                    { id: 'serp', label: 'SERP Analysis', icon: <EyeIcon className="w-4 h-4" /> },
                    { id: 'ai', label: 'AI Visibility', icon: <WandIcon className="w-4 h-4" /> },
                    { id: 'content', label: 'Content Engine', icon: <PencilIcon className="w-4 h-4" /> },
                    { id: 'history', label: 'History', icon: <DatabaseIcon className="w-4 h-4" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 bg-gray-900/30 rounded-xl border border-white/5 p-1">
                {activeTab === 'market' && <MarketIntelligence config={seoConfig} initialData={restoredData?.type === 'market_intelligence' ? restoredData.data : undefined} />}
                {activeTab === 'serp' && <SerpAnalysis config={seoConfig} initialData={restoredData?.type === 'serp_analysis' ? restoredData.data : undefined} />}
                {activeTab === 'ai' && <AiVisibility config={seoConfig} initialData={restoredData?.type === 'ai_visibility' ? restoredData.data : undefined} />}
                {activeTab === 'content' && <ContentEngine config={seoConfig} />}
                {activeTab === 'history' && <HistoryView onLoad={handleLoadSnapshot} />}
            </div>
        </div>
    );
};

export default SeoDataManager;