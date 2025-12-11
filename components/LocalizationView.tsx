import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { translateTextStream } from '../services/llmService';
import { fetchTranslation } from '../services/translationService'; // New Service
import { Article, ModelProvider, TranslationProvider, TranslationApiKeys } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { toast } from 'react-hot-toast';
import { GlobeIcon, PencilIcon, SettingsIcon, EyeIcon, EyeOffIcon, ExternalLinkIcon } from './icons';

const TARGET_LANGUAGES = [
    'Chinese (Simplified)',
    'Chinese (Traditional)',
    'English',
    'Spanish',
    'Japanese',
    'German',
    'French',
    'Korean',
    'Russian',
    'Portuguese'
];

const TranslationSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    keys: TranslationApiKeys;
    onSave: (keys: TranslationApiKeys) => void;
}> = ({ isOpen, onClose, keys, onSave }) => {
    const [localKeys, setLocalKeys] = useState(keys);
    const [visible, setVisible] = useState<Record<string, boolean>>({});

    const toggleVis = (k: string) => setVisible(p => ({ ...p, [k]: !p[k] }));

    const renderField = (label: string, key: keyof TranslationApiKeys | 'microsoft_region', placeholder: string, link: string) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">{label}</label>
                <a href={link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center">
                    Get Key <ExternalLinkIcon className="w-3 h-3 ml-1" />
                </a>
            </div>
            <div className="relative">
                <input
                    type={visible[key] ? 'text' : 'password'}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder}
                    value={localKeys[key] || ''}
                    onChange={e => setLocalKeys({ ...localKeys, [key]: e.target.value })}
                />
                <button type="button" onClick={() => toggleVis(key)} className="absolute right-2 top-2.5 text-gray-500 hover:text-white">
                    {visible[key] ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Translation API Settings">
            <div className="p-2">
                <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded border border-gray-700">
                    Configure professional translation APIs for faster and consistent results. These keys are stored locally in your browser.
                </p>
                {renderField("DeepL API Key", TranslationProvider.DEEPL, "e.g., xxxxx-xxxx-xxxx:fx", "https://www.deepl.com/pro-api")}
                {renderField("Google Cloud Translate Key", TranslationProvider.GOOGLE, "AIzaSy...", "https://cloud.google.com/translate/docs/setup")}
                <div className="grid grid-cols-2 gap-4">
                    {renderField("Microsoft Key", TranslationProvider.MICROSOFT, "Key 1 or Key 2", "https://azure.microsoft.com/en-us/services/cognitive-services/translator/")}
                    {renderField("Microsoft Region", "microsoft_region", "e.g., eastus, global", "#")}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-gray-700 pt-4">
                    {renderField("LibreTranslate URL", "libre_base_url", "https://libretranslate.com", "https://github.com/LibreTranslate/LibreTranslate")}
                    {renderField("LibreTranslate Key (Optional)", "libre_api_key", "API Key if required", "#")}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => { onSave(localKeys); onClose(); }}>Save Keys</Button>
                </div>
            </div>
        </Modal>
    );
};

