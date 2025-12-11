import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Model, KeywordSubProject, Article, Project, Page, ModelProvider, TranslationProvider, TranslationApiKeys } from '../types';
import { ARTICLE_PROMPT_TEMPLATE } from '../constants';
import { generateArticleStream } from '../services/llmService';
import { fetchTranslation } from '../services/translationService';
import useLocalStorage from '../hooks/useLocalStorage';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import Toggle from './ui/Toggle';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { PencilIcon, ImageIcon, GlobeIcon } from './icons';
import { toast } from 'react-hot-toast';

// Helper to format a sub-project into a string for the context textarea
export const formatSubProjectForContext = (subProject: KeywordSubProject): string => {
    let context = `Sub-Project: ${subProject.name}\n`;
    context += `Model Used: ${subProject.model_used}\n\n`;

    subProject.keywords.forEach(l1 => {
        context += `--- Core Keyword ---\n`;
        context += `Keyword: ${l1.keyword}\n`;
        context += `Type: ${l1.type}\n`;
        context += `Page Type: ${l1.pageType}\n\n`;

        l1.children.forEach(l2 => {
            context += `  --- Sub-core Keyword ---\n`;
            context += `  Keyword: ${l2.keyword}\n`;
            context += `  Type: ${l2.type}\n`;
            if (l2.lsi.length > 0) {
                context += `  LSI: ${l2.lsi.map(l => l.text).join(', ')}\n\n`;
            }
        });
    });
    return context;
};


