import React, { useState, useMemo, useEffect } from 'react';
import { initializeSupabase } from './services/supabaseClient';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { PRESET_MODELS } from './constants';
import { Model, Page, Project, KeywordSubProject, Article, SavedImageSet, PostToPublish, PublishingChannel, PublishingItem, Database, NavigationPayload, SeoConfig } from './types';
import Sidebar from './components/Sidebar';
import KeywordGenerator from './components/KeywordGenerator';
import ModelSettings from './components/ModelSettings';
import Dashboard from './components/Dashboard';
import ArticleGenerator from './components/ArticleGenerator';
import { AppContext } from './context/AppContext';
import ImageTextProcessor from './components/ImageTextProcessor';
import PublishingManager from './components/PublishingManager';
import Spinner from './components/ui/Spinner';
import LandingPage from './components/LandingPage';
import Card from './components/ui/Card';
import Input from './components/ui/Input';
import Button from './components/ui/Button';
import { Toaster, toast } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationView } from './components/LocalizationView';
import SeoDataManager from './components/SeoDataManager';
import SeoStrategyManager from './components/SeoStrategyManager'; // NEW IMPORT
import SeoAssetsLibrary from './components/SeoAssetsLibrary';
import useLocalStorage from './hooks/useLocalStorage';
import AccountSettings from './components/AccountSettings';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        }
    }
});

const PageContainer: React.FC<{ isVisible: boolean; children: React.ReactNode }> = ({ isVisible, children }) => (
    <div style={{ display: isVisible ? 'block' : 'none' }} className="h-full">
        {children}
    </div>
);

