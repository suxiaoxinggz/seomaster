import React, { useContext, useState, useRef, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Article, Project, KeywordSubProject, PublishingItem } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';
import { TrashIcon, PublishIcon, EyeIcon, ImageIcon } from './icons';
import StatusBadgeGrid from './StatusBadgeGrid';
import { markdownToHtml } from '../services/formatters/shared/utils';


// Helper to trigger TXT file download
const downloadTXT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Toolbar Component
const ToolbarButton: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
    <button 
        onClick={onClick} 
        className="px-2 py-1 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs font-semibold transition-colors border border-gray-700"
    >
        {label}
    </button>
);

interface ContentProgressViewProps {
    setPage?: (page: any) => void;
    filterProjectId?: string | null;
    onClearFilter?: () => void;
}

const ContentProgressView: React.FC<ContentProgressViewProps> = ({ setPage, filterProjectId = null, onClearFilter }) => {
    const context = useContext(AppContext);
    const { articles, setArticles, projects, keywordLibrary, setPublishingQueue, setNavigationPayload } = context || { articles: [], setArticles: () => {}, projects: [], keywordLibrary: [], setPublishingQueue: () => {}, setNavigationPayload: () => {} };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [showPreview, setShowPreview] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // New search state
    
    // Ref for the textarea to manipulate cursor/selection
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Filter articles based on project ID AND search term
    const displayArticles = useMemo(() => {
        let filtered = articles;
        if (filterProjectId) {
            filtered = filtered.filter(a => a.parentProjectId === filterProjectId);
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(a => a.title.toLowerCase().includes(lowerTerm));
        }
        return filtered;
    }, [articles, filterProjectId, searchTerm]);

    const parentProject = (filterProjectId && projects) ? projects.find(p => p.id === filterProjectId) : null;

    const handleCardClick = (article: Article) => {
        setSelectedArticle(article);
        setEditedContent(article.content);
        setIsModalOpen(true);
        setShowPreview(false); 
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedArticle(null);
        setEditedContent('');
    };

    const handleSave = () => {
        if (!selectedArticle) return;

        if (editedContent.trim() === selectedArticle.content.trim()) {
            handleCloseModal();
            return;
        }
        
        const baseTitle = selectedArticle.title.replace(/\s\(Version \d+\)$/, '').trim();
        const lineage = articles.filter(a => a.title.replace(/\s\(Version \d+\)$/, '').trim() === baseTitle);
        const nextVersion = lineage.length + 1;
        const newTitle = `${baseTitle} (Version ${nextVersion})`;

        const newArticle: Article = {
            ...selectedArticle,
            id: `article-${Date.now()}`,
            title: newTitle,
            content: editedContent.trim(),
            createdAt: new Date().toISOString(),
            publishedDestinations: [],
        };

        setArticles([...articles, newArticle]);
        handleCloseModal();
    };
    
    const handleToggleSelection = (articleId: string) => {
        setSelectedArticles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(articleId)) {
                newSet.delete(articleId);
            } else {
                newSet.add(articleId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedArticles.size === displayArticles.length) {
            setSelectedArticles(new Set());
        } else {
            setSelectedArticles(new Set(displayArticles.map(a => a.id)));
        }
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`您确定要删除选中的 ${selectedArticles.size} 篇文章吗？`)) {
            const selectedIds = Array.from(selectedArticles);
            const newArticles = articles.filter(a => !selectedIds.includes(a.id));
            setArticles(newArticles);
            setSelectedArticles(new Set());
        }
    };

    const handleAddToQueue = () => {
        const selectedIds = Array.from(selectedArticles);
        const articlesToAdd = articles.filter(a => selectedIds.includes(a.id));
        
        const newQueueItems: PublishingItem[] = articlesToAdd.map(article => ({
            id: `queue-article-${article.id}-${Date.now()}`,
            sourceId: article.id,
            sourceType: 'article',
            name: article.title,
            status: 'queued',
            log: '等待发布',
        }));

        setPublishingQueue(prev => {
             const existingIds = new Set(prev.map(p => p.sourceId));
             const uniqueNewItems = newQueueItems.filter(item => !existingIds.has(item.sourceId));
             return [...prev, ...uniqueNewItems];
        });
        setSelectedArticles(new Set());
        alert(`${newQueueItems.length}篇文章已添加到发布队列。`);
    };

    // --- Toolbar Logic ---
    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
        setEditedContent(newText);
        
        // Reset cursor focus and position (after the insertion)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    // --- Visualization Workflow ---
    const handleVisualize = () => {
        if (!editedContent || !setPage) return;
        setNavigationPayload({
            type: 'create_images',
            data: { content: editedContent }
        });
        setPage('image-text');
    };

    if (articles.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                <p>您保存的文章将显示在此处。</p>
                <p className="text-sm">转到“大纲与文章”生成器来创建和保存您的第一篇内容。</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            {parentProject && (
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
                    <h2 className="text-lg font-semibold text-white">
                        正在显示项目文章: <span className="text-blue-400">{parentProject.name}</span>
                    </h2>
                    {onClearFilter && <Button variant="secondary" onClick={onClearFilter}>清除筛选</Button>}
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Checkbox
                        id="select-all-articles"
                        checked={displayArticles.length > 0 && selectedArticles.size === displayArticles.length}
                        isIndeterminate={selectedArticles.size > 0 && selectedArticles.size < displayArticles.length}
                        onChange={handleSelectAll}
                    />
                    <label htmlFor="select-all-articles" className="text-white font-medium">全选</label>
                </div>
                <div className="w-64">
                    <Input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="搜索文章标题..." 
                        className="py-1.5"
                    />
                </div>
            </div>
            
            <div className="space-y-4 pb-20">
                {displayArticles.length > 0 ? displayArticles.map(article => {
                    const parentProject = projects.find(p => p.id === article.parentProjectId);
                    const subProject = keywordLibrary.find(sp => sp.id === article.subProjectId);
                    
                    return (
                        <Card key={article.id}>
                            <div className="flex items-start gap-4">
                                 <Checkbox
                                    id={`select-article-${article.id}`}
                                    checked={selectedArticles.has(article.id)}
                                    onChange={() => handleToggleSelection(article.id)}
                                    className="mt-2"
                                    aria-label={`选择文章 ${article.title}`}
                                />
                                <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => handleCardClick(article)}
                                >
                                    <div className="flex justify-between items-start hover:bg-gray-700/20 p-1 rounded-md">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white">{article.title}</h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                项目: <span className="font-semibold text-gray-300">{parentProject?.name || 'N/A'} / {subProject?.name || 'N/A'}</span>
                                            </p>
                                             <div className="mt-2">
                                                <StatusBadgeGrid destinations={article.publishedDestinations} />
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-xs text-gray-500">创建于: {new Date(article.createdAt).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500 mt-1">模型: <span className="font-semibold text-gray-400">{article.modelUsed}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                }) : (
                    <div className="text-center py-10 text-gray-500">
                        {searchTerm ? <p>没有找到标题包含 "{searchTerm}" 的文章。</p> : <p>该项目下暂无文章。</p>}
                    </div>
                )}
            </div>

            {selectedArticles.size > 0 && (
                 <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-white font-semibold">{selectedArticles.size} 已选择</span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedArticles(new Set())}>取消选择</Button>
                    <Button variant="primary" size="sm" onClick={handleAddToQueue}>
                        <PublishIcon className="w-4 h-4 mr-1" /> 添加到发布队列
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                        <TrashIcon className="w-4 h-4 mr-1" /> 删除
                    </Button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedArticle?.title || '编辑文章'}>
                {selectedArticle && (
                    <div className="flex flex-col h-[80vh]">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <div className="flex gap-2">
                                <ToolbarButton label="B" onClick={() => insertText('**', '**')} />
                                <ToolbarButton label="I" onClick={() => insertText('*', '*')} />
                                <ToolbarButton label="H2" onClick={() => insertText('## ')} />
                                <ToolbarButton label="H3" onClick={() => insertText('### ')} />
                                <ToolbarButton label="List" onClick={() => insertText('- ')} />
                                <ToolbarButton label="Link" onClick={() => insertText('[', '](url)')} />
                            </div>
                            <div className="flex gap-2">
                                {setPage && (
                                    <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={handleVisualize}
                                    >
                                        <ImageIcon className="w-4 h-4 mr-1" />
                                        配图
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    variant={showPreview ? 'primary' : 'secondary'} 
                                    onClick={() => setShowPreview(!showPreview)}
                                >
                                    <EyeIcon className="w-4 h-4 mr-2" />
                                    {showPreview ? '隐藏预览' : '实时预览'}
                                </Button>
                            </div>
                        </div>
                        
                        <div className={`flex-grow overflow-hidden gap-4 ${showPreview ? 'grid grid-cols-2' : 'flex'}`}>
                             <div className="h-full flex flex-col w-full">
                                <textarea
                                    ref={textareaRef}
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full h-full bg-gray-900 border border-gray-600 rounded-md px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
                                    placeholder="在此处编辑 Markdown 内容..."
                                    autoFocus
                                />
                             </div>
                             
                             {showPreview && (
                                 <div className="h-full bg-white text-gray-900 rounded-md p-6 overflow-y-auto prose prose-sm max-w-none shadow-inner">
                                     <div dangerouslySetInnerHTML={{ __html: markdownToHtml(editedContent) }} />
                                 </div>
                             )}
                        </div>

                        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-gray-700 mt-4">
                            <div className="text-sm text-gray-400 font-mono">
                                字符数: {editedContent.length}
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={handleCloseModal}>取消</Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleSave}
                                    disabled={!editedContent.trim() || editedContent.trim() === selectedArticle.content.trim()}
                                >
                                    保存为新版本
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ContentProgressView;