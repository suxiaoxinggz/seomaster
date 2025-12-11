
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { Model, ModelProvider, ApiProvider } from '../../types';
import { fetchRemoteModels, verifyModelConnection } from '../../services/llmService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { PlusIcon, TrashIcon, CheckIcon, WandIcon, LightningIcon, OpenAIIcon, DeepSeekIcon, AnthropicIcon, GoogleIcon, NebiusIcon, GroqIcon, SiliconFlowIcon, ZhipuIcon, MoonshotIcon, YiIcon, MistralIcon, TogetherIcon, DatabaseIcon } from '../icons';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';

const ProviderLogo: React.FC<{ provider: ApiProvider, className?: string }> = ({ provider, className = "w-6 h-6" }) => {
    switch (provider) {
        case ApiProvider.OPENAI:
            return <OpenAIIcon className={`${className} text-green-400`} />;
        case ApiProvider.ANTHROPIC:
            return <AnthropicIcon className={`${className} text-orange-300`} />;
        case ApiProvider.DEEPSEEK:
            return <DeepSeekIcon className={`${className} text-blue-400`} />;
        case ApiProvider.GEMINI:
            return <GoogleIcon className={`${className} text-blue-300`} />;
        case ApiProvider.NEBIUS:
            return <NebiusIcon className={`${className} text-yellow-400`} />;
        case ApiProvider.GROQ:
            return <GroqIcon className={`${className} text-orange-500`} />;
        case ApiProvider.SILICONFLOW:
            return <SiliconFlowIcon className={`${className} text-purple-400`} />;
        case ApiProvider.ZHIPU:
            return <ZhipuIcon className={`${className} text-blue-500`} />;
        case ApiProvider.MOONSHOT:
            return <MoonshotIcon className={`${className} text-white`} />;
        case ApiProvider.YI:
            return <YiIcon className={`${className} text-green-500`} />;
        case ApiProvider.MISTRAL:
            return <MistralIcon className={`${className} text-yellow-500`} />;
        case ApiProvider.TOGETHER:
            return <TogetherIcon className={`${className} text-blue-400`} />;
        default:
            return (
                <div className={`${className} bg-gray-700 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-300`}>
                    AI
                </div>
            );
    }
};

