import React, { useState, useEffect } from 'react';
import { ImageApiKeys, ImageSource } from '../../types';
import Button from '../ui/Button';
import { SettingsIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon } from '../icons';

interface ImageSettingsContentProps {
    apiKeys: ImageApiKeys;
    onSave: (keys: ImageApiKeys) => void;
    activeSource: ImageSource;
    onSelectSource: (source: ImageSource) => void;
    onCancel?: () => void;
    showCancelButton?: boolean;
}

export const ImageSettingsContent: React.FC<ImageSettingsContentProps> = ({ apiKeys, onSave, activeSource, onSelectSource, onCancel, showCancelButton = true }) => {
    const [keys, setKeys] = useState(apiKeys);
    const [activeTab, setActiveTab] = useState<'generation' | 'stock'>('generation');
    const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setKeys(apiKeys);
    }, [apiKeys]);

    const handleSave = () => {
        onSave(keys);
    };

    const toggleVisibility = (key: string) => {
        setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderField = (label: string, key: keyof ImageApiKeys | 'microsoft_region', link: string, placeholder: string, providerEnum?: ImageSource) => {
        const isVisible = visibleFields[key];
        const isCurrent = providerEnum && activeSource === providerEnum;

        return (
            <div className={`bg-gray-900/50 p-3 rounded-lg border transition-colors ${isCurrent ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700/50 hover:border-gray-600'}`}>
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-300">{label}</label>
                        {isCurrent && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">Active</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center transition-colors"
                        >
                            Get API Key <ExternalLinkIcon className="w-3 h-3 ml-1" />
                        </a>
                        {providerEnum && !isCurrent && (
                            <button
                                onClick={() => onSelectSource(providerEnum)}
                                className="text-[10px] bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 px-2 py-0.5 rounded border border-gray-600 hover:border-blue-500 transition-all"
                            >
                                Use This
                            </button>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <input
                        type={isVisible ? "text" : "password"}
                        placeholder={placeholder}
                        value={keys[key] || ''}
                        onChange={(e) => setKeys({ ...keys, [key]: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => toggleVisibility(key)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                    >
                        {isVisible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex border-b border-gray-700 mb-6">
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'generation' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
                    onClick={() => setActiveTab('generation')}
                >
                    AI Generation
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stock' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
                    onClick={() => setActiveTab('stock')}
                >
                    Stock Libraries
                </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                {activeTab === 'generation' && (
                    <>
                        <div className={`bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border p-4 rounded-lg text-sm text-blue-200 flex items-start justify-between gap-3 ${activeSource === ImageSource.POLLINATIONS ? 'border-blue-500/50' : 'border-blue-500/20'}`}>
                            <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-500/20 rounded-full flex-shrink-0"><SettingsIcon className="w-4 h-4 text-blue-400" /></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <strong className="block text-blue-100">Built-in Free Provider</strong>
                                        {activeSource === ImageSource.POLLINATIONS && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">Active</span>}
                                    </div>
                                    Pollinations.AI (Flux/SD) is enabled by default and requires no API key.
                                </div>
                            </div>
                            {activeSource !== ImageSource.POLLINATIONS && (
                                <button
                                    onClick={() => onSelectSource(ImageSource.POLLINATIONS)}
                                    className="text-[10px] bg-blue-900/50 hover:bg-blue-600 hover:text-white text-blue-200 px-3 py-1 rounded border border-blue-500/30 hover:border-blue-400 transition-all flex-shrink-0"
                                >
                                    Use This
                                </button>
                            )}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">High Performance / Free Tier</h4>
                            <div className="space-y-3">
                                {renderField("Nebius AI (Flux.1)", ImageSource.NEBIUS, "https://studio.nebius.ai/settings/api-keys", "Generate fast Flux images", ImageSource.NEBIUS)}
                                {renderField("SiliconFlow (Kolors)", ImageSource.KOLARS, "https://cloud.siliconflow.cn/", "sk-...", ImageSource.KOLARS)}
                                {renderField("Zhipu AI (CogView)", ImageSource.ZHIPU_COGVIEW, "https://open.bigmodel.cn/usercenter/apikeys", "API Key (Key.Secret)", ImageSource.ZHIPU_COGVIEW)}
                                {renderField("Volcano Engine (Dream)", ImageSource.VOLCENGINE, "https://console.volcengine.com/ark", "API Key (Ark/Dream)", ImageSource.VOLCENGINE)}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pt-2 border-t border-gray-800">Managed APIs</h4>
                            <div className="space-y-3">
                                {renderField("OpenAI (DALL-E 3)", ImageSource.DALLE3, "https://platform.openai.com/api-keys", "sk-...", ImageSource.DALLE3)}
                                {renderField("Stability AI (SD 3.5)", ImageSource.STABILITY, "https://platform.stability.ai/account/keys", "sk-...", ImageSource.STABILITY)}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pt-2 border-t border-gray-800">Serverless & Open Models</h4>
                            <div className="space-y-3">
                                {renderField("Replicate API Token", ImageSource.REPLICATE, "https://replicate.com/account/api-tokens", "r8_...", ImageSource.REPLICATE)}
                                {renderField("Hugging Face Access Token", ImageSource.HUGGINGFACE, "https://huggingface.co/settings/tokens", "hf_...", ImageSource.HUGGINGFACE)}
                                {renderField("OpenRouter API Key", ImageSource.OPENROUTER, "https://openrouter.ai/keys", "sk-or-...", ImageSource.OPENROUTER)}
                                <div className={`bg-gray-900/50 p-3 rounded-lg border transition-colors ${activeSource === ImageSource.CLOUDFLARE ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700/50 hover:border-gray-600'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-sm font-semibold text-gray-300">Cloudflare Workers AI</h5>
                                            {activeSource === ImageSource.CLOUDFLARE && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">Active</span>}
                                        </div>
                                        {activeSource !== ImageSource.CLOUDFLARE && (
                                            <button
                                                onClick={() => onSelectSource(ImageSource.CLOUDFLARE)}
                                                className="text-[10px] bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 px-2 py-0.5 rounded border border-gray-600 hover:border-blue-500 transition-all"
                                            >
                                                Use This
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {renderField("Account ID", 'cloudflare_account_id', "https://dash.cloudflare.com", "Account ID")}
                                        {renderField("Workers AI Token", 'cloudflare_token', "https://dash.cloudflare.com/profile/api-tokens", "Global or Workers AI Token")}
                                        <div className="pt-2 border-t border-gray-700 mt-2">
                                            <h6 className="text-xs font-semibold text-gray-400 mb-2">R2 Storage (Optional)</h6>
                                            <p className="text-[10px] text-gray-500 mb-2">Required for 'Optimization' storage strategy. Leave empty to use Database storage.</p>
                                            <div className="space-y-2">
                                                {renderField("R2 Access Key ID", 'r2_access_key_id', "https://dash.cloudflare.com/?to=/:account/r2/api-tokens", "Access Key ID")}
                                                {renderField("R2 Secret Access Key", 'r2_secret_access_key', "https://dash.cloudflare.com/?to=/:account/r2/api-tokens", "Secret Access Key")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'stock' && (
                    <div className="space-y-5">
                        <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-400">
                            Connect stock image libraries to search and insert real photos into your articles.
                        </div>
                        {renderField("Pixabay API Key", ImageSource.PIXABAY, "https://pixabay.com/api/docs/", "Enter Pixabay API Key", ImageSource.PIXABAY)}
                        {renderField("Unsplash Access Key", ImageSource.UNSPLASH, "https://unsplash.com/developers", "Enter Unsplash Access Key", ImageSource.UNSPLASH)}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700 mt-2">
                {showCancelButton && onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
                <Button variant="primary" onClick={handleSave}>Save Configuration</Button>
            </div>
        </div>
    );
};