// New component for manual configuration
const SetupConfig: React.FC<{ onSave: (url: string, key: string) => void, onSkip: () => void }> = ({ onSave, onSkip }) => {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url && key) onSave(url.trim(), key.trim());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Setup Configuration</h2>
                        <p className="text-gray-400 mt-2 text-sm">
                            Database connection details are missing. Please enter your Supabase credentials to continue.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Supabase URL"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://your-project.supabase.co"
                            required
                        />
                        <Input
                            label="Supabase Anon Key"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            type="password"
                            required
                        />
                        <div className="flex flex-col gap-3 mt-6">
                            <Button type="submit" className="w-full" variant="primary">
                                Connect
                            </Button>
                            <button
                                type="button"
                                onClick={onSkip}
                                className="text-sm text-gray-400 hover:text-white underline"
                            >
                                Skip Setup (Guest Mode)
                            </button>
                        </div>
                    </form>
                    <p className="mt-4 text-xs text-center text-gray-500">
                        These details will be saved to your browser's Local Storage.
                    </p>
                </Card>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const [configError, setConfigError] = useState<string | null>(null);
    const [isConfigLoading, setIsConfigLoading] = useState(true);
    const [isSetupRequired, setIsSetupRequired] = useState(false);

    const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [page, setPage] = useState<Page>('dashboard');

    const [isLoading, setIsLoading] = useState(true); // Combined loading state

    // App data state
    const [models, setModels] = useState<Model[]>([]);
    const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [keywordLibrary, setKeywordLibrary] = useState<KeywordSubProject[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [savedImageSets, setSavedImageSets] = useState<SavedImageSet[]>([]);
    const [postsToPublish, setPostsToPublish] = useState<PostToPublish[]>([]);
    const [publishingChannels, setPublishingChannels] = useState<PublishingChannel[]>([]);
    const [publishingQueue, setPublishingQueue] = useState<PublishingItem[]>([]);

    // Navigation State
    const [navigationPayload, setNavigationPayload] = useState<NavigationPayload | null>(null);

    // Global SEO Settings
    const [seoConfig, setSeoConfig] = useLocalStorage<SeoConfig>('seo_provider_config', { provider: 'mock' });

    useEffect(() => {
        const fetchAppConfig = async () => {
            try {
                let config = { supabaseUrl: '', supabaseAnonKey: '' };

                try {
                    const response = await fetch('/config');
                    if (response.ok) {
                        const data = await response.json();
                        config.supabaseUrl = data.supabaseUrl;
                        config.supabaseAnonKey = data.supabaseAnonKey;
                    }
                } catch (e) {
                    // Ignore fetch errors
                }

                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    // Use import.meta.env directly which is typed by vite-env.d.ts
                    // Fallbacks for Create React App legacy if needed
                    config.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (import.meta.env as any).REACT_APP_SUPABASE_URL || '';
                    config.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta.env as any).REACT_APP_SUPABASE_ANON_KEY || '';
                }

                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    config.supabaseUrl = localStorage.getItem('supabase_url') || '';
                    config.supabaseAnonKey = localStorage.getItem('supabase_anon_key') || '';
                }

                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    setIsSetupRequired(true);
                } else {
                    const supabaseClient = initializeSupabase(config.supabaseUrl, config.supabaseAnonKey);
                    setSupabase(supabaseClient);
                }
            } catch (error) {
                console.error("Configuration Error:", error);
                setConfigError((error as Error).message);
            } finally {
                setIsConfigLoading(false);
            }
        };
        fetchAppConfig();
    }, []);

    useEffect(() => {
        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setIsLoading(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (!session) {
                    setPage('dashboard'); // Reset page on logout
                }
            });

            return () => subscription.unsubscribe();
        } else {
            // If no supabase yet (e.g. initial load before config check), wait
            // But if setup required is true, we stop loading
            if (isSetupRequired) setIsLoading(false);
        }
    }, [supabase, isSetupRequired]);

    // Redirect if no session (Router handles this, but safe to keep)
    useEffect(() => {
        if (!isLoading && !session) {
            // Let the router handle redirection or show a simple message
            // For now, we render null as correct behavior within ToolApp route
        }
    }, [session, isLoading]);

    const handleSetupSave = (url: string, key: string) => {
        try {
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_anon_key', key);
            const supabaseClient = initializeSupabase(url, key);
            setSupabase(supabaseClient);
            setIsSetupRequired(false);
            toast.success("Database connected!");
        } catch (e) {
            toast.error("Invalid configuration details.");
        }
    };

    const handleSkipAuth = () => {
        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
                id: 'guest-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'guest@local.dev',
                app_metadata: { provider: 'email' },
                user_metadata: {},
                created_at: new Date().toISOString(),
                phone: '',
                confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
            }
        };

        setSession(mockSession);
        setIsSetupRequired(false);
        setConfigError(null);
        setIsLoading(false);

        if (models.length === 0) {
            setModels(PRESET_MODELS.map(m => ({ ...m, user_id: 'guest-user-id' })));
            setDefaultModelId(PRESET_MODELS[0].id);
        }
        toast('Entered Guest Mode', { icon: '👋' });
    };

    const fetchData = async () => {
        if (!session || !supabase) return;
        setIsLoading(true);
        try {
            const [
                projectsRes,
                libraryRes,
                articlesRes,
                modelsRes,
                postsRes,
                channelsRes,
                queueRes,
                imagesRes
            ] = await Promise.all([
                supabase.from('projects').select('*').eq('user_id', session.user.id),
                supabase.from('keyword_library').select('*').eq('user_id', session.user.id),
                supabase.from('articles').select('*').eq('user_id', session.user.id),
                supabase.from('models').select('*').eq('user_id', session.user.id),
                supabase.from('posts_to_publish').select('*').eq('user_id', session.user.id),
                supabase.from('publishing_channels').select('*').eq('user_id', session.user.id),
                supabase.from('publishing_queue').select('*').eq('user_id', session.user.id),
                supabase.from('saved_image_sets').select('*').eq('user_id', session.user.id),
            ]);

            // Error checking
            if (projectsRes.error) throw projectsRes.error;
            if (libraryRes.error) throw libraryRes.error;
            if (articlesRes.error) throw articlesRes.error;
            if (modelsRes.error) throw modelsRes.error;
            if (postsRes.error) throw postsRes.error;
            if (channelsRes.error) throw channelsRes.error;
            if (queueRes.error) throw queueRes.error;
            if (imagesRes.error) throw imagesRes.error;

            setProjects(projectsRes.data || []);
            setKeywordLibrary(libraryRes.data || []);
            setArticles(articlesRes.data || []);

            // --- Models Sync Logic ---
            // Shim: handle both new snake_case and legacy camelCase from DB
            const modelsData = ((modelsRes.data || []) as any[]).map(m => ({
                ...m,
                id: m.id,
                user_id: m.user_id,
                nickname: m.nickname,
                // Handle mixed conventions
                api_provider: m.api_provider || m.apiProvider,
                base_url: m.base_url || m.baseURL,
                api_key: m.api_key || m.apiKey,
                is_default: m.is_default !== undefined ? m.is_default : m.isDefault,
                supports_web_search: m.supports_web_search !== undefined ? m.supports_web_search : m.supportsWebSearch,
                type: m.type,
                version: m.version
            })) as Model[];
            const existingModelIds = new Set(modelsData.map(m => m.id));

            // Find presets that are not in the DB
            const missingPresets = PRESET_MODELS.filter(pm => !existingModelIds.has(pm.id));

            let allModels = modelsData;

            if (missingPresets.length > 0) {
                console.log("Syncing missing presets:", missingPresets.map(m => m.id));
                const presetsToInsert = missingPresets.map(m => ({ ...m, user_id: session.user.id }));

                const { data: insertedModels, error: insertError } = await supabase
                    .from('models')
                    .insert(presetsToInsert as any)
                    .select();

                if (insertError) {
                    console.error("Failed to sync presets:", insertError);
                } else if (insertedModels) {
                    allModels = [...modelsData, ...insertedModels] as Model[];
                    toast.success(`Synced ${insertedModels.length} new AI models.`);
                }
            }

            setModels(allModels);

            const userDefault = allModels.find(m => (m as any).isDefault || m.is_default);
            setDefaultModelId(userDefault?.id || allModels[0]?.id || null);

            setPostsToPublish(postsRes.data || []);
            setPublishingChannels(channelsRes.data || []);
            setPublishingQueue(queueRes.data || []);
            setSavedImageSets(imagesRes.data || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to sync data from cloud.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session && supabase) {
            fetchData();
        } else if (session && !supabase) {
            // Guest mode
        } else {
            setProjects([]);
            setKeywordLibrary([]);
            setArticles([]);
            setModels([]);
            setPostsToPublish([]);
            setPublishingChannels([]);
            setPublishingQueue([]);
            setSavedImageSets([]);
        }
    }, [session, supabase]);


    const appContextValue = useMemo(() => ({
        models, setModels,
        defaultModelId, setDefaultModelId,
        projects, setProjects,
        keywordLibrary, setKeywordLibrary,
        articles, setArticles,
        savedImageSets, setSavedImageSets,
        postsToPublish, setPostsToPublish,
        publishingChannels, setPublishingChannels,
        publishingQueue, setPublishingQueue,
        supabase,
        session,
        fetchData,
        navigationPayload, setNavigationPayload,
        seoConfig, setSeoConfig
    }), [
        models, defaultModelId, projects, keywordLibrary, articles,
        savedImageSets, postsToPublish, publishingChannels, publishingQueue, supabase, session,
        navigationPayload, seoConfig
    ]);

    // Loading States and Config Errors (No Context Needed)
    if (isConfigLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
                <Spinner size="lg" />
                <p className="ml-4 text-gray-400">Initializing...</p>
            </div>
        );
    }

    if (isSetupRequired) {
        return <SetupConfig onSave={handleSetupSave} onSkip={handleSkipAuth} />;
    }

    if (configError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="w-full max-w-2xl p-4 text-center">
                    <Card>
                        <h2 className="text-2xl font-bold text-red-500">System Error</h2>
                        <p className="mt-4 text-gray-300">{configError}</p>
                        <div className="flex justify-center gap-4 mt-6">
                            <Button onClick={() => { setIsSetupRequired(true); setConfigError(null); }}>Reconfigure</Button>
                            <Button variant="secondary" onClick={handleSkipAuth}>Guest Mode</Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }



    // WRAP EVERYTHING IN CONTEXT FROM HERE
    return (
        <AppContext.Provider value={appContextValue}>
            {(!session) ? (
                // Loading or No Session
                <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
                    <Spinner size="lg" />
                </div>
            ) : (
                // Main Tool UI
                (isLoading) ? (
                    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
                        <Sidebar currentPage={page} setPage={setPage} />
                        <main className="flex-1 overflow-y-auto flex items-center justify-center">
                            <Spinner size="lg" />
                        </main>
                    </div>
                ) : (
                    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
                        <Sidebar currentPage={page} setPage={setPage} />
                        <main className="flex-1 overflow-y-auto">
                            <PageContainer isVisible={page === 'dashboard'}><Dashboard setPage={setPage} /></PageContainer>
                            <PageContainer isVisible={page === 'keyword-map'}><KeywordGenerator setPage={setPage} /></PageContainer>
                            <PageContainer isVisible={page === 'seo-data'}><SeoDataManager /></PageContainer>
                            <PageContainer isVisible={page === 'seo-assets'}><SeoAssetsLibrary setPage={setPage} /></PageContainer>
                            <PageContainer isVisible={page === 'seo-strategy'}><SeoStrategyManager /></PageContainer>
                            <PageContainer isVisible={page === 'outline-article'}><ArticleGenerator setPage={setPage} /></PageContainer>
                            <PageContainer isVisible={page === 'image-text'}><ImageTextProcessor /></PageContainer>
                            <PageContainer isVisible={page === 'localization'}><LocalizationView /></PageContainer>
                            <PageContainer isVisible={page === 'publish'}><PublishingManager setPage={setPage} /></PageContainer>
                            <PageContainer isVisible={page === 'settings'}><ModelSettings /></PageContainer>
                            <PageContainer isVisible={page === 'account'}><AccountSettings /></PageContainer>
                        </main>
                    </div>
                )
            )}
        </AppContext.Provider>
    );
};

// Providers removed (moved to App.tsx)
export default AppContent;