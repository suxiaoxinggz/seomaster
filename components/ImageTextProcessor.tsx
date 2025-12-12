
import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { ImageSource, ImageApiKeys, ImageObject, Article, PixabayParams, UnsplashParams, KolarsParams, PollinationsParams, DalleParams, StabilityParams, SavedImageSet, PostToPublish, Project, KeywordSubProject, CloudflareParams, OpenRouterParams, NebiusParams, ZhipuImageParams } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { fetchPixabayImages, fetchUnsplashImages, fetchKolorsImages, fetchPollinationsImages, fetchReplicateImages, fetchHuggingFaceImages, fetchCloudflareImages, fetchOpenRouterImages, fetchNebiusImages, fetchZhipuImages, fetchModelScopeImages, fetchVolcEngineImages, fetchOpenAIImages, fetchStabilityImages, fetchAvailableImageModels, convertUrlToBase64 } from '../services/imageService';
import { uploadImageToBackend } from '../services/api';
import { toast } from 'react-hot-toast';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Modal from './ui/Modal';
import { SettingsIcon, ExternalLinkIcon, DownloadIcon, CheckIcon, TrashIcon, ExpandIcon, ChevronDownIcon, PencilIcon, ImageIcon, WandIcon, EyeIcon, EyeOffIcon, CloudIcon, DocumentIcon } from './icons';
import Checkbox from './ui/Checkbox';
import Spinner from './ui/Spinner';
import Toggle from './ui/Toggle';
import { markdownToHtml } from '../services/formatters/shared/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImageSettingsContent } from './settings/ImageSettingsContent';

// --- SUB-COMPONENTS ---
const ApiSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    apiKeys: ImageApiKeys;
    onSave: (keys: ImageApiKeys) => void;
    activeSource: ImageSource;
    onSelectSource: (source: ImageSource) => void;
}> = ({ isOpen, onClose, apiKeys, onSave, activeSource, onSelectSource }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Image Services Configuration">
            <div className="h-[600px] overflow-hidden">
                <ImageSettingsContent
                    apiKeys={apiKeys}
                    onSave={(keys) => { onSave(keys); onClose(); }}
                    activeSource={activeSource}
                    onSelectSource={onSelectSource}
                    onCancel={onClose}
                    showCancelButton={true}
                />
            </div>
        </Modal>
    );
};

