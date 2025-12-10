import React, { useContext, useState } from 'react';
import Card from './ui/Card';
import { AppContext } from '../context/AppContext';
import { KeywordLibraryView } from './KeywordLibraryView';
import ContentProgressView from './ContentProgressView';
import { ProjectsIcon, LibraryIcon, DocumentIcon, PlusIcon, ChevronDownIcon, TrashIcon, ImageIcon, PublishIcon, WandIcon, SettingsIcon, ChartBarIcon, PencilIcon, SearchIcon, EyeIcon } from './icons';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { Project, Page } from '../types';
import Checkbox from './ui/Checkbox';
import { ImageLibraryView } from './ImageLibraryView';
import { PostsToPublishView } from './PostsToPublishView';
import { PublishingStatusView } from './PublishingStatusView';
import DataMigration from './DataMigration';
import Spinner from './ui/Spinner';


type DashboardView = 'overview' | 'library' | 'progress' | 'image-library' | 'posts-to-publish' | 'publishing-status';


const TabButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const ProjectCard: React.FC<{
    project: Project;
    onProjectClick: (projectId: string) => void;
    isSelected: boolean;
    onToggleSelection: (projectId: string) => void;
}> = ({ project, onProjectClick, isSelected, onToggleSelection }) => {
    const { keywordLibrary } = useContext(AppContext) || { keywordLibrary: [] };
    const [isExpanded, setIsExpanded] = useState(false);

    const subProjects = keywordLibrary.filter(sp => sp.parentProjectId === project.id);
    const subProjectCount = subProjects.length;

    return (
        <Card>
            <div className="flex items-start gap-4">
                 <Checkbox
                    id={`select-proj-${project.id}`}
                    checked={isSelected}
                    onChange={() => onToggleSelection(project.id)}
                    className="mt-2"
                    aria-label={`选择项目 ${project.name}`}
                />
                <div className="flex-1">
                    <button
                        className="w-full text-left"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">{project.name}</h3>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                         <p className="text-sm text-gray-400 mt-2">
                            {subProjectCount} Sub-Project{subProjectCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            创建于: {new Date(project.createdAt).toLocaleDateString()}</p>
                    </button>
                    {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            {subProjects.length > 0 ? (
                                <ul className="space-y-2">
                                    {subProjects.map(sp => (
                                        <li key={sp.id} className="text-sm text-gray-300 bg-gray-900/50 p-2 rounded-md">
                                            {sp.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 text-center">No sub-projects yet.</p>
                            )}
                        </div>
                    )}
                     <div className="mt-4">
                         <Button variant="secondary" size="sm" className="w-full" onClick={() => onProjectClick(project.id)}>
                            库中查看 / 筛选
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};


const ProjectOverview: React.FC<{
    onProjectClick: (projectId: string) => void;
    setPage: (page: Page) => void;
}> = ({ onProjectClick, setPage }) => {
    const context = useContext(AppContext);
    const { projects, models, keywordLibrary, fetchData, session, supabase, setNavigationPayload } = context || {};

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || !session || !supabase) {
            alert("Project name cannot be empty.");
            return;
        }

        const newProjectPayload = {
            id: `proj-${Date.now()}`,
            name: newProjectName.trim(),
            user_id: session.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Cast to any to bypass strict type check for new project payload
        const { error } = await supabase
            .from('projects')
            .insert(newProjectPayload as any);

        if (error) {
            alert(`Error creating project: ${error.message}`);
            return;
        }
        
        await fetchData();
        
        setNewProjectName('');
        setIsModalOpen(false);
    };

    const handleToggleSelection = (projectId: string) => {
        setSelectedProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = () => {
        if (!projects) return;
        if (selectedProjects.size === projects.length) {
            setSelectedProjects(new Set());
        } else {
            setSelectedProjects(new Set(projects.map(p => p.id)));
        }
    };
    
    const handleDeleteSelected = async () => {
        if (!supabase) return;
        const message = `您确定要删除选中的 ${selectedProjects.size} 个项目吗？这将同时删除所有关联的子项目和文章。`;
        if (window.confirm(message)) {
            const { error } = await supabase.from('projects').delete().in('id', Array.from(selectedProjects));
            if (error) {
                alert(`Error deleting projects: ${error.message}`);
            } else {
                await fetchData();
                setSelectedProjects(new Set());
            }
        }
    };
    
    // --- Navigation Handlers ---
    const handleNavigateContentEngine = () => {
        if (setNavigationPayload) {
            setNavigationPayload({ type: 'change_seo_tab', data: { targetTab: 'content' } });
        }
        setPage('seo-data');
    }

    const handleNavigateMarket = () => {
        if (setNavigationPayload) {
            setNavigationPayload({ type: 'change_seo_tab', data: { targetTab: 'market' } });
        }
        setPage('seo-data');
    }

    const handleNavigateSerp = () => {
        if (setNavigationPayload) {
            setNavigationPayload({ type: 'change_seo_tab', data: { targetTab: 'serp' } });
        }
        setPage('seo-data');
    }

    const handleNavigateAi = () => {
        if (setNavigationPayload) {
            setNavigationPayload({ type: 'change_seo_tab', data: { targetTab: 'ai' } });
        }
        setPage('seo-data');
    }

    if (!context || !projects || !keywordLibrary || !models) {
        return <Spinner />;
    }

    return (
        <div className="mt-8">
            <DataMigration />
            {/* Stats Cards - Expanded to 3x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                
                {/* 1. Projects */}
                <Card className="relative group overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white">母项目</h2>
                                <p className="mt-2 text-5xl font-extrabold text-blue-400">{projects.length}</p>
                                <p className="mt-1 text-gray-400 text-sm">Active Projects</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
                                <PlusIcon className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* 2. Keyword Library */}
                <Card className="relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">关键词库</h2>
                            <p className="mt-2 text-5xl font-extrabold text-green-400">{keywordLibrary.length}</p>
                            <p className="mt-1 text-gray-400 text-sm">Saved Sub-projects</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => setPage('keyword-map')}>
                            <WandIcon className="w-4 h-4 mr-1"/> 新建
                        </Button>
                    </div>
                </Card>

                {/* 3. Content Engine (Highlighted) */}
                <Card className="relative group bg-gradient-to-br from-gray-800 to-gray-800/50 border-purple-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">内容引擎</h2>
                            <p className="mt-2 text-5xl font-extrabold text-purple-400">AI</p>
                            <p className="mt-1 text-gray-400 text-sm">Generation & Optimization</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={handleNavigateContentEngine} className="text-purple-300 hover:text-white border-purple-500/30 hover:bg-purple-900/30">
                            <PencilIcon className="w-4 h-4"/> 
                        </Button>
                    </div>
                </Card>

                {/* 4. Market Intelligence */}
                <Card className="relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">市场情报</h2>
                            <p className="mt-2 text-5xl font-extrabold text-indigo-400">Data</p>
                            <p className="mt-1 text-gray-400 text-sm">Keywords & Volume</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={handleNavigateMarket}>
                            <ChartBarIcon className="w-4 h-4"/> 
                        </Button>
                    </div>
                </Card>

                {/* 5. SERP Analysis */}
                <Card className="relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">SERP 分析</h2>
                            <p className="mt-2 text-5xl font-extrabold text-orange-400">Rank</p>
                            <p className="mt-1 text-gray-400 text-sm">Competitor Research</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={handleNavigateSerp}>
                            <SearchIcon className="w-4 h-4"/> 
                        </Button>
                    </div>
                </Card>

                {/* 6. AI Visibility */}
                <Card className="relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">AI 可见性</h2>
                            <p className="mt-2 text-5xl font-extrabold text-teal-400">LLM</p>
                            <p className="mt-1 text-gray-400 text-sm">Search Visibility</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={handleNavigateAi}>
                            <EyeIcon className="w-4 h-4"/> 
                        </Button>
                    </div>
                </Card>

            </div>

            {/* Project List */}
            <div className="mt-10">
                <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-4">
                        <Checkbox
                            id="select-all-projects"
                            checked={projects.length > 0 && selectedProjects.size === projects.length}
                            isIndeterminate={selectedProjects.size > 0 && selectedProjects.size < projects.length}
                            onChange={handleSelectAll}
                        />
                        <label htmlFor="select-all-projects" className="text-white font-medium">全选</label>
                         <h2 className="text-2xl font-bold text-white">所有项目</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2" />
                            新建项目
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onProjectClick={onProjectClick}
                            isSelected={selectedProjects.has(project.id)}
                            onToggleSelection={handleToggleSelection}
                        />
                    ))}
                     {projects.length === 0 && (
                        <p className="text-gray-500 col-span-full text-center py-8">No projects yet. Click "New Project" to get started.</p>
                    )}
                </div>
            </div>

            {selectedProjects.size > 0 && (
                 <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-white font-semibold">{selectedProjects.size} 已选择</span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedProjects(new Set())}>取消选择</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSelected()}>
                        <TrashIcon className="w-4 h-4 mr-1" /> 删除
                    </Button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="创建新项目">
                <div className="space-y-4">
                    <Input
                        label="母项目名称"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Q4 Content Campaign"
                        autoFocus
                        required
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button>
                        <Button variant="primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>创建项目</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


const Dashboard: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
    const [activeView, setActiveView] = useState<DashboardView>('overview');
    const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

    const handleProjectClick = (projectId: string) => {
        setFilterProjectId(projectId);
        setActiveView('library');
    };

    const handleClearFilter = () => {
        setFilterProjectId(null);
    };


    const renderContent = () => {
        switch (activeView) {
            case 'overview':
                return <ProjectOverview onProjectClick={handleProjectClick} setPage={setPage} />;
            case 'library':
                return <KeywordLibraryView filterProjectId={filterProjectId} onClearFilter={handleClearFilter} setPage={setPage} />;
            case 'progress':
                return <ContentProgressView setPage={setPage} filterProjectId={filterProjectId} onClearFilter={handleClearFilter}/>;
            case 'image-library':
                return <ImageLibraryView filterProjectId={filterProjectId} onClearFilter={handleClearFilter} setPage={setPage} />;
            case 'posts-to-publish':
                return <PostsToPublishView />;
            case 'publishing-status':
                return <PublishingStatusView />;
            default:
                return <ProjectOverview onProjectClick={handleProjectClick} setPage={setPage} />;
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white">控制台</h1>
            <p className="text-gray-400 mt-2">Welcome to your SEO Copilot dashboard. Here's an overview of your workspace.</p>
            
            <div className="mt-6 border-b border-gray-700">
                <div className="flex space-x-2 flex-wrap">
                    <TabButton 
                        icon={<ProjectsIcon className="w-5 h-5"/>}
                        label="项目总览"
                        isActive={activeView === 'overview'}
                        onClick={() => setActiveView('overview')}
                    />
                    <TabButton 
                        icon={<LibraryIcon className="w-5 h-5"/>}
                        label="关键词库"
                        isActive={activeView === 'library'}
                        onClick={() => {
                            setActiveView('library');
                            // We don't automatically clear filter here to allow persistence if user clicks back and forth
                        }}
                    />
                    <TabButton 
                        icon={<DocumentIcon className="w-5 h-5"/>}
                        label="内容进度"
                        isActive={activeView === 'progress'}
                        onClick={() => setActiveView('progress')}
                    />
                     <TabButton 
                        icon={<ImageIcon className="w-5 h-5"/>}
                        label="图库"
                        isActive={activeView === 'image-library'}
                        onClick={() => setActiveView('image-library')}
                    />
                     <TabButton 
                        icon={<PublishIcon className="w-5 h-5"/>}
                        label="待发布文章"
                        isActive={activeView === 'posts-to-publish'}
                        onClick={() => setActiveView('posts-to-publish')}
                    />
                    <TabButton 
                        icon={<PublishIcon className="w-5 h-5"/>}
                        label="发布状态"
                        isActive={activeView === 'publishing-status'}
                        onClick={() => setActiveView('publishing-status')}
                    />
                </div>
            </div>

            {renderContent()}

        </div>
    );
};

export default Dashboard;