export const LocalizationView: React.FC = () => {
    const context = useContext(AppContext);
    const { articles = [], setArticles, models = [], defaultModelId, supabase, session, fetchData } = context || {};

    const [selectedArticleId, setSelectedArticleId] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('Chinese (Simplified)');

    // Translation Logic State
    const [selectedProvider, setSelectedProvider] = useState<TranslationProvider>(TranslationProvider.LLM);
    const [selectedModelId, setSelectedModelId] = useState(defaultModelId || models[0]?.id || '');
    const [apiKeys, setApiKeys] = useLocalStorage<TranslationApiKeys>('translation_api_keys', {
        [TranslationProvider.DEEPL]: '',
        [TranslationProvider.GOOGLE]: '',
        [TranslationProvider.MICROSOFT]: '',
        'microsoft_region': ''
    });

    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedContent, setTranslatedContent] = useState('');
    const [translatedTitle, setTranslatedTitle] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const contentRef = useRef('');

    const currentModel = models.find(m => m.id === selectedModelId);
    const sourceArticle = articles.find(a => a.id === selectedArticleId);

    // Group models
    const presetModels = models.filter(m => m.type === ModelProvider.PRESET);
    const customModels = models.filter(m => m.type === ModelProvider.CUSTOM);

    if (!context) return null;

    const handleTranslate = async () => {
        if (!sourceArticle) {
            toast.error("Please select an article.");
            return;
        }

        setIsTranslating(true);
        setTranslatedContent('');
        setTranslatedTitle('');
        contentRef.current = '';

        try {
            // STRATEGY A: LLM Streaming
            if (selectedProvider === TranslationProvider.LLM) {
                if (!currentModel) throw new Error("No LLM Model selected.");

                // 1. Translate Title
                const titlePrompt = `Translate this title to ${targetLanguage}: ${sourceArticle.title}`;
                let titleBuffer = '';
                await translateTextStream(titlePrompt, targetLanguage, currentModel, (c) => titleBuffer += c);
                setTranslatedTitle(titleBuffer.replace(/^["']|["']$/g, '').trim());

                // 2. Translate Content
                await translateTextStream(
                    sourceArticle.content,
                    targetLanguage,
                    currentModel,
                    (chunk) => {
                        contentRef.current += chunk;
                        setTranslatedContent(contentRef.current);
                    }
                );
            }
            // STRATEGY B: Dedicated API (One-shot fetch)
            else {
                // For better UX, we fake a "loading" title while fetching
                setTranslatedTitle("Translating title...");
                setTranslatedContent("Connecting to translation provider...");

                const [newTitle, newContent] = await Promise.all([
                    fetchTranslation(sourceArticle.title, targetLanguage, selectedProvider, apiKeys),
                    fetchTranslation(sourceArticle.content, targetLanguage, selectedProvider, apiKeys)
                ]);

                setTranslatedTitle(newTitle);
                setTranslatedContent(newContent);
            }

            toast.success("Translation complete!");
        } catch (error) {
            console.error(error);
            toast.error(`Translation failed: ${(error as Error).message}`);
            if (selectedProvider !== TranslationProvider.LLM) {
                setTranslatedContent("Error: Check your API Key settings.");
            }
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!sourceArticle || !translatedContent) return;
        if (!supabase || !session) {
            toast.error("You must be logged in to save.");
            return;
        }

        try {
            const providerName = selectedProvider === TranslationProvider.LLM ? currentModel?.nickname : selectedProvider;
            const newArticle: Omit<Article, 'user_id'> = {
                id: `article-${Date.now()}`,
                title: translatedTitle || `${sourceArticle.title} (${targetLanguage})`,
                content: translatedContent,
                keyword_context: sourceArticle.keyword_context, // Inherit context
                parent_project_id: sourceArticle.parent_project_id,
                sub_project_id: sourceArticle.sub_project_id,
                created_at: new Date().toISOString(),
                model_used: `${providerName} (Translation)`,
                language: targetLanguage,
                source_article_id: sourceArticle.id,
                published_destinations: [],
            };

            const { error } = await supabase.from('articles').insert({ ...newArticle, user_id: session.user.id } as any);

            if (error) throw error;

            await fetchData();
            toast.success("Translated article saved to library!");
        } catch (e) {
            toast.error(`Save failed: ${(e as Error).message}`);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <GlobeIcon className="w-8 h-8 mr-3 text-blue-400" />
                本地化中心 (Localization)
            </h1>
            <p className="text-gray-400 mb-6">Select an existing article and translate it using LLMs or professional translation APIs.</p>

            <div className="grid grid-cols-12 gap-6 h-full min-h-0">
                {/* Controls Sidebar */}
                <div className="col-span-3 flex flex-col gap-4">
                    <Card>
                        <div className="space-y-4">
                            <Select label="源文章" value={selectedArticleId} onChange={e => setSelectedArticleId(e.target.value)}>
                                <option value="" disabled>选择文章...</option>
                                {articles.map(a => (
                                    <option key={a.id} value={a.id}>{a.title}</option>
                                ))}
                            </Select>

                            <Select label="目标语言" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)}>
                                {TARGET_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </Select>

                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-300">翻译引擎</label>
                                    <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white" title="API Settings">
                                        <SettingsIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <Select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value as TranslationProvider)}>
                                    <option value={TranslationProvider.LLM}>智能 AI (LLM)</option>
                                    <option value={TranslationProvider.DEEPL}>DeepL API (Pro/Free)</option>
                                    <option value={TranslationProvider.GOOGLE}>Google Cloud Translate</option>
                                    <option value={TranslationProvider.MICROSOFT}>Microsoft Translator</option>
                                    <option value={TranslationProvider.LIBRE}>LibreTranslate (Self-Hosted/Free)</option>
                                </Select>
                            </div>

                            {selectedProvider === TranslationProvider.LLM && (
                                <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                                    <Select label="选择模型" value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
                                        {customModels.length > 0 && (
                                            <optgroup label="自定义模型 (Custom)">
                                                {customModels.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                                            </optgroup>
                                        )}
                                        <optgroup label="预设模型 (Presets)">
                                            {presetModels.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                                        </optgroup>
                                    </Select>
                                </div>
                            )}

                            <Button
                                className="w-full mt-4"
                                onClick={handleTranslate}
                                isLoading={isTranslating}
                                disabled={!selectedArticleId || isTranslating}
                            >
                                {selectedProvider === TranslationProvider.LLM ? '开始流式翻译' : '开始翻译'}
                            </Button>
                        </div>
                    </Card>

                    {sourceArticle && (
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-sm text-gray-400">
                            <p><strong>源字数:</strong> {sourceArticle.content.length} chars</p>
                            <p className="mt-1"><strong>创建于:</strong> {new Date(sourceArticle.created_at).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="col-span-9 flex flex-col gap-4 min-h-0">
                    <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
                        {/* Source View */}
                        <div className="flex flex-col h-full">
                            <h3 className="text-gray-400 font-semibold mb-2 bg-gray-800 py-2 px-3 rounded-t-lg border-b border-gray-700">原文 Markdown</h3>
                            <textarea
                                readOnly
                                value={sourceArticle?.content || ''}
                                className="w-full h-full bg-gray-900/50 border border-gray-700 rounded-b-lg p-4 text-gray-400 resize-none focus:outline-none font-mono text-sm"
                                placeholder="选择左侧文章以加载内容..."
                            />
                        </div>

                        {/* Target View */}
                        <div className="flex flex-col h-full relative">
                            <h3 className="text-blue-400 font-semibold mb-2 bg-gray-800 py-2 px-3 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
                                <span>译文 Preview ({selectedProvider === TranslationProvider.LLM ? 'AI' : 'API'})</span>
                                {translatedTitle && <span className="text-xs text-white bg-blue-600 px-2 py-0.5 rounded truncate max-w-[200px]">{translatedTitle}</span>}
                            </h3>
                            <textarea
                                value={translatedContent}
                                onChange={e => setTranslatedContent(e.target.value)}
                                className="w-full h-full bg-gray-800 border border-gray-600 rounded-b-lg p-4 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                                placeholder="翻译结果将输出至此..."
                            />
                            {isTranslating && (
                                <div className="absolute bottom-4 right-4 text-xs text-blue-300 animate-pulse bg-black/50 px-2 py-1 rounded">
                                    Translating...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="primary" onClick={handleSave} disabled={!translatedContent || isTranslating}>
                            <PencilIcon className="w-4 h-4 mr-2" />
                            保存到文章库
                        </Button>
                    </div>
                </div>
            </div>

            <TranslationSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                keys={apiKeys}
                onSave={setApiKeys}
            />
        </div>
    );
};