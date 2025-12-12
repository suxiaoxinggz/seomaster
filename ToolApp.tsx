import React, { useState, useMemo, useEffect } from 'react';
import { initializeSupabase, supabase as supabaseInstance } from './services/supabaseClient';
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
import LandingPage from './components/LandingPage'; // Kept imports
import Card from './components/ui/Card'; // Kept imports
import Input from './components/ui/Input'; // Kept imports
import Button from './components/ui/Button'; // Kept imports
import { Toaster, toast } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Kept imports
import { LocalizationView } from './components/LocalizationView';
import SeoDataManager from './components/SeoDataManager';
import SeoStrategyManager from './components/SeoStrategyManager';
import SeoAssetsLibrary from './components/SeoAssetsLibrary';
import useLocalStorage from './hooks/useLocalStorage';
import AccountSettings from './components/AccountSettings';

const PageContainer: React.FC<{ isVisible: boolean; children: React.ReactNode }> = ({ isVisible, children }) => (
    <div style={{ display: isVisible ? 'block' : 'none' }} className="h-full">
        {children}
    </div>
);

const AppContent: React.FC = () => {
    // Initialize Supabase from environment variables (via supabaseClient service)
    const [supabase] = useState<SupabaseClient<Database>>(() => supabaseInstance);
    const [session, setSession] = useState<Session | null>(null);
    const [page, setPage] = useState<Page>('dashboard');

    const [isLoading, setIsLoading] = useState(true);

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
        // Initialize Session
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
    }, [supabase]);

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
            const modelsData = ((modelsRes.data || []) as any[]).map(m => ({
                ...m,
                id: m.id,
                user_id: m.user_id,
                nickname: m.nickname,
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
        } else {
            // Clear data on logout
            setProjects([]);
            setKeywordLibrary([]);
            setArticles([]);
            setModels([]);
            setPostsToPublish([]);
            setPublishingChannels([]);
            setPublishingQueue([]);
            setSavedImageSets([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return (
        <AppContext.Provider value={appContextValue}>
            {(isLoading && !session) ? (
                <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
                    {session && <Sidebar currentPage={page} setPage={setPage} />}

                    <main className="flex-1 overflow-y-auto relative">
                        {isLoading && session && (
                            <div className="absolute top-4 right-4 z-50">
                                <Spinner size="sm" />
                            </div>
                        )}

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
            )}
        </AppContext.Provider>
    );
};

export default AppContent;