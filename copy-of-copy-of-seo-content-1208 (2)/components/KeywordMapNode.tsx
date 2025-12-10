
import React, { useMemo } from 'react';
import { RenderLevel1Node, RenderLevel2Node, RenderLsiNode, SelectedKeywords, SeoMetrics } from '../types';
import { ChevronDownIcon, WandIcon, DocumentIcon, GlobeIcon } from './icons';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';
import { getKdColor, formatVolume } from '../services/seoDataService';

type Translations = Record<string, string>;

// --- NEW: Metrics Badge Component ---
const MetricsBadge: React.FC<{ metrics?: SeoMetrics }> = ({ metrics }) => {
    if (!metrics) return null;
    
    const kdClass = getKdColor(metrics.difficulty);

    return (
        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono tracking-wide opacity-90">
            <span className="px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800" title="Monthly Search Volume">
                Vol: {formatVolume(metrics.volume)}
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${kdClass}`} title="Keyword Difficulty (0-100)">
                KD: {metrics.difficulty}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600" title="Cost Per Click">
                ${metrics.cpc}
            </span>
        </div>
    );
};

// Update LsiPill to accept metrics
const LsiPill: React.FC<{ lsi: RenderLsiNode; isSelected: boolean; onToggle: () => void; translation?: string; metrics?: SeoMetrics }> = ({ lsi, isSelected, onToggle, translation, metrics }) => (
    <div className={`rounded-lg transition-all duration-300 border ${isSelected ? 'bg-blue-600/20 text-white border-blue-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'}`}>
        <label htmlFor={lsi.id} className="flex flex-col items-start px-3 py-2 cursor-pointer">
            <div className="flex items-center space-x-2">
                <Checkbox id={lsi.id} checked={isSelected} onChange={onToggle} />
                <span className="text-sm font-medium">{lsi.text}</span>
            </div>
            {translation && <span className="text-xs text-cyan-300 opacity-90 mt-0.5 pl-6">{translation}</span>}
            <div className="pl-6 mt-1">
                <MetricsBadge metrics={metrics} />
            </div>
        </label>
    </div>
);

const Level2Component: React.FC<{
    level1Node: RenderLevel1Node;
    level2Node: RenderLevel2Node;
    onGenerateLsi: (level1Node: RenderLevel1Node, level2NodeId: string) => Promise<void>;
    selectedKeywords: SelectedKeywords;
    onSelectionChange: (id: string, checked: boolean) => void;
    translations: Translations;
    metrics?: Record<string, SeoMetrics>; // Pass metrics map
}> = ({ level1Node, level2Node, onGenerateLsi, selectedKeywords, onSelectionChange, translations, metrics }) => {
    const [isLsiLoading, setIsLsiLoading] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(true);

    const handleLsiGeneration = async () => {
        setIsLsiLoading(true);
        try {
            await onGenerateLsi(level1Node, level2Node.id);
        } catch (error) {
            console.error("LSI generation failed for node:", level2Node.id, error);
        } finally {
            setIsLsiLoading(false);
        }
    };
    
    const { isChecked, isIndeterminate } = useMemo(() => {
        const lsiIds = level2Node.lsi.map(l => l.id);
        if (lsiIds.length === 0) {
            return { isChecked: !!selectedKeywords[level2Node.id], isIndeterminate: false };
        }
        const selectedCount = lsiIds.filter(id => selectedKeywords[id]).length;
        return {
            isChecked: selectedCount === lsiIds.length,
            isIndeterminate: selectedCount > 0 && selectedCount < lsiIds.length,
        };
    }, [level2Node, selectedKeywords]);


    return (
        <div className="ml-4 mt-3 pl-4 border-l-2 border-gray-700">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Checkbox
                        id={level2Node.id}
                        checked={isChecked}
                        isIndeterminate={isIndeterminate}
                        onChange={(e) => onSelectionChange(level2Node.id, e.target.checked)}
                    />
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-start text-left hover:bg-gray-700/50 p-1 rounded-md">
                        <ChevronDownIcon className={`w-5 h-5 mr-2 mt-1 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        <div>
                            <h4 className="font-semibold text-lg text-teal-300">{level2Node.keyword}</h4>
                            {translations[level2Node.id] && <p className="text-sm text-cyan-400 mt-0.5">{translations[level2Node.id]}</p>}
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-400">{level2Node.type}</p>
                                <MetricsBadge metrics={metrics?.[level2Node.keyword]} />
                            </div>
                        </div>
                    </button>
                 </div>
                 <Button onClick={handleLsiGeneration} isLoading={isLsiLoading} size="sm" variant="secondary">
                     <WandIcon className="w-4 h-4 mr-2" />
                     {level2Node.lsi && level2Node.lsi.length > 0 ? '补充LSI' : '生成LSI'}
                 </Button>
            </div>
            {isExpanded && (
                <div className="mt-3 pl-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {level2Node.lsi.map(lsi => (
                        <LsiPill 
                            key={lsi.id} 
                            lsi={lsi} 
                            isSelected={!!selectedKeywords[lsi.id]}
                            onToggle={() => onSelectionChange(lsi.id, !selectedKeywords[lsi.id])}
                            translation={translations[lsi.id]}
                            metrics={metrics?.[lsi.text]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const KeywordMapNode: React.FC<{
    level1Node: RenderLevel1Node;
    onGenerateLsi: (level1Node: RenderLevel1Node, level2NodeId: string) => Promise<void>;
    selectedKeywords: SelectedKeywords;
    onSelectionChange: (id: string, checked: boolean) => void;
    translations: Translations;
    onTranslate: (level1NodeId: string) => void;
    onDraftArticle: (level1Node: RenderLevel1Node) => void;
    isTranslating: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    metrics?: Record<string, SeoMetrics>; // Pass metrics map
}> = ({ level1Node, onGenerateLsi, selectedKeywords, onSelectionChange, translations, onTranslate, onDraftArticle, isTranslating, isExpanded, onToggleExpand, metrics }) => {
    const typeColor = level1Node.type === '引流型' ? 'bg-blue-900/50 text-blue-300' :
                      level1Node.type === '对比型' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-green-900/50 text-green-300';
    
    const { isChecked, isIndeterminate } = useMemo(() => {
        const childIds = level1Node.children.flatMap(l2 => [l2.id, ...l2.lsi.map(lsi => lsi.id)]);
        if (childIds.length === 0) {
            return { isChecked: !!selectedKeywords[level1Node.id], isIndeterminate: false };
        }
        const selectedCount = childIds.filter(id => selectedKeywords[id]).length;
        return {
            isChecked: selectedCount === childIds.length,
            isIndeterminate: selectedCount > 0 && selectedCount < childIds.length,
        };
    }, [level1Node, selectedKeywords]);

    const isAnyChildSelected = useMemo(() => {
        return Object.keys(selectedKeywords).some(key => key.startsWith(level1Node.id) && selectedKeywords[key]);
    }, [selectedKeywords, level1Node.id]);

    // Simple SERP check helper
    const handleSerpCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(level1Node.keyword)}`, '_blank');
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 transition-all hover:border-blue-500/30">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                        id={level1Node.id}
                        checked={isChecked}
                        isIndeterminate={isIndeterminate}
                        onChange={(e) => onSelectionChange(level1Node.id, e.target.checked)}
                        className="mt-3"
                    />
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                             <button onClick={onToggleExpand} className="flex-1 flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                                <div className="text-left">
                                    <h3 className="font-bold text-xl text-sky-300">{level1Node.keyword}</h3>
                                    {translations[level1Node.id] && <p className="text-sm text-cyan-400 mt-1">{translations[level1Node.id]}</p>}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{level1Node.type}</span>
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">{level1Node.pageType}</span>
                                        <MetricsBadge metrics={metrics?.[level1Node.keyword]} />
                                    </div>
                                </div>
                                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                             </button>
                        </div>
                    </div>
                </div>
                 <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                    <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => onDraftArticle(level1Node)}
                        className="px-3 py-1.5 text-xs w-full"
                    >
                        <DocumentIcon className="w-3 h-3 mr-1" />
                        草拟文章
                    </Button>
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => onTranslate(level1Node.id)}
                        isLoading={isTranslating}
                        disabled={isTranslating || !isAnyChildSelected}
                        className="px-3 py-1.5 text-xs w-full"
                    >
                        翻译
                    </Button>
                     <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={handleSerpCheck}
                        className="px-3 py-1.5 text-xs w-full text-gray-400 hover:text-blue-300"
                    >
                        <GlobeIcon className="w-3 h-3 mr-1" />
                        SERP Check
                    </Button>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-2">
                    {level1Node.children.map(level2 => (
                        <Level2Component
                            key={level2.id}
                            level1Node={level1Node}
                            level2Node={level2}
                            onGenerateLsi={onGenerateLsi}
                            selectedKeywords={selectedKeywords}
                            onSelectionChange={onSelectionChange}
                            translations={translations}
                            metrics={metrics}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default KeywordMapNode;