const LlmSettingsTab: React.FC = () => {
    const context = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<Partial<Model> | null>(null);
    const [fetchedModels, setFetchedModels] = useState<{ id: string, name?: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<string>('');

    // Filter state
    const [filterProvider, setFilterProvider] = useState<string>('all');


    const { models = [], setModels = () => { }, defaultModelId = null, setDefaultModelId = () => { }, session, supabase, fetchData = async () => { }, seoConfig = { provider: 'mock' }, setSeoConfig = () => { } } = context || {};

    const handleOpenModal = (model: Partial<Model> | null = null) => {
        setFetchedModels([]);
        setTestStatus('idle');
        setTestMessage('');
        if (model) {
            setEditingModel({ ...model });
        } else {
            setEditingModel({
                type: ModelProvider.CUSTOM,
                supports_web_search: false,
                api_provider: ApiProvider.OPENAI_COMPATIBLE,
                base_url: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleProviderChange = (provider: ApiProvider) => {
        let baseURL = editingModel?.base_url || '';
        // Auto-fill base URL helpers
        switch (provider) {
            case ApiProvider.DEEPSEEK: baseURL = 'https://api.deepseek.com'; break;
            case ApiProvider.NEBIUS: baseURL = 'https://api.studio.nebius.ai/v1'; break;
            case ApiProvider.GROQ: baseURL = 'https://api.groq.com/openai/v1'; break;
            case ApiProvider.SILICONFLOW: baseURL = 'https://api.siliconflow.cn/v1'; break;
            case ApiProvider.ZHIPU: baseURL = 'https://open.bigmodel.cn/api/paas/v4'; break;
            case ApiProvider.MOONSHOT: baseURL = 'https://api.moonshot.cn/v1'; break;
            case ApiProvider.YI: baseURL = 'https://api.lingyiwanwu.com/v1'; break;
            case ApiProvider.MISTRAL: baseURL = 'https://api.mistral.ai/v1'; break;
            case ApiProvider.TOGETHER: baseURL = 'https://api.together.ai/v1'; break;
            case ApiProvider.OPENROUTER: baseURL = 'https://openrouter.ai/api/v1'; break;
            case ApiProvider.MODELSCOPE: baseURL = 'https://api-inference.modelscope.cn/v1'; break;
            case ApiProvider.VOLCENGINE: baseURL = 'https://ark-api.volcengine.com/v3'; break; // Volcano Ark
            case ApiProvider.OPENAI: baseURL = 'https://api.openai.com/v1'; break;
            case ApiProvider.GEMINI: baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/'; break;
        }
        setEditingModel({ ...editingModel, api_provider: provider, base_url: baseURL });
    };

    const handleCloseModal = () => {
        setEditingModel(null);
        setFetchedModels([]);
        setIsModalOpen(false);
    };

    const handleFetchModels = async () => {
        if (!editingModel?.base_url || !editingModel?.api_key) {
            alert("Please enter Base URL and API Key first.");
            return;
        }
        setIsFetchingModels(true);
        try {
            const list = await fetchRemoteModels(editingModel.base_url, editingModel.api_key);
            setFetchedModels(list);
            if (list.length > 0) {
                if (!editingModel.id) {
                    setEditingModel(prev => ({ ...prev, id: list[0].id }));
                }
            } else {
                alert("No models found at this endpoint. Please enter Model ID manually.");
            }
        } catch (e) {
            alert(`Failed to fetch models: ${(e as Error).message}. \n\nPlease enter the Model ID manually.`);
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleTestConnection = async () => {
        if (!editingModel) return;
        if (editingModel.api_provider !== ApiProvider.GEMINI && (!editingModel.api_key || !editingModel.base_url)) {
            alert("Please enter API Key and Base URL to test.");
            return;
        }
        if (!editingModel.id) {
            alert("Please enter a Model ID to test the connection.");
            return;
        }

        setTestStatus('testing');
        setTestMessage('Testing connection...');

        const tempModel: Model = {
            id: editingModel.id,
            user_id: 'temp',
            nickname: editingModel.nickname || 'Temp',
            api_key: editingModel.api_key || '',
            base_url: editingModel.base_url || '',
            version: '',
            supports_web_search: false,
            type: editingModel.type || ModelProvider.CUSTOM,
            api_provider: editingModel.api_provider || ApiProvider.OPENAI_COMPATIBLE,
            is_default: false
        };

        const result = await verifyModelConnection(tempModel);

        setTestStatus(result.success ? 'success' : 'error');
        setTestMessage(result.message);
    };

    const handleSaveModel = async () => {
        if (!editingModel) return;
        // if (!editingModel.nickname) { alert("Please provide a Display Name."); return; } // Removed for Smart Default
        if (!editingModel.id) { alert("Model ID is required."); return; }

        try {
            const originalPreset = models.find(m => m.id === editingModel.id && m.type === ModelProvider.PRESET);
            const isStrictPresetUpdate = !!originalPreset;

            const finalModel: Model = {
                id: editingModel.id,
                user_id: session?.user?.id || 'guest',
                nickname: editingModel.nickname || editingModel.id, // Smart Default: Use ID if no nickname
                api_key: editingModel.api_key || '',
                base_url: editingModel.base_url || '',
                version: editingModel.version || '',
                supports_web_search: editingModel.supports_web_search || false,
                type: isStrictPresetUpdate ? ModelProvider.PRESET : ModelProvider.CUSTOM,
                api_provider: editingModel.api_provider || ApiProvider.OPENAI_COMPATIBLE,
                is_default: editingModel.is_default || false
            };

            if (session && supabase) {
                if (isStrictPresetUpdate) {
                    const { error } = await (supabase.from('models') as any)
                        .update({ api_key: finalModel.api_key, base_url: finalModel.base_url, nickname: finalModel.nickname })
                        .eq('id', finalModel.id);
                    if (error) throw error;
                } else {
                    const { error } = await (supabase.from('models') as any)
                        .upsert({ ...finalModel, user_id: session.user.id });
                    if (error) throw error;
                }
                await fetchData();
            } else {
                setModels(prev => {
                    const exists = prev.some(m => m.id === finalModel.id);
                    if (exists) {
                        return prev.map(m => m.id === finalModel.id ? { ...m, ...finalModel } : m);
                    }
                    return [...prev, finalModel];
                });
            }
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert(`Error saving model: ${(error as Error).message}`);
        }
    };

    const handleDeleteModel = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this model?")) {
            if (session && supabase) {
                const { error } = await supabase.from('models').delete().eq('id', id);
                if (error) { alert(`Error deleting model: ${error.message}`); return; }
                await fetchData();
            } else {
                setModels(prev => prev.filter(m => m.id !== id));
            }
            if (defaultModelId === id) {
                const newDefault = models.find(m => m.id !== id);
                setDefaultModelId(newDefault?.id || null);
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        const previousDefaultId = defaultModelId;

        // Optimistic update to prevent UI jump/reset
        setModels(prev => prev.map(m => ({
            ...m,
            is_default: m.id === id
        })));
        setDefaultModelId(id);

        if (session && supabase) {
            try {
                // Background sync
                await (supabase.from('models') as any).update({ is_default: false }).eq('user_id', session.user.id);
                const { error } = await (supabase.from('models') as any).update({ is_default: true }).eq('id', id);

                if (error) throw error;
            } catch (error) {
                console.error("Failed to sync default model to DB", error);

                // Rollback on error
                setDefaultModelId(previousDefaultId);
                setModels(prev => prev.map(m => ({
                    ...m,
                    is_default: m.id === previousDefaultId
                })));
                alert("Failed to save default model selection. Reverting changes.");
            }
        }
    }

    const filteredModels = useMemo(() => {
        if (filterProvider === 'all') return models;
        return models.filter(m => m.api_provider === filterProvider);
    }, [models, filterProvider]);

    const uniqueProviders = useMemo(() => {
        return Array.from(new Set(models.map(m => m.api_provider)));
    }, [models]);

    const ModelCard: React.FC<{ model: Model }> = ({ model }) => {
        const isPreset = model.type === ModelProvider.PRESET;
        const isActive = defaultModelId === model.id;

        return (
            <Card className={`flex flex-col justify-between h-full relative group transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 bg-gray-800/80' : 'hover:border-blue-500/30'}`}>
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-900 rounded-lg border border-gray-700">
                                <ProviderLogo provider={model.api_provider} className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-100 leading-tight">{model.nickname}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{model.api_provider}</p>
                            </div>
                        </div>
                        {isActive && (
                            <span className="flex items-center text-[10px] font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full border border-blue-800 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                <CheckIcon className="w-3 h-3 mr-1" /> ACTIVE
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs bg-black/20 p-2 rounded">
                            <span className="text-gray-500">Model ID</span>
                            <span className="text-gray-300 font-mono truncate max-w-[140px]" title={model.id}>{model.id}</span>
                        </div>
                        {model.base_url && (
                            <div className="flex justify-between items-center text-xs bg-black/20 p-2 rounded">
                                <span className="text-gray-500">Base URL</span>
                                <span className="text-gray-300 font-mono truncate max-w-[140px]" title={model.base_url}>{model.base_url}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs bg-black/20 p-2 rounded">
                            <span className="text-gray-500">API Key</span>
                            <span className={`font-mono ${model.api_key ? 'text-green-400' : 'text-yellow-500'}`}>
                                {model.api_key ? '●●●●●●●●' : 'Not Configured'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {model.supports_web_search && <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800/50">Web Search</span>}
                        {!isPreset && <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800/50">Custom</span>}
                    </div>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-4 border-t border-white/5">
                    <Button size="sm" variant="secondary" className="flex-1 bg-gray-700/50 hover:bg-gray-700" onClick={() => handleOpenModal(model)}>
                        {isPreset ? 'Configure' : 'Edit'}
                    </Button>

                    {!isActive && (
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-400 hover:bg-blue-900/20" onClick={() => handleSetDefault(model.id)}>
                            Activate
                        </Button>
                    )}

                    {!isPreset && (
                        <Button size="sm" variant="danger" onClick={() => handleDeleteModel(model.id)}><TrashIcon className="w-4 h-4" /></Button>
                    )}
                </div>
            </Card>
        );
    };

    const isCompatibleProtocol = [ApiProvider.OPENAI_COMPATIBLE, ApiProvider.OPENAI, ApiProvider.DEEPSEEK, ApiProvider.GEMINI, ApiProvider.OPENROUTER, ApiProvider.MODELSCOPE, ApiProvider.VOLCENGINE, ApiProvider.NEBIUS, ApiProvider.GROQ, ApiProvider.SILICONFLOW, ApiProvider.ZHIPU, ApiProvider.MOONSHOT, ApiProvider.YI, ApiProvider.MISTRAL, ApiProvider.TOGETHER].includes(editingModel?.api_provider as ApiProvider);

    // Quick Chips for common models based on provider
    const getQuickChips = (provider: ApiProvider) => {
        switch (provider) {
            case ApiProvider.GEMINI: return ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
            case ApiProvider.OPENAI: return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
            case ApiProvider.ANTHROPIC: return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
            case ApiProvider.DEEPSEEK: return ['deepseek-chat', 'deepseek-reasoner'];
            case ApiProvider.GROQ: return ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];
            case ApiProvider.VOLCENGINE: return ['volc-gpt-4', 'volc-gpt-3.5-turbo', 'doubao-pro-32k']; // Volcano Chips
            default: return [];
        }
    };
    const quickChips = editingModel?.api_provider ? getQuickChips(editingModel.api_provider as ApiProvider) : [];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-8 pt-8">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Large Language Models (LLM)</h2>
                    <p className="text-gray-400 mt-1">Manage persistent connections to AI providers.</p>
                </div>
                <Button onClick={() => handleOpenModal(null)} className="shadow-lg shadow-blue-900/20">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Connect Custom Model
                </Button>
            </div>

            {/* SEO Configuration Section */}
            <div className="px-8">
                <Card className="mb-10 border-blue-900/50 bg-blue-900/10">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
                                <DatabaseIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">SEO Data Provider</h3>
                                <p className="text-sm text-gray-400 mt-1">Configure the source for Keyword Volume, CPC, and Difficulty metrics.</p>

                                <div className="mt-4 flex gap-4 items-center flex-wrap">
                                    <Select
                                        value={seoConfig.provider}
                                        onChange={(e) => setSeoConfig({ ...seoConfig, provider: e.target.value as any })}
                                        className="w-48"
                                    >
                                        <option value="mock">Mock Data (Demo)</option>
                                        <option value="dataforseo">DataForSEO (API)</option>
                                        <option value="seofordata">SEOFORDATA (Custom)</option>
                                    </Select>

                                    {seoConfig.provider !== 'mock' && (
                                        <>
                                            <Input
                                                placeholder="API Login / Key"
                                                value={seoConfig.apiLogin || ''}
                                                onChange={(e) => setSeoConfig({ ...seoConfig, apiLogin: e.target.value })}
                                                className="w-48"
                                            />
                                            <Input
                                                type="password"
                                                placeholder="API Password / Token"
                                                value={seoConfig.apiPassword || ''}
                                                onChange={(e) => setSeoConfig({ ...seoConfig, apiPassword: e.target.value })}
                                                className="w-48"
                                            />
                                        </>
                                    )}
                                </div>
                                {seoConfig.provider !== 'mock' && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Base URL (Optional):
                                        <input
                                            className="bg-transparent border-b border-gray-700 ml-2 focus:outline-none focus:border-blue-500 w-64 text-white"
                                            placeholder="https://api.dataforseo.com/v3"
                                            value={seoConfig.baseUrl || ''}
                                            onChange={(e) => setSeoConfig({ ...seoConfig, baseUrl: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2 px-8">
                <button
                    onClick={() => setFilterProvider('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterProvider === 'all' ? 'bg-white text-black border-white' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                    All Models
                </button>
                {uniqueProviders.map(p => (
                    <button
                        key={p}
                        onClick={() => setFilterProvider(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-2 ${filterProvider === p ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                    >
                        <ProviderLogo provider={p as ApiProvider} className="w-3 h-3" />
                        {p}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 px-8">
                {filteredModels.map(model => <ModelCard key={model.id} model={model} />)}
                {filteredModels.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
                        No models found for this filter.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingModel?.type === ModelProvider.PRESET ? `Configure ${editingModel.nickname}` : 'Connect Custom Model'}>
                <div className="space-y-5">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Display Name"
                                placeholder="e.g. My DeepSeek"
                                value={editingModel?.nickname || ''}
                                onChange={(e) => setEditingModel({ ...editingModel, nickname: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="API Provider Protocol"
                                value={editingModel?.api_provider || ''}
                                onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}
                            >
                                <option value={ApiProvider.OPENAI_COMPATIBLE}>OpenAI Compatible (Generic)</option>
                                <option value={ApiProvider.MISTRAL}>Mistral AI</option>
                                <option value={ApiProvider.TOGETHER}>Together AI</option>
                                <option value={ApiProvider.MOONSHOT}>Moonshot (Kimi)</option>
                                <option value={ApiProvider.YI}>01.ai (Yi)</option>
                                <option value={ApiProvider.ZHIPU}>Zhipu AI (GLM)</option>
                                <option value={ApiProvider.GROQ}>Groq (LPU Inference)</option>
                                <option value={ApiProvider.SILICONFLOW}>SiliconFlow (Qwen/DeepSeek)</option>
                                <option value={ApiProvider.OPENROUTER}>OpenRouter</option>
                                <option value={ApiProvider.DEEPSEEK}>DeepSeek</option>
                                <option value={ApiProvider.NEBIUS}>Nebius AI</option>
                                <option value={ApiProvider.MODELSCOPE}>ModelScope (MaaS)</option>
                                <option value={ApiProvider.VOLCENGINE}>Volcano Engine (Ark)</option>
                                <option value={ApiProvider.ANTHROPIC}>Anthropic (Claude)</option>
                                <option value={ApiProvider.OPENAI}>OpenAI Official</option>
                                <option value={ApiProvider.GEMINI}>Google Gemini</option>
                            </Select>
                        </div>
                    </div>

                    {(editingModel?.type === ModelProvider.CUSTOM || isCompatibleProtocol) && (
                        <Input
                            label="Base URL"
                            placeholder="https://api.deepseek.com/v1"
                            value={editingModel?.base_url || ''}
                            onChange={(e) => setEditingModel({ ...editingModel, base_url: e.target.value })}
                        />
                    )}

                    <Input
                        label="API Key"
                        type="password"
                        placeholder={editingModel?.api_provider === ApiProvider.GEMINI ? "Leave empty to use System Key (Free)" : "sk-..."}
                        value={editingModel?.api_key || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, api_key: e.target.value })}
                    />
                    {editingModel?.api_provider === ApiProvider.GEMINI && (
                        <p className="text-xs text-blue-300 mt-1">
                            * Gemini "Smart Mode": Enter your own key to bypass limits, or leave empty to use our secure server-side key.
                        </p>
                    )}

                    {isCompatibleProtocol && (
                        <div className="flex justify-end">
                            <Button size="sm" variant="secondary" onClick={handleFetchModels} isLoading={isFetchingModels}>
                                <WandIcon className="w-4 h-4 mr-2" />
                                Fetch Available Models
                            </Button>
                        </div>
                    )}

                    <div className="col-span-2">
                        {fetchedModels.length > 0 ? (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-medium text-gray-400">Model ID</label>
                                    <button onClick={() => setFetchedModels([])} className="text-[10px] text-blue-400 hover:text-blue-300 underline">
                                        Enter Manually
                                    </button>
                                </div>
                                <Select
                                    value={editingModel?.id || ''}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        const selectedModel = fetchedModels.find(m => m.id === newId);

                                        // Auto-sync nickname if it's empty or looks like a previous ID
                                        const shouldUpdateName = !editingModel?.nickname || editingModel.nickname === editingModel.id;

                                        setEditingModel({
                                            ...editingModel,
                                            id: newId,
                                            nickname: shouldUpdateName ? (selectedModel?.name || newId) : editingModel?.nickname
                                        });
                                    }}
                                >
                                    {fetchedModels.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                                </Select>
                            </div>
                        ) : (
                            <div>
                                <Input
                                    label="Model ID"
                                    placeholder={editingModel?.api_provider === ApiProvider.GEMINI ? 'e.g. gemini-1.5-flash, gemini-1.0-pro' : 'e.g. deepseek-chat, gpt-4-turbo'}
                                    value={editingModel?.id || ''}
                                    onChange={(e) => setEditingModel({ ...editingModel, id: e.target.value })}
                                />
                                {quickChips.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {quickChips.map(chip => (
                                            <button
                                                key={chip}
                                                onClick={() => setEditingModel({ ...editingModel, id: chip })}
                                                className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-blue-900/40 text-gray-300 hover:text-blue-300 border border-gray-700 rounded-full transition-colors"
                                            >
                                                + {chip}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {editingModel?.type === ModelProvider.CUSTOM && (
                        <Toggle label="Supports Web Search Capability" enabled={editingModel?.supports_web_search || false} setEnabled={(enabled) => setEditingModel({ ...editingModel, supports_web_search: enabled })} />
                    )}

                    {testStatus !== 'idle' && (
                        <div className={`p-3 rounded-lg border text-sm ${testStatus === 'success' ? 'bg-green-900/20 border-green-800 text-green-300' :
                            testStatus === 'error' ? 'bg-red-900/20 border-red-800 text-red-300' :
                                'bg-blue-900/20 border-blue-800 text-blue-300'
                            }`}>
                            {testStatus === 'testing' ? 'Testing connection...' : testMessage}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                        <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="secondary" onClick={handleTestConnection} isLoading={testStatus === 'testing'} disabled={!editingModel?.api_key || !editingModel?.id}>
                            <LightningIcon className="w-4 h-4 mr-2" />
                            Test Connection
                        </Button>
                        <Button variant="primary" onClick={handleSaveModel}>Save Configuration</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LlmSettingsTab;