const ImageCard: React.FC<{
    image: ImageObject;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onViewImage: (image: ImageObject) => void;
}> = ({ image, isSelected, onToggleSelect, onViewImage }) => (
    <div
        className={`relative group w-full h-full rounded-lg overflow-hidden border transition-all hover:scale-[1.02] cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/5 bg-gray-900 shadow-md'}`}
        onClick={() => onToggleSelect(image.id)}
    >
        <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
            <Checkbox
                id={`img-select-${image.id}`}
                checked={isSelected}
                onChange={() => onToggleSelect(image.id)}
                className="transform scale-110 shadow-lg"
                aria-label={`Select image ${image.alt_description}`}
            />
        </div>
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => onViewImage(image)}
                className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors"
                title="View Full Size"
            >
                <ExpandIcon className="w-4 h-4" />
            </button>
        </div>

        <div className="w-full h-full">
            <div className={`absolute inset-0 bg-blue-600/10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}></div>

            <img src={image.url_regular} alt={image.alt_description} className="w-full h-full object-cover" loading="lazy" />

            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="font-semibold text-white truncate">{image.source_platform}</p>
                <p className="text-gray-300 truncate">{image.author_name}</p>
            </div>
        </div>
    </div>
);

const ImageControls: React.FC<{
    source: ImageSource;
    setSource: (source: ImageSource) => void;
    params: any;
    setParams: (params: any) => void;
    apiKeys: ImageApiKeys;
}> = ({ source, setSource, params, setParams, apiKeys }) => {
    // Determine which inputs to show based on source
    const showNegative = [ImageSource.KOLARS, ImageSource.POLLINATIONS, ImageSource.STABILITY, ImageSource.REPLICATE, ImageSource.HUGGINGFACE, ImageSource.CLOUDFLARE, ImageSource.NEBIUS, ImageSource.MODELSCOPE, ImageSource.VOLCENGINE].includes(source);
    const showCount = [ImageSource.KOLARS, ImageSource.PIXABAY, ImageSource.UNSPLASH, ImageSource.POLLINATIONS, ImageSource.OPENROUTER, ImageSource.NEBIUS].includes(source);

    // Model Fetching State
    const [fetchedModels, setFetchedModels] = useState<{ id: string, name?: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    const handleFetchModels = async () => {
        setIsFetchingModels(true);
        try {
            const models = await fetchAvailableImageModels(source, apiKeys);
            setFetchedModels(models);
            if (models.length > 0) {
                setParams({ ...params, model: models[0].id });
            } else {
                alert("No models found or empty list returned.");
            }
        } catch (e) {
            alert(`Failed to fetch models: ${(e as Error).message} `);
        } finally {
            setIsFetchingModels(false);
        }
    };

    const isFetchable = [ImageSource.CLOUDFLARE, ImageSource.OPENROUTER, ImageSource.REPLICATE].includes(source);

    return (
        <Card className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Generation Settings</h3>

            <Select label="Provider" value={source} onChange={(e) => { setSource(e.target.value as ImageSource); setFetchedModels([]); }}>
                <optgroup label="AI Generation (High Quality)">
                    <option value={ImageSource.MODELSCOPE}>ModelScope (AIGC - New)</option>
                    <option value={ImageSource.VOLCENGINE}>Volcano Engine (Dream AI - New)</option>
                    <option value={ImageSource.NEBIUS}>Flux.1 (Nebius AI - Free/Cheap)</option>
                    <option value={ImageSource.POLLINATIONS}>Flux.1 / SDXL (Pollinations - Free)</option>
                    <option value={ImageSource.KOLARS}>Kolors (SiliconFlow)</option>
                    <option value={ImageSource.ZHIPU_COGVIEW}>CogView (Zhipu AI)</option>
                    <option value={ImageSource.DALLE3}>DALL-E 3 (OpenAI)</option>
                    <option value={ImageSource.STABILITY}>Stable Diffusion 3.5 (Stability)</option>
                    <option value={ImageSource.REPLICATE}>Replicate (Flux/SDXL)</option>
                    <option value={ImageSource.HUGGINGFACE}>Hugging Face (Inference)</option>
                    <option value={ImageSource.CLOUDFLARE}>Cloudflare Workers AI</option>
                    <option value={ImageSource.OPENROUTER}>OpenRouter</option>
                </optgroup>
                <optgroup label="Stock Search (Free)">
                    <option value={ImageSource.UNSPLASH}>Unsplash</option>
                    <option value={ImageSource.PIXABAY}>Pixabay</option>
                </optgroup>
            </Select>

            {showCount && (
                <Input
                    label="Batch Size"
                    type="number"
                    min="1"
                    max={source === ImageSource.KOLARS || source === ImageSource.NEBIUS ? 4 : 20}
                    value={params.per_page}
                    onChange={(e) => setParams({ ...params, per_page: parseInt(e.target.value, 10) })}
                />
            )}

            {showNegative && (
                <Input
                    label="Negative Prompt (Exclude)"
                    placeholder="e.g. blurry, text, watermark, bad anatomy"
                    value={params.negative_prompt}
                    onChange={(e) => setParams({ ...params, negative_prompt: e.target.value })}
                />
            )}

            {/* Dynamic Controls based on Source */}
            <div className="pt-2 space-y-3">

                {source === ImageSource.DALLE3 && (
                    <div className="grid grid-cols-2 gap-2">
                        <Select label="Size" value={params.size} onChange={e => setParams({ ...params, size: e.target.value })}>
                            <option value="1024x1024">Square (1024x1024)</option>
                            <option value="1024x1792">Portrait (1024x1792)</option>
                            <option value="1792x1024">Landscape (1792x1024)</option>
                        </Select>
                        <Select label="Style" value={params.style} onChange={e => setParams({ ...params, style: e.target.value })}>
                            <option value="vivid">Vivid</option>
                            <option value="natural">Natural</option>
                        </Select>
                        <Select label="Quality" value={params.quality} onChange={e => setParams({ ...params, quality: e.target.value })}>
                            <option value="standard">Standard</option>
                            <option value="hd">HD</option>
                        </Select>
                    </div>
                )}

                {source === ImageSource.ZHIPU_COGVIEW && (
                    <div className="grid grid-cols-2 gap-2">
                        <Select label="Model" value={params.model} onChange={e => setParams({ ...params, model: e.target.value })}>
                            <option value="cogview-3-flash">CogView-3 Flash (Fast)</option>
                            <option value="cogview-3-plus">CogView-3 Plus</option>
                        </Select>
                        <Select label="Size" value={params.size} onChange={e => setParams({ ...params, size: e.target.value })}>
                            <option value="1024x1024">1:1 (1024x1024)</option>
                            <option value="768x1344">9:16 (768x1344)</option>
                            <option value="1344x768">16:9 (1344x768)</option>
                            <option value="864x1152">3:4 (864x1152)</option>
                            <option value="1152x864">4:3 (1152x864)</option>
                            <option value="720x1440">1:2 (720x1440)</option>
                            <option value="1440x720">2:1 (1440x720)</option>
                        </Select>
                    </div>
                )}

                {source === ImageSource.NEBIUS && (
                    <div className="space-y-3">
                        <Select label="Model" value={params.model} onChange={(e) => setParams({ ...params, model: e.target.value })}>
                            <option value="black-forest-labs/flux-1-schnell">Flux 1.0 Schnell (Fast & Cheap)</option>
                            <option value="black-forest-labs/flux-1-dev">Flux 1.0 Dev (High Quality)</option>
                            <option value="stability-ai/sdxl">SDXL (Stable Diffusion XL)</option>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="Width" type="number" step="64" min="256" max="2048" value={params.width} onChange={e => setParams({ ...params, width: parseInt(e.target.value) })} />
                            <Input label="Height" type="number" step="64" min="256" max="2048" value={params.height} onChange={e => setParams({ ...params, height: parseInt(e.target.value) })} />
                        </div>
                        <Input label="Steps (4-50)" type="number" min="1" max="50" value={params.num_inference_steps} onChange={e => setParams({ ...params, num_inference_steps: parseInt(e.target.value) })} />
                    </div>
                )}

                {source === ImageSource.STABILITY && (
                    <div className="grid grid-cols-2 gap-2">
                        <Select label="Aspect Ratio" value={params.aspect_ratio} onChange={e => setParams({ ...params, aspect_ratio: e.target.value })}>
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Cinema</option>
                            <option value="9:16">9:16 Mobile</option>
                            <option value="3:2">3:2 Landscape</option>
                            <option value="2:3">2:3 Portrait</option>
                        </Select>
                        <Select label="Output Format" value={params.output_format} onChange={e => setParams({ ...params, output_format: e.target.value })}>
                            <option value="png">PNG</option>
                            <option value="jpeg">JPEG</option>
                        </Select>
                    </div>
                )}

                {source === ImageSource.POLLINATIONS && (
                    <div className="grid grid-cols-2 gap-2">
                        <Select label="Model" value={params.model} onChange={(e) => setParams({ ...params, model: e.target.value })}>
                            <option value="flux">Flux.1 (Schnell)</option>
                            <option value="flux-realism">Flux Realism</option>
                            <option value="turbo">SDXL Turbo</option>
                        </Select>
                        <div className="col-span-2 grid grid-cols-2 gap-2">
                            <Input label="Width" type="number" min="512" max="2048" value={params.width} onChange={e => setParams({ ...params, width: parseInt(e.target.value) })} />
                            <Input label="Height" type="number" min="512" max="2048" value={params.height} onChange={e => setParams({ ...params, height: parseInt(e.target.value) })} />
                        </div>
                        <Toggle label="Enhance" enabled={params.enhance} setEnabled={(e) => setParams({ ...params, enhance: e })} />
                        <Toggle label="Private" enabled={params.private} setEnabled={(e) => setParams({ ...params, private: e })} />
                    </div>
                )}

                {source === ImageSource.KOLARS && (
                    <div className="grid grid-cols-2 gap-2">
                        <Select label="Size" value={params.image_size} onChange={(e) => setParams({ ...params, image_size: e.target.value })}>
                            <option value="1024x1024">1:1</option>
                            <option value="768x1024">3:4</option>
                            <option value="1024x768">4:3</option>
                        </Select>
                        <Input label="Steps (20-50)" type="number" min="20" max="50" value={params.num_inference_steps} onChange={e => setParams({ ...params, num_inference_steps: parseInt(e.target.value) })} />
                        <Toggle label="Enhance" enabled={params.enhance} setEnabled={(e) => setParams({ ...params, enhance: e })} />
                    </div>
                )}

                {/* Generic Model Handler for Replicate, Cloudflare, OpenRouter, HF, ModelScope */}
                {[ImageSource.REPLICATE, ImageSource.HUGGINGFACE, ImageSource.CLOUDFLARE, ImageSource.OPENROUTER, ImageSource.MODELSCOPE].includes(source) && (
                    <div className="space-y-3">
                        {isFetchable && (
                            <div className="flex justify-end -mb-1">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleFetchModels}
                                    isLoading={isFetchingModels}
                                    className="text-xs py-1"
                                >
                                    <WandIcon className="w-3 h-3 mr-1" />
                                    Fetch Remote Models
                                </Button>
                            </div>
                        )}

                        {fetchedModels.length > 0 ? (
                            <Select
                                label="Model ID"
                                value={params.model}
                                onChange={e => setParams({ ...params, model: e.target.value })}
                            >
                                {fetchedModels.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                            </Select>
                        ) : (
                            <Input
                                label="Model ID"
                                placeholder={source === ImageSource.CLOUDFLARE ? "@cf/..." : "model-id"}
                                value={params.model}
                                onChange={e => setParams({ ...params, model: e.target.value })}
                            />
                        )}

                        {source !== ImageSource.CLOUDFLARE && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Width" type="number" value={params.width} onChange={e => setParams({ ...params, width: parseInt(e.target.value) })} />
                                <Input label="Height" type="number" value={params.height} onChange={e => setParams({ ...params, height: parseInt(e.target.value) })} />
                            </div>
                        )}

                        {source === ImageSource.REPLICATE && (
                            <Select label="Aspect Ratio (If supported)" value={params.aspect_ratio || "1:1"} onChange={e => setParams({ ...params, aspect_ratio: e.target.value })}>
                                <option value="1:1">1:1</option>
                                <option value="16:9">16:9</option>
                                <option value="9:16">9:16</option>
                            </Select>
                        )}

                        {source === ImageSource.HUGGINGFACE && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Steps" type="number" value={params.num_inference_steps} onChange={e => setParams({ ...params, num_inference_steps: parseInt(e.target.value) })} />
                                <Input label="Guidance" type="number" value={params.guidance_scale} onChange={e => setParams({ ...params, guidance_scale: parseFloat(e.target.value) })} />
                            </div>
                        )}



                        {source === ImageSource.MODELSCOPE && (
                            <div className="space-y-2">
                                <Select label="Size" value={params.size} onChange={e => setParams({ ...params, size: e.target.value })}>
                                    <option value="1024x1024">1:1 (1024x1024)</option>
                                    <option value="768x1024">3:4 (768x1024)</option>
                                    <option value="1024x768">4:3 (1024x768)</option>
                                    <option value="720x1280">9:16 (720x1280)</option>
                                    <option value="1280x720">16:9 (1280x720)</option>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Steps (1-100)" type="number" min="1" max="100" value={params.steps} onChange={e => setParams({ ...params, steps: parseInt(e.target.value) })} />
                                    <Input label="Guidance (1.5-20)" type="number" value={params.guidance} onChange={e => setParams({ ...params, guidance: parseFloat(e.target.value) })} />
                                </div>
                                <Input label="Seed (-1 random)" type="number" value={params.seed} onChange={e => setParams({ ...params, seed: parseInt(e.target.value) })} />
                            </div>
                        )}

                        {source === ImageSource.VOLCENGINE && (
                            <div className="space-y-2">
                                <Select label="Model" value={params.model} onChange={e => setParams({ ...params, model: e.target.value })}>
                                    <option value="seedream-4.0">SeaDream 4.0 (Recommended)</option>
                                    <option value="seedream-edit-3.0">SeaDream Edit 3.0</option>
                                </Select>
                                <Select label="Size" value={params.size} onChange={e => setParams({ ...params, size: e.target.value })}>
                                    <option value="1024x1024">1:1 (1024x1024)</option>
                                    <option value="768x1024">3:4 (768x1024)</option>
                                    <option value="1024x768">4:3 (1024x768)</option>
                                    <option value="720x1280">9:16 (720x1280)</option>
                                    <option value="1280x720">16:9 (1280x720)</option>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Steps (1-100)" type="number" min="1" max="100" value={params.steps} onChange={e => setParams({ ...params, steps: parseInt(e.target.value) })} />
                                    <Input label="Guidance (1.5-20)" type="number" value={params.guidance} onChange={e => setParams({ ...params, guidance: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        )}

                        {source === ImageSource.CLOUDFLARE && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Steps (1-50)" type="number" min="1" max="50" value={params.num_steps} onChange={e => setParams({ ...params, num_steps: parseInt(e.target.value) })} />
                                <Input label="Guidance" type="number" value={params.guidance} onChange={e => setParams({ ...params, guidance: parseFloat(e.target.value) })} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

// --- MAIN COMPONENT ---
const ImageTextProcessor: React.FC = () => {
    const context = useContext(AppContext);
    const { navigationPayload, setNavigationPayload } = context || {};

    const [apiKeys, setApiKeys] = useLocalStorage<ImageApiKeys>('image_api_keys', {
        [ImageSource.PIXABAY]: '',
        [ImageSource.UNSPLASH]: '',
        [ImageSource.KOLARS]: '',
        [ImageSource.POLLINATIONS]: '',
        [ImageSource.NEBIUS]: '',
        [ImageSource.ZHIPU_COGVIEW]: '',
        [ImageSource.DALLE3]: '',
        [ImageSource.STABILITY]: '',
        [ImageSource.REPLICATE]: '',
        [ImageSource.HUGGINGFACE]: '',
        [ImageSource.MODELSCOPE]: '',
        [ImageSource.VOLCENGINE]: '', // VolcEngine Key
        [ImageSource.OPENROUTER]: '',
        'cloudflare_account_id': '',
        'cloudflare_token': '',
        'r2_access_key_id': '',
        'r2_secret_access_key': '',
    });
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);

    // --- State Management ---
    const [source, setSource] = useLocalStorage<ImageSource>('default_image_source', ImageSource.POLLINATIONS);
    const [params, setParams] = useState<any>({});
    const [searchTerm, setSearchTerm] = useState('');

    const [images, setImages] = useState<ImageObject[]>([]);
    const [selectedImages, setSelectedImages] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [articleContent, setArticleContent] = useState('');
    const [keywordContext, setKeywordContext] = useState('');
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

    const [insertionStrategy, setInsertionStrategy] = useState<'h2_before' | 'p_before' | 'end_of_article'>('h2_before');
    const [finalPreview, setFinalPreview] = useState('');
    const [finalMarkdown, setFinalMarkdown] = useState('');

    const [viewingImage, setViewingImage] = useState<ImageObject | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [isDirty, setIsDirty] = useState(true);

    // Save Images Modal State
    const [isSaveImagesModalOpen, setIsSaveImagesModalOpen] = useState(false);
    const [imageSetTag, setImageSetTag] = useState("");
    const [saveImagesParentProjectId, setSaveImagesParentProjectId] = useState('');
    const [saveImagesSubProjectId, setSaveImagesSubProjectId] = useState('');
    const [newSaveImagesParentProjectName, setNewSaveImagesParentProjectName] = useState('');
    const [newSaveImagesSubProjectName, setNewSaveImagesSubProjectName] = useState('');
    const [imageNameInputs, setImageNameInputs] = useState<Record<string, string>>({});

    // Context tracking for navigation
    const [sourceArticleId, setSourceArticleId] = useState<string | undefined>(undefined);


    const { articles = [], projects = [], keywordLibrary = [], fetchData, supabase, session } = context || {};

    // --- GENERATE FUNCTION WRAPPER ---
    // Defined before useEffect so it can be called from within
    const executeGeneration = async (queryOverride?: string) => {
        const queryToUse = queryOverride || searchTerm;
        if (!queryToUse.trim()) { setImages([]); return; };

        setIsLoading(true);
        setError(null);
        setSelectedImages({});

        try {
            let result: ImageObject[] = [];
            const currentParams = { ...params, query: queryToUse, prompt: queryToUse };

            if (Object.keys(currentParams).length <= 2) {
                // basic fallback if params state wasn't ready
            }

            switch (source) {
                case ImageSource.PIXABAY:
                    if (!apiKeys[ImageSource.PIXABAY]) throw new Error(`Pixabay API Key missing.`);
                    result = await fetchPixabayImages(currentParams, apiKeys[ImageSource.PIXABAY]);
                    break;
                case ImageSource.UNSPLASH:
                    if (!apiKeys[ImageSource.UNSPLASH]) throw new Error(`Unsplash API Key missing.`);
                    result = await fetchUnsplashImages(currentParams, apiKeys[ImageSource.UNSPLASH]);
                    break;
                case ImageSource.KOLARS:
                    if (!apiKeys[ImageSource.KOLARS]) throw new Error(`Kolors API Key missing.`);
                    result = await fetchKolorsImages(currentParams, apiKeys[ImageSource.KOLARS]);
                    break;
                case ImageSource.POLLINATIONS:
                    result = await fetchPollinationsImages(currentParams);
                    break;
                case ImageSource.NEBIUS:
                    if (!apiKeys[ImageSource.NEBIUS]) throw new Error(`Nebius API Key missing.`);
                    result = await fetchNebiusImages(currentParams, apiKeys[ImageSource.NEBIUS]);
                    break;
                case ImageSource.ZHIPU_COGVIEW:
                    if (!apiKeys[ImageSource.ZHIPU_COGVIEW]) throw new Error(`Zhipu API Key missing.`);
                    result = await fetchZhipuImages(currentParams, apiKeys[ImageSource.ZHIPU_COGVIEW]);
                    break;
                case ImageSource.VOLCENGINE:
                    if (!apiKeys[ImageSource.VOLCENGINE]) throw new Error(`Volcano Engine API Key missing.`);
                    result = await fetchVolcEngineImages(currentParams, apiKeys[ImageSource.VOLCENGINE]);
                    break;
                case ImageSource.REPLICATE:
                    if (!apiKeys[ImageSource.REPLICATE]) throw new Error(`Replicate API Token missing.`);
                    result = await fetchReplicateImages(currentParams, apiKeys[ImageSource.REPLICATE]);
                    break;
                case ImageSource.HUGGINGFACE:
                    if (!apiKeys[ImageSource.HUGGINGFACE]) throw new Error(`Hugging Face Access Token missing.`);
                    result = await fetchHuggingFaceImages(currentParams, apiKeys[ImageSource.HUGGINGFACE]);
                    break;
                case ImageSource.CLOUDFLARE:
                    if (!apiKeys['cloudflare_account_id'] || !apiKeys['cloudflare_token']) throw new Error(`Cloudflare Account ID or API Token missing.`);
                    result = await fetchCloudflareImages(currentParams, apiKeys['cloudflare_account_id'], apiKeys['cloudflare_token']);
                    break;
                case ImageSource.OPENROUTER:
                    if (!apiKeys[ImageSource.OPENROUTER]) throw new Error(`OpenRouter API Key missing.`);
                    result = await fetchOpenRouterImages(currentParams, apiKeys[ImageSource.OPENROUTER]);
                    break;
                case ImageSource.DALLE3:
                    if (!apiKeys[ImageSource.DALLE3]) throw new Error(`OpenAI API Key(for DALL - E) missing.`);
                    result = await fetchOpenAIImages(currentParams, apiKeys[ImageSource.DALLE3]);
                    break;
                case ImageSource.STABILITY:
                    if (!apiKeys[ImageSource.STABILITY]) throw new Error(`Stability AI API Key missing.`);
                    result = await fetchStabilityImages(currentParams, apiKeys[ImageSource.STABILITY]);
                    break;
                case ImageSource.MODELSCOPE:
                    if (!apiKeys[ImageSource.MODELSCOPE]) throw new Error(`ModelScope Access Token missing.`);
                    result = await fetchModelScopeImages(currentParams, apiKeys[ImageSource.MODELSCOPE]);
                    break;
            }

            // --- AUTO-UPLOAD TO R2 LOGIC ---
            // If the source is a Generative AI (not stock), upload immediately to R2
            // to persist the ephemeral URLs/Blobs.
            const isStock = [ImageSource.PIXABAY, ImageSource.UNSPLASH].includes(source);

            if (!isStock && result.length > 0) {
                // Determine if we need to show a simplified "Saving..." state or toast
                // We'll update the state progressively or all at once.

                // Helper to process a single image
                const processImage = async (img: ImageObject): Promise<ImageObject> => {
                    try {
                        let blobToUpload: Blob;

                        // Case A: URL (External or Blob URL)
                        if (img.url_regular.startsWith('http') || img.url_regular.startsWith('blob:')) {
                            const response = await fetch(img.url_regular);
                            blobToUpload = await response.blob();
                        }
                        // Case B: Base64
                        else if (img.url_regular.startsWith('data:')) {
                            const res = await fetch(img.url_regular);
                            blobToUpload = await res.blob();
                        } else {
                            // Fallback?
                            return img;
                        }

                        // Upload to R2 Backend
                        // Use original filename or generate one based on prompt
                        const ext = blobToUpload.type.split('/')[1] || 'png';
                        // Sanitize prompt for filename
                        const safeName = (img.alt_description || 'generated').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
                        const filename = `${safeName}.${ext}`;

                        const r2Url = await uploadImageToBackend(blobToUpload, filename);

                        // Update Image Object
                        return {
                            ...img,
                            url_regular: r2Url,
                            url_full: r2Url,
                            // Verify source_url? We might keep original for reference or point to R2
                        };
                    } catch (uploadErr) {
                        console.error("Failed to auto-upload to R2:", uploadErr);
                        // If upload fails, keep original (might be broken later, but better than nothing now)
                        return img;
                    }
                };

                // Execute all uploads in parallel
                const uploadedImages = await Promise.all(result.map(processImage));
                setImages(uploadedImages);
            } else {
                setImages(result);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error.');
            setImages([]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!context) return null;

    // --- NEW: Handle Navigation Payload ---
    useEffect(() => {
        if (navigationPayload && navigationPayload.type === 'create_images') {
            if (navigationPayload.data.content) {
                setArticleContent(navigationPayload.data.content);
                setIsDirty(true);
                toast.success("文章内容已导入", { id: 'content-imported' });

                // Track source ID
                if (navigationPayload.data.sourceArticleId) {
                    setSourceArticleId(navigationPayload.data.sourceArticleId);
                    // Pre-fill content from article if provided (Update Mode)
                    // Also try to set keyword context if available in article
                    // We need to fetch the article definition or pass it in payload?
                    // The payload has sourceArticleId. We can find it in articles list.
                    const sourceArt = articles.find(a => a.id === navigationPayload.data.sourceArticleId);
                    if (sourceArt) {
                        setKeywordContext(sourceArt.keyword_context || '');
                        setSaveImagesParentProjectId(sourceArt.parent_project_id);
                        setSaveImagesSubProjectId(sourceArt.sub_project_id);
                    }
                }

                // Pre-fill project selection if passed
                if (navigationPayload.data.projectContext) {
                    setSaveImagesParentProjectId(navigationPayload.data.projectContext.parentId);
                    setSaveImagesSubProjectId(navigationPayload.data.projectContext.subId);
                }

                // Attempt to extract a better prompt
                const lines = navigationPayload.data.content.split('\n');
                const titleLine = lines.find((l: string) => l.startsWith('# ')) ||
                    lines.find((l: string) => l.startsWith('## ')) ||
                    lines.find((l: string) => l.trim().length > 0) || '';

                const cleanPrompt = titleLine.replace(/[#*]/g, '').trim().substring(0, 100);

                if (cleanPrompt) {
                    setSearchTerm(cleanPrompt);
                    setTimeout(() => {
                        executeGeneration(cleanPrompt);
                    }, 500);
                }
            }
            setNavigationPayload(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigationPayload, setNavigationPayload]);


    // Set default parameters
    useEffect(() => {
        const commonDefaults = { per_page: 4, negative_prompt: '' }; // Reduced default count for gen AI
        let sourceDefaults: any;

        switch (source) {
            case ImageSource.PIXABAY:
                sourceDefaults = { per_page: 12, order: 'popular', orientation: 'horizontal', safesearch: true, editors_choice: false };
                break;
            case ImageSource.UNSPLASH:
                sourceDefaults = { per_page: 12, orientation: 'landscape' };
                break;
            case ImageSource.KOLARS:
                sourceDefaults = { model: 'Kwai-Kolors/Kolors', image_size: '1024x1024', num_inference_steps: 30, guidance_scale: 7.5, enhance: false, nologo: true, transparent: false, private: false };
                break;
            case ImageSource.POLLINATIONS:
                sourceDefaults = { model: 'flux', width: 1024, height: 1024, nologo: true, enhance: false, transparent: false, private: false };
                break;
            case ImageSource.NEBIUS:
                sourceDefaults = { model: 'black-forest-labs/flux-1-schnell', width: 1024, height: 1024, num_inference_steps: 4 };
                break;
            case ImageSource.ZHIPU_COGVIEW:
                sourceDefaults = { model: 'cogview-3-flash', size: '1024x1024' };
                break;
            case ImageSource.DALLE3:
                sourceDefaults = { per_page: 1, size: '1024x1024', quality: 'standard', style: 'vivid' };
                break;
            case ImageSource.STABILITY:
                sourceDefaults = { per_page: 1, model: 'sd3.5-large', aspect_ratio: '1:1', output_format: 'jpeg' };
                break;
            case ImageSource.REPLICATE:
                sourceDefaults = { per_page: 1, model: 'black-forest-labs/flux-schnell', width: 1024, height: 1024, aspect_ratio: '1:1' };
                break;
            case ImageSource.HUGGINGFACE:
                sourceDefaults = { per_page: 1, model: 'black-forest-labs/FLUX.1-dev', width: 1024, height: 1024, num_inference_steps: 25, guidance_scale: 7.5 };
                break;
            case ImageSource.CLOUDFLARE:
                sourceDefaults = { model: '@cf/stabilityai/stable-diffusion-xl-base-1.0', num_steps: 20, guidance: 7.5 };
                break;
            case ImageSource.OPENROUTER:
                sourceDefaults = { per_page: 1, model: 'stabilityai/stable-diffusion-xl-base-1.0', width: 1024, height: 1024 };
                break;
            case ImageSource.MODELSCOPE:
                sourceDefaults = { model: 'Qwen/Qwen2.5-Coder-32B-Instruct', size: '1024x1024', steps: 30, guidance: 7.5 };
                break;
            default:
                sourceDefaults = {};
        }
        setParams({ ...commonDefaults, ...sourceDefaults });
        setError(null);
        setIsDirty(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source]);


    const handleGenerateClick = () => executeGeneration();

    const handleSelectArticle = (article: Article) => {
        setArticleContent(article.content);
        setKeywordContext(article.keyword_context);
        setSourceArticleId(article.id); // Track source
        setSaveImagesParentProjectId(article.parent_project_id);
        setSaveImagesSubProjectId(article.sub_project_id);
        setIsLibraryModalOpen(false);
        setIsDirty(true);
    };

    const handleToggleSelectImage = (id: string) => {
        setSelectedImages(prev => ({ ...prev, [id]: !prev[id] }));
        setIsDirty(true);
    };

    // --- Markdown & Preview Logic ---
    const generateMarkdownWithImages = useCallback(() => {
        const selected = images.filter(img => selectedImages[img.id]);
        const imagePlaceholder = (index: number, img: ImageObject) => `\n\n<img src="${img.url_regular}" alt="${img.alt_description}" data-image-id="${img.id}" />\n*${img.alt_description}*\n\n`;

        let tempContent = articleContent;

        if (selected.length > 0) {
            switch (insertionStrategy) {
                case 'h2_before': {
                    let h2Count = 0;
                    tempContent = tempContent.replace(/^(##\s*.*$)/gm, (match) => {
                        if (h2Count < selected.length) {
                            const img = selected[h2Count % selected.length];
                            const insertion = imagePlaceholder(h2Count, img);
                            h2Count++;
                            return insertion + match;
                        }
                        return match;
                    });
                    break;
                }
                case 'end_of_article': {
                    const insertions = selected.map((img, index) => imagePlaceholder(index, img));
                    tempContent += insertions.join('');
                    break;
                }
                case 'p_before': {
                    // Simple replacement for p_before is hard in raw markdown without breaking structure
                    // fallback to end of article for safety or implement complex logic
                    const insertions = selected.map((img, index) => imagePlaceholder(index, img));
                    tempContent += insertions.join('');
                    break;
                }
            }
        }
        return tempContent;
    }, [articleContent, images, selectedImages, insertionStrategy]);

    const getPreviewHtml = useCallback(() => {
        const markdown = generateMarkdownWithImages();
        return markdownToHtml(markdown);
    }, [generateMarkdownWithImages]);

    useEffect(() => {
        if (isDirty) {
            setFinalMarkdown(generateMarkdownWithImages());
            setFinalPreview(getPreviewHtml());
            setIsDirty(false);
        }
    }, [isDirty, generateMarkdownWithImages, getPreviewHtml]);

    // --- Saving Logic (Persistence) ---

    // Utility: Convert ephemeral selected images to Base64 OR Upload to R2 if configured
    const prepareImagesForSave = async (imagesToSave: ImageObject[]): Promise<ImageObject[]> => {
        setIsProcessing(true);
        const processedImages: ImageObject[] = [];

        // Check for R2 Credentials
        const r2AccountId = apiKeys['cloudflare_account_id'];
        const r2AccessKeyId = apiKeys['r2_access_key_id'];
        const r2SecretKey = apiKeys['r2_secret_access_key'];
        const r2BucketName = "seo-content-temp-images"; // Hardcoded specific temp bucket

        const hasR2 = r2AccountId && r2AccessKeyId && r2SecretKey;

        for (const img of imagesToSave) {
            // Check if URL is ephemeral (blob:, or specific domains) or just to be safe, convert all generation results.
            // Stock photos (pixabay/unsplash) are persistent public URLs, we keep them as is.
            const isStock = img.source_platform === ImageSource.PIXABAY || img.source_platform === ImageSource.UNSPLASH;

            if (isStock) {
                // Determine if we should save stock images to DB 'images' table too?
                // Yes, for consistency, we should track them.
                try {
                    // Cast to any to bypass strict typing for new table
                    const { data, error } = await (supabase as any).from('images').insert({
                        user_id: session?.user?.id,
                        article_id: sourceArticleId || null,
                        storage_provider: 'external',
                        storage_path: null,
                        public_url: img.url_regular,
                        prompt: img.alt_description,
                        metadata: { width: img.width, height: img.height, source_platform: img.source_platform }
                    }).select().single();

                    if (data) {
                        processedImages.push({ ...img, id: data.id }); // Use DB ID
                    } else {
                        processedImages.push(img);
                    }
                } catch (e) {
                    processedImages.push(img);
                }
            } else {
                try {
                    let finalUrl = img.url_regular;
                    let storageProvider = 'base64_fallback';
                    let storagePath = null;

                    if (hasR2 && img.url_regular.includes('r2.cloudflarestorage.com')) {
                        // Already uploaded to R2 during generation
                        finalUrl = img.url_regular;
                        storageProvider = 'r2';
                    } else {
                        // Fallback or Stock Image
                        if (img.url_regular.startsWith('data:')) {
                            storageProvider = 'base64_fallback';
                        } else {
                            storageProvider = 'external';
                        }
                        finalUrl = img.url_regular;
                    }

                    // Insert into 'images' Table (New Logic)
                    // Cast to any to bypass strict type checking if needed for new columns
                    const { data: dbImage, error: dbError } = await (supabase as any).from('images').insert({
                        user_id: session?.user?.id,
                        article_id: sourceArticleId || null,
                        storage_provider: storageProvider,
                        storage_path: storagePath,
                        public_url: finalUrl,
                        prompt: img.alt_description,
                        metadata: { width: img.width, height: img.height, source_platform: img.source_platform }
                    }).select().single();

                    if (dbError) throw dbError;

                    processedImages.push({
                        ...img,
                        id: dbImage?.id || img.id,
                        url_regular: finalUrl,
                        url_full: finalUrl,
                    });
                } catch (e) {
                    console.error(`Failed to persist image ${img.id} `, e);
                    processedImages.push(img); // Fallback to original URL
                }
            }
        }
        setIsProcessing(false);
        return processedImages;
    };

    const handleSaveImageSet = async () => {
        if (!supabase || !session) return;
        const selected = images.filter(img => selectedImages[img.id]);
        if (selected.length === 0) {
            toast.error("Please select at least one image.");
            return;
        }

        setIsSaving(true);
        try {
            const persistedImages = await prepareImagesForSave(selected);

            // Handle Project Creation if needed
            let parentId = saveImagesParentProjectId;
            if (saveImagesParentProjectId === 'create_new') {
                // Explicitly cast insert payload and result to handle TS errors
                const sb = supabase as any;
                const { data: rawData, error } = await sb.from('projects').insert({
                    id: `proj - ${Date.now()} `,
                    name: newSaveImagesParentProjectName,
                    user_id: session.user.id,
                    created_at: new Date().toISOString(),
                }).select().single();

                const data = rawData as any;

                if (error) throw error;
                if (!data) throw new Error("Failed to create parent project");
                parentId = data.id;
            }

            const newSet: Omit<SavedImageSet, 'user_id'> = {
                id: `imgset - ${Date.now()} `,
                name: imageSetTag || `Set ${new Date().toLocaleTimeString()} `,
                search_term_or_prompt: searchTerm,
                images: persistedImages,
                created_at: new Date().toISOString(),
                parent_project_id: parentId || '',
                sub_project_id: saveImagesSubProjectId === 'create_new' ? '' : saveImagesSubProjectId || '', // Handle new subproj logic if needed, keeping simple
                published_destinations: [],
            };

            // Fix: Cast supabase client to any to bypass strict type checking for this specific insert
            const { error } = await (supabase as any).from('saved_image_sets').insert({ ...newSet, user_id: session.user.id } as any);
            if (error) throw error;

            toast.success("Image set saved successfully!");
            setIsSaveImagesModalOpen(false);
            await fetchData();

        } catch (error) {
            toast.error(`Save failed: ${(error as Error).message} `);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateArticle = async () => {
        if (!supabase || !session || !sourceArticleId) {
            toast.error("No source article to update.");
            return;
        }

        if (!confirm("This will overwrite the article content with the new layout including images. Continue?")) {
            return;
        }

        setIsSaving(true);
        try {
            // 1. Persist images first
            const selected = images.filter(img => selectedImages[img.id]);
            // If we are updating an article, we might not strictly need to save an "Image Set", 
            // but we definitely need the images to be persistent in the article body (Base64).

            // We need to regenerate the markdown but with Base64 URLs this time.
            const persistedImages = await prepareImagesForSave(selected);

            // Re-run insertion logic with persisted images
            // We need to map the original IDs to the new Base64 URLs
            const idToUrlMap = new Map(persistedImages.map(img => [img.id, img.url_regular]));

            const imagePlaceholder = (img: ImageObject) => {
                const url = idToUrlMap.get(img.id) || img.url_regular;
                // Use HTML format as requested for optimized storage tracking
                return `\n\n<img src="${url}" alt="${img.alt_description}" data-image-id="${img.id}" />\n*${img.alt_description}*\n\n`;
            };

            let finalContent = articleContent;
            if (selected.length > 0) {
                switch (insertionStrategy) {
                    case 'h2_before': {
                        let h2Count = 0;
                        finalContent = finalContent.replace(/^(## .*$)/gm, (match) => {
                            if (h2Count < selected.length) {
                                const img = selected[h2Count % selected.length];
                                const insertion = imagePlaceholder(img);
                                h2Count++;
                                return insertion + match;
                            }
                            return match;
                        });
                        break;
                    }
                    case 'end_of_article': {
                        const insertions = selected.map(img => imagePlaceholder(img));
                        finalContent += insertions.join('');
                        break;
                    }
                    // p_before omitted for simplicity in this specific flow
                }
            }

            if (!sourceArticleId) throw new Error("No source article ID found to update.");

            // 2. Update Article Record
            // 2. Update Article Record
            const { error: updateError } = await supabase
                .from('articles')
                // @ts-ignore
                .update({ content: finalContent })
                .eq('id', sourceArticleId);

            if (updateError) throw updateError;

            toast.success("Article updated with images!");
            await fetchData(); // Refresh local data

        } catch (error) {
            toast.error(`Update failed: ${(error as Error).message} `);
        } finally {
            setIsSaving(false);
        }
    };


    const selectedImageObjects = useMemo(() => images.filter(img => selectedImages[img.id]), [images, selectedImages]);
    const numSelected = selectedImageObjects.length;

    return (
        <div className="flex h-full font-sans text-gray-100">
            <ApiSettingsModal
                isOpen={isApiModalOpen}
                onClose={() => setIsApiModalOpen(false)}
                apiKeys={apiKeys}
                onSave={setApiKeys}
                activeSource={source}
                onSelectSource={(s) => {
                    setSource(s);
                    if (s !== ImageSource.POLLINATIONS && !apiKeys[s as keyof ImageApiKeys] && s !== ImageSource.CLOUDFLARE) {
                        toast("Ensure you enter an API Key for this provider", { icon: '🔑' });
                    }
                }}
            />
            <Modal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} title="Import from Library">
                <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {articles.map(article => (
                        <div key={article.id} onClick={() => handleSelectArticle(article)} className="p-3 bg-gray-800 hover:bg-gray-700 cursor-pointer rounded border border-gray-700">
                            <h4 className="font-bold">{article.title}</h4>
                            <p className="text-xs text-gray-400">{new Date(article.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Left Panel */}
            <div className="w-1/3 min-w-[400px] max-w-[500px] bg-[#0f1117] border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Content Source</h2>
                        <Button size="sm" variant="secondary" onClick={() => setIsLibraryModalOpen(true)}>Import Article</Button>
                    </div>
                    <textarea
                        value={articleContent}
                        onChange={e => { setArticleContent(e.target.value); setIsDirty(true); }}
                        rows={6}
                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                        placeholder="Paste your article markdown here..."
                    />
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Image Studio</h2>
                        <Button size="sm" variant="ghost" onClick={() => setIsApiModalOpen(true)}>
                            <SettingsIcon className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
                                placeholder="Describe the image (Prompt)"
                            />
                            <Button size="sm" onClick={handleGenerateClick} isLoading={isLoading} className="w-full">
                                <WandIcon className="w-4 h-4 mr-2" />
                                Generate Images
                            </Button>
                        </div>
                    </div>
                </Card>

                <ImageControls source={source} setSource={setSource} params={params} setParams={setParams} apiKeys={apiKeys} />
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-6 flex flex-col gap-6 min-w-0 overflow-y-auto bg-gray-900/30">
                {error && <div className="text-red-400 bg-red-900/20 border border-red-900/50 p-4 rounded-lg">{error}</div>}

                {/* Gallery Grid */}
                <div className="min-h-[200px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <Spinner size="lg" />
                            <p className="mt-4 text-sm font-medium">Creating visual assets...</p>
                        </div>
                    ) : images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map(img => (
                                <div key={img.id} className="aspect-square">
                                    <ImageCard image={img} isSelected={!!selectedImages[img.id]} onToggleSelect={handleToggleSelectImage} onViewImage={setViewingImage} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-xl text-gray-600">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                            <p>Ready to generate images.</p>
                        </div>
                    )}
                </div>

                {/* Preview & Action Area */}
                <div className="flex-1 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-gray-300">Layout Preview</h3>
                            <Select
                                value={insertionStrategy}
                                onChange={e => {
                                    setInsertionStrategy(e.target.value as 'h2_before' | 'p_before' | 'end_of_article');
                                    setIsDirty(true);
                                }}
                                className="text-sm w-48 bg-gray-800"
                            >
                                <option value="h2_before">Insert before H2s</option>
                                <option value="end_of_article">Append to End</option>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            {sourceArticleId && (
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={handleUpdateArticle}
                                    isLoading={isSaving}
                                    disabled={numSelected === 0}
                                    className={`text-white ${numSelected === 0 ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
                                    title={numSelected === 0 ? "Select at least one image to update" : "Write images back to the article"}
                                >
                                    <DocumentIcon className="w-4 h-4 mr-1" />
                                    回写文章 (Update Article)
                                </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setIsSaveImagesModalOpen(true)} disabled={numSelected === 0}>
                                <CloudIcon className="w-4 h-4 mr-1" />
                                保存图片集
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-xl overflow-y-auto shadow-2xl relative p-8 prose prose-invert max-w-none">
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
                                <div className="text-white text-center">
                                    <Spinner size="lg" />
                                    <p className="mt-2">Processing images for persistence...</p>
                                </div>
                            </div>
                        )}
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                img: ({ node, ...props }) => (
                                    <img {...props} className="rounded-lg shadow-md max-w-full mx-auto my-4" alt={props.alt || ''} />
                                )
                            }}
                        >
                            {finalMarkdown}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>

            {/* Save Image Set Modal */}
            <Modal isOpen={isSaveImagesModalOpen} onClose={() => setIsSaveImagesModalOpen(false)} title="保存图片集">
                <div className="space-y-4">
                    <Input label="图片集名称" value={imageSetTag} onChange={e => setImageSetTag(e.target.value)} placeholder="e.g. My Awesome Images" />

                    <Select label="父项目" value={saveImagesParentProjectId} onChange={(e) => setSaveImagesParentProjectId(e.target.value)}>
                        <option value="">Select Project...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="create_new">+ Create New Project</option>
                    </Select>

                    {saveImagesParentProjectId === 'create_new' && (
                        <Input label="New Project Name" value={newSaveImagesParentProjectName} onChange={e => setNewSaveImagesParentProjectName(e.target.value)} />
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setIsSaveImagesModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveImageSet} isLoading={isSaving}>Confirm Save</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
export default ImageTextProcessor;