const ArticleGenerator: React.FC<{ setPage?: (page: Page) => void }> = ({ setPage }) => {
    const context = useContext(AppContext);

    // Left panel state
    const [promptTemplate, setPromptTemplate] = useState(ARTICLE_PROMPT_TEMPLATE);
    const [keywordContext, setKeywordContext] = useState('');
    const [selectedModelId, setSelectedModelId] = useState(context?.defaultModelId || context?.models[0]?.id || '');
    const [enableWebSearch, setEnableWebSearch] = useState(false);

    // Right panel state
    const [generatedArticle, setGeneratedArticle] = useState('');
    const [translatedArticle, setTranslatedArticle] = useState('');
    const [savedArticleId, setSavedArticleId] = useState<string | null>(null);

    // Translation State
    const [targetLanguage, setTargetLanguage] = useState('Chinese (Simplified)');
    const [translationProvider, setTranslationProvider] = useState<TranslationProvider>(TranslationProvider.LLM);
    // Keys sharing with LocalizationView via localStorage
    const [apiKeys] = useLocalStorage<TranslationApiKeys>('translation_api_keys', {
        [TranslationProvider.DEEPL]: '',
        [TranslationProvider.GOOGLE]: '',
        [TranslationProvider.MICROSOFT]: '',
        'microsoft_region': ''
    });

    // Control state
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [generationModel, setGenerationModel] = useState<Model | null>(null);

    // Modal states
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);

    // Save modal specific state
    const [articleTitle, setArticleTitle] = useState('');
    const [saveToParentProject, setSaveToParentProject] = useState('');
    const [saveToSubProject, setSaveToSubProject] = useState('');
    const [newParentProjectName, setNewParentProjectName] = useState('');
    const [newSubProjectName, setNewSubProjectName] = useState('');

    // Refs for streaming
    const articleRef = useRef('');


    const { models = [], projects = [], keywordLibrary = [], fetchData, supabase, session, navigationPayload, setNavigationPayload } = context || {};
    const currentSelectedModel = models.find(m => m.id === selectedModelId);

    // Group models
    const presetModels = models.filter(m => m.type === ModelProvider.PRESET);
    const customModels = models.filter(m => m.type === ModelProvider.CUSTOM);


    // Handle Incoming Navigation Payload
    useEffect(() => {
        if (navigationPayload && navigationPayload.type === 'draft_article') {
            setKeywordContext(navigationPayload.data.context || '');
            if (navigationPayload.data.modelId) {
                setSelectedModelId(navigationPayload.data.modelId);
            }
            // Clear payload after consuming
            setNavigationPayload(null);
            toast.success("关键词上下文已加载", { id: 'ctx-loaded' });
        }
    }, [navigationPayload, setNavigationPayload]);

    if (!context) return null;


    const handleGenerate = async () => {
        if (!currentSelectedModel) {
            toast.error("Please select a model.");
            return;
        }
        if (!keywordContext.trim()) {
            toast.error("Keyword context cannot be empty.");
            return;
        }

        setIsLoading(true);
        setGeneratedArticle('');
        setSavedArticleId(null); // Reset saved ID on new generation
        articleRef.current = ''; // Reset ref
        setTranslatedArticle('');

        try {
            // Use Streaming Service
            await generateArticleStream(
                keywordContext,
                currentSelectedModel,
                promptTemplate,
                (chunk) => {
                    articleRef.current += chunk;
                    setGeneratedArticle(articleRef.current);
                }
            );
            setGenerationModel(currentSelectedModel);
            toast.success("Article generated successfully!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Generation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!generatedArticle) return;

        // Validation: If using API, check key exists
        if (translationProvider !== TranslationProvider.LLM && !apiKeys[translationProvider]) {
            toast.error(`Missing API Key for ${translationProvider}. Please configure in Localization Center.`);
            return;
        }
        if (translationProvider === TranslationProvider.LLM && !currentSelectedModel) {
            toast.error("Please select a model for LLM translation.");
            return;
        }

        setIsTranslating(true);
        try {
            // Call Unified Service
            // Note: For LLM, we pass the current model. For others, keys are used.
            const result = await fetchTranslation(
                generatedArticle,
                targetLanguage,
                translationProvider,
                apiKeys,
                currentSelectedModel // Passed only if LLM provider
            );
            setTranslatedArticle(result);
            toast.success("Translation complete.");
        } catch (err) {
            toast.error(`Translation failed: ${(err as Error).message}`);
        } finally {
            setIsTranslating(false);
        }
    };

    // --- Workflow Action: Go to Image Studio ---
    const handleVisualize = () => {
        if (!generatedArticle || !setPage) return;

        if (!savedArticleId) {
            if (!confirm("文章尚未保存。如果直接跳转，生成的图片将无法自动回写到文章库。建议先保存文章。\n\n点击“确定”继续跳转，或点击“取消”留在此页保存。")) {
                return;
            }
        }

        setNavigationPayload({
            type: 'create_images',
            data: {
                content: generatedArticle,
                // Critical: Pass source article ID so image processor knows where to write back to
                sourceArticleId: savedArticleId || undefined,
                projectContext: saveToParentProject && saveToSubProject ? { parentId: saveToParentProject, subId: saveToSubProject } : undefined
            }
        });
        setPage('image-text');
    };

    const handleCloseSaveModal = () => {
        setIsSaveModalOpen(false);
        // Don't reset everything so user can easily fix errors or change mind
    };

    const handleOpenSaveModal = () => {
        // Pre-fill title with the first line of the article, assuming it's a heading
        const titleLine = generatedArticle.split('\n').find(l => l.trim().length > 0) || '';
        if (!articleTitle) {
            setArticleTitle(titleLine.replace(/^[#\s]+/, '').trim() || 'Untitled Article');
        }
        if (!saveToParentProject && projects.length > 0) {
            setSaveToParentProject(projects[0]?.id || '');
        }
        setIsSaveModalOpen(true);
    };

    const handleSaveArticle = async () => {
        if (!generationModel || !supabase || !session) return;

        let finalParentProjectId = saveToParentProject;
        let finalSubProjectId = saveToSubProject;

        try {
            if (saveToParentProject === 'create_new') {
                const newProject = {
                    id: `proj-${Date.now()}`,
                    name: newParentProjectName.trim(),
                    created_at: new Date().toISOString(),
                };
                const { data: newProjDataRaw, error: projError } = await supabase.from('projects').insert({ ...newProject, user_id: session.user.id } as any).select().single();
                const newProjData = newProjDataRaw as any;

                if (projError) throw projError;
                if (!newProjData) throw new Error("Failed to create parent project");
                finalParentProjectId = newProjData.id;

                const newSubProject = {
                    id: `subproj-${Date.now()}`,
                    name: newSubProjectName.trim(),
                    parent_project_id: finalParentProjectId,
                    saved_at: new Date().toISOString(),
                    model_used: generationModel.nickname,
                    keywords: [],
                };
                const { data: newSubProjDataRaw, error: subProjError } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id } as any).select().single();
                const newSubProjData = newSubProjDataRaw as any;

                if (subProjError) throw subProjError;
                if (!newSubProjData) throw new Error("Failed to create sub project");
                finalSubProjectId = newSubProjData.id;

            } else if (saveToSubProject === 'create_new') {
                const newSubProject = {
                    id: `subproj-${Date.now()}`,
                    name: newSubProjectName.trim(),
                    parent_project_id: finalParentProjectId,
                    saved_at: new Date().toISOString(),
                    model_used: generationModel.nickname,
                    keywords: [],
                };
                const { data: newSubProjDataRaw, error: subProjError } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id } as any).select().single();
                const newSubProjData = newSubProjDataRaw as any;

                if (subProjError) throw subProjError;
                if (!newSubProjData) throw new Error("Failed to create sub project");
                finalSubProjectId = newSubProjData.id;
            }

            const articleId = `article-${Date.now()}`;
            const newArticle: Omit<Article, 'user_id'> = {
                id: articleId,
                title: articleTitle.trim(),
                content: generatedArticle,
                keyword_context: keywordContext,
                parent_project_id: finalParentProjectId,
                sub_project_id: finalSubProjectId,
                created_at: new Date().toISOString(),
                model_used: generationModel.nickname,
                published_destinations: [],
            };

            const { error: articleError } = await supabase.from('articles').insert({ ...newArticle, user_id: session.user.id } as any);
            if (articleError) throw articleError;

            // --- NEW: Link Article to Keywords (Normalized) ---
            if (finalSubProjectId) {
                try {
                    // 1. Fetch all keywords belonging to this sub-project
                    // Cast to any because 'keywords' table might not be in types yet
                    const { data: keywordNodes, error: kwFetchError } = await (supabase as any)
                        .from('keywords')
                        .select('id')
                        .eq('sub_project_id', finalSubProjectId);

                    if (!kwFetchError && keywordNodes && keywordNodes.length > 0) {
                        // 2. Prepare intersection rows
                        const articleKeywords = keywordNodes.map((k: any) => ({
                            article_id: articleId,
                            keyword_id: k.id
                        }));

                        // 3. Insert links
                        const { error: linkError } = await (supabase as any)
                            .from('article_keywords')
                            .insert(articleKeywords);

                        if (linkError) console.error("Failed to link article keywords:", linkError);
                    }
                } catch (linkErr) {
                    console.error("Link keywords error:", linkErr);
                }
            }

            setSavedArticleId(articleId); // Save successful, store ID
            await fetchData();
            handleCloseSaveModal();
            toast.success("Article saved successfully!");

        } catch (err) {
            toast.error(`Save failed: ${(err as Error).message}`);
        }
    };

    const handleSelectSubProject = (subProject: KeywordSubProject) => {
        setKeywordContext(formatSubProjectForContext(subProject));
        setSaveToParentProject(subProject.parent_project_id);
        setSaveToSubProject(subProject.id);
        setIsLibraryModalOpen(false);
    };

    const isSaveDisabled = () => {
        if (!articleTitle.trim() || !generationModel) return true;
        if (saveToParentProject === 'create_new') return !newParentProjectName.trim() || !newSubProjectName.trim();
        if (!saveToParentProject) return true;
        if (saveToSubProject === 'create_new') return !newSubProjectName.trim();
        if (!saveToSubProject) return true;
        return false;
    };

    return (
        <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-1/3 min-w-[450px] max-w-[550px] bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white">文章生成</h2>
                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Prompt Template</label>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingPrompt(promptTemplate); setIsPromptModalOpen(true); }}>查看/编辑</Button>
                    </div>
                    <textarea readOnly value={promptTemplate} rows={5} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-400 cursor-pointer" />
                </Card>
                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">关键词上下文</label>
                        <Button variant="secondary" size="sm" onClick={() => setIsLibraryModalOpen(true)}>从库中提取</Button>
                    </div>
                    <textarea
                        value={keywordContext}
                        onChange={(e) => setKeywordContext(e.target.value)}
                        rows={12}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm"
                        placeholder="Paste keywords or extract from your library."
                    />
                </Card>
                <Card>
                    <div className="space-y-4">
                        <div className="pb-4 border-b border-gray-700">
                            <Select label="Select Model (Generation)" value={selectedModelId || ''} onChange={(e) => setSelectedModelId(e.target.value)}>
                                {customModels.length > 0 && (
                                    <optgroup label="自定义模型 (Custom)">
                                        {customModels.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                                    </optgroup>
                                )}
                                <optgroup label="预设模型 (Presets)">
                                    {presetModels.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                                </optgroup>
                            </Select>
                            <Toggle label="Enable Web Search" enabled={enableWebSearch} setEnabled={setEnableWebSearch} disabled={!currentSelectedModel?.supports_web_search} />
                        </div>

                        {/* NEW: Translation Strategy Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                                <GlobeIcon className="w-4 h-4 mr-2" />
                                翻译策略 (Translation)
                            </label>
                            <div className="flex gap-2 mb-2">
                                <Select value={translationProvider} onChange={(e) => setTranslationProvider(e.target.value as TranslationProvider)}>
                                    <option value={TranslationProvider.LLM}>智能 AI (LLM)</option>
                                    <option value={TranslationProvider.DEEPL}>DeepL API</option>
                                    <option value={TranslationProvider.GOOGLE}>Google Translate</option>
                                    <option value={TranslationProvider.MICROSOFT}>Microsoft Translator</option>
                                    <option value={TranslationProvider.LIBRE}>LibreTranslate (Free/Self-Hosted)</option>
                                </Select>
                                {translationProvider !== TranslationProvider.LLM && (
                                    <div className={`flex items-center px-2 text-xs rounded border ${(
                                        translationProvider === TranslationProvider.LIBRE && !apiKeys.libre_api_key && !apiKeys.libre_base_url // Libre is lenient, green if default
                                            ? true
                                            : !!apiKeys[translationProvider]
                                    ) ? 'border-green-800 bg-green-900/30 text-green-400' : 'border-red-800 bg-red-900/30 text-red-400'}`}>
                                        {(translationProvider === TranslationProvider.LIBRE && !apiKeys.libre_api_key) ? 'Public/Open' : (apiKeys[translationProvider] ? 'Key Configured' : 'Missing Key')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
                <div className="mt-auto pt-4">
                    <Button onClick={handleGenerate} isLoading={isLoading} className="w-full text-lg">
                        {isLoading ? 'Generating...' : 'Start Generating'}
                    </Button>
                </div>
            </div>

            {/* Right Panel - Dual View */}
            <div className="flex-1 p-8 flex flex-col overflow-y-auto">
                {!generatedArticle && !isLoading && (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>生成的文章将显示在此处 (支持打字机流式效果)</p>
                    </div>
                )}

                {(generatedArticle || isLoading) && (
                    <div className="flex-1 flex flex-col h-full animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">生成内容</h2>
                                <Button variant="secondary" size="sm" onClick={() => setIsContentModalOpen(true)}>
                                    <PencilIcon className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleGenerate} isLoading={isLoading} size="sm" variant="secondary">重新生成</Button>
                                {/* NEW: Visualize Button */}
                                <Button
                                    onClick={handleVisualize}
                                    size="sm"
                                    variant={savedArticleId ? "primary" : "secondary"}
                                    disabled={isLoading || !generatedArticle}
                                    title={savedArticleId ? "跳转到图片工作室" : "先保存文章以启用完整功能"}
                                >
                                    <ImageIcon className="w-4 h-4 mr-1" />
                                    {savedArticleId ? "配图 (Visualize)" : "配图 (未保存)"}
                                </Button>
                                <Button onClick={handleOpenSaveModal} size="sm" variant="primary" disabled={isLoading}>
                                    {savedArticleId ? "已保存" : "保存文章"}
                                </Button>
                            </div>
                        </div>

                        {/* DUAL VIEW CONTAINER */}
                        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 mb-4">
                            {/* LEFT: ORIGINAL */}
                            <div className="flex flex-col h-full">
                                <div className="bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700 flex justify-between">
                                    <span className="text-sm font-semibold text-gray-300">原文 (Original)</span>
                                </div>
                                <textarea
                                    value={generatedArticle}
                                    onChange={(e) => setGeneratedArticle(e.target.value)}
                                    className="w-full flex-1 bg-gray-800 border-l border-r border-b border-gray-700 rounded-b-lg p-4 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-gray-300"
                                    placeholder="文章内容生成中..."
                                />
                            </div>

                            {/* RIGHT: TRANSLATION */}
                            <div className="flex flex-col h-full">
                                <div className="bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-blue-400">中文译文 ({targetLanguage})</span>
                                    <Button
                                        onClick={handleTranslate}
                                        isLoading={isTranslating}
                                        size="sm"
                                        variant="primary"
                                        disabled={!generatedArticle || isTranslating}
                                    >
                                        {isTranslating ? '翻译中...' : '点击翻译'}
                                    </Button>
                                </div>
                                <div className="w-full flex-1 bg-gray-800 border-l border-r border-b border-gray-700 rounded-b-lg p-4 whitespace-pre-wrap overflow-y-auto text-sm font-mono text-white relative">
                                    {translatedArticle ? translatedArticle : (
                                        <div className="flex items-center justify-center h-full text-gray-500 italic">
                                            {isTranslating ? 'Translating...' : '点击上方按钮开始翻译'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals remain the same */}
            <Modal isOpen={isPromptModalOpen} onClose={() => setIsPromptModalOpen(false)} title="编辑文章提示">
                <textarea value={editingPrompt} onChange={(e) => setEditingPrompt(e.target.value)} rows={15} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
                <div className="flex justify-end mt-4">
                    <Button onClick={() => { setPromptTemplate(editingPrompt); setIsPromptModalOpen(false); }}>保存提示</Button>
                </div>
            </Modal>

            <Modal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} title="从库中提取关键词">
                <div className="max-h-[60vh] overflow-y-auto">
                    {keywordLibrary.length > 0 ? (
                        <ul className="space-y-2">
                            {keywordLibrary.map(sp => (
                                <li key={sp.id} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer" onClick={() => handleSelectSubProject(sp)}>
                                    <p className="font-semibold text-white">{sp.name}</p>
                                    <p className="text-sm text-gray-400">父项目: {projects.find(p => p.id === sp.parent_project_id)?.name}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center">您的库中没有子项目。</p>}
                </div>
            </Modal>

            <Modal isOpen={isContentModalOpen} onClose={() => setIsContentModalOpen(false)} title="编辑内容">
                <div className="h-[75vh] flex flex-col">
                    <textarea
                        value={generatedArticle}
                        onChange={(e) => setGeneratedArticle(e.target.value)}
                        className="w-full flex-grow bg-gray-900 border border-gray-600 rounded-md p-3 text-base resize-none"
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal isOpen={isSaveModalOpen} onClose={handleCloseSaveModal} title="保存文章">
                <div className="space-y-4">
                    <Input label="文章标题" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} autoFocus />

                    <Select label="父项目" value={saveToParentProject} onChange={(e) => { setSaveToParentProject(e.target.value); setSaveToSubProject(''); }}>
                        <option value="">选择父项目...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="create_new">+ 创建新项目</option>
                    </Select>

                    {saveToParentProject === 'create_new' && (
                        <div className="pl-4 mt-2 space-y-4 border-l-2 border-gray-600">
                            <Input label="新父项目名称" value={newParentProjectName} onChange={(e) => setNewParentProjectName(e.target.value)} />
                            <Input label="新子项目名称" value={newSubProjectName} onChange={(e) => setNewSubProjectName(e.target.value)} />
                        </div>
                    )}

                    {saveToParentProject && saveToParentProject !== 'create_new' && (
                        <>
                            <Select label="子项目" value={saveToSubProject} onChange={(e) => setSaveToSubProject(e.target.value)}>
                                <option value="">选择子项目...</option>
                                <option value="create_new">+ 创建新子项目</option>
                                {keywordLibrary.filter(sp => sp.parent_project_id === saveToParentProject).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                            </Select>
                            {saveToSubProject === 'create_new' && (
                                <Input className="ml-4" label="新子项目名称" value={newSubProjectName} onChange={(e) => setNewSubProjectName(e.target.value)} />
                            )}
                        </>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={handleCloseSaveModal}>取消</Button>
                        <Button variant="primary" onClick={handleSaveArticle} disabled={isSaveDisabled()}>保存</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ArticleGenerator;