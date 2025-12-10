import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { SavedImageSet, ImageObject, Project, KeywordSubProject, PublishingItem, Page } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ChevronDownIcon, TrashIcon, DownloadIcon, ExternalLinkIcon, PublishIcon, WandIcon } from './icons';
import Checkbox from './ui/Checkbox';
import Modal from './ui/Modal';
import JSZip from 'jszip';
import Select from './ui/Select';
import StatusBadgeGrid from './StatusBadgeGrid';
import { toast } from 'react-hot-toast';

const base64ToBlob = (base64: string, contentType: string = 'image/jpeg'): Blob => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};

const downloadZip = (zip: JSZip, filename: string) => {
    zip.generateAsync({ type: 'blob' }).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};

const ImageSetCard: React.FC<{
    imageSet: SavedImageSet;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onViewImage: (image: ImageObject) => void;
    parentProjectName: string;
    subProjectName: string;
}> = ({ imageSet, isSelected, onToggleSelection, onViewImage, parentProjectName, subProjectName }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleCopyLink = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url).then(() => {
            toast.success("Image URL copied to clipboard!");
        });
    };

    return (
        <Card>
            <div className="flex items-start gap-4">
                <Checkbox
                    id={`select-imgset-${imageSet.id}`}
                    checked={isSelected}
                    onChange={() => onToggleSelection(imageSet.id)}
                    className="mt-2"
                    aria-label={`选择图片集 ${imageSet.name}`}
                />
                <div className="flex-1">
                    <div className="flex justify-between items-start cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white truncate">{imageSet.name}</h3>
                            <p className="text-sm text-gray-400 mt-1 truncate">
                                搜索词: <span className="font-semibold text-gray-300">{imageSet.search_term_or_prompt}</span>
                            </p>
                            <div className="mt-2">
                                <StatusBadgeGrid destinations={imageSet.published_destinations || []} />
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">{imageSet.images.length} 张图片</p>
                                <p className="text-xs text-gray-500 mt-1">保存于: {new Date(imageSet.created_at).toLocaleDateString()}</p>
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                {imageSet.images.map(image => (
                                    <div key={image.id} className="relative group aspect-square rounded-md overflow-hidden bg-gray-900 border border-gray-700 cursor-pointer" onClick={() => onViewImage(image)}>
                                        <img src={image.url_regular} alt={image.alt_description} className="w-full h-full object-cover" />
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                className="p-1.5 bg-gray-800 text-white rounded-full hover:bg-blue-600 transition-colors"
                                                title="Copy Link"
                                                onClick={(e) => handleCopyLink(e, image.url_full)}
                                            >
                                                <ExternalLinkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

interface ImageLibraryViewProps {
    filterProjectId?: string | null;
    onClearFilter?: () => void;
    setPage?: (page: Page) => void;
}

export const ImageLibraryView: React.FC<ImageLibraryViewProps> = ({ filterProjectId, onClearFilter, setPage }) => {
    const context = useContext(AppContext);
    const { savedImageSets, setSavedImageSets, projects, keywordLibrary, setPublishingQueue } = context || { savedImageSets: [], setSavedImageSets: () => { }, projects: [], keywordLibrary: [], setPublishingQueue: () => { } };

    const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
    const [viewingImage, setViewingImage] = useState<ImageObject | null>(null);
    const [tagFilter, setTagFilter] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const filteredSourceSets = useMemo(() => {
        if (!filterProjectId) return savedImageSets;
        return savedImageSets.filter(s => s.parent_project_id === filterProjectId);
    }, [savedImageSets, filterProjectId]);

    const uniqueTags = useMemo(() => {
        return [...new Set(filteredSourceSets.map(s => s.name))];
    }, [filteredSourceSets]);

    const groupedAndFilteredSets = useMemo(() => {
        const filtered = tagFilter ? filteredSourceSets.filter(s => s.name === tagFilter) : filteredSourceSets;

        const groupedByParent: Record<string, SavedImageSet[]> = {};
        for (const set of filtered) {
            if (!groupedByParent[set.parent_project_id]) {
                groupedByParent[set.parent_project_id] = [];
            }
            groupedByParent[set.parent_project_id].push(set);
        }

        const result = projects
            .filter(p => groupedByParent[p.id])
            .map(p => {
                const setsForParent = groupedByParent[p.id];
                const groupedBySub: Record<string, SavedImageSet[]> = {};
                for (const set of setsForParent) {
                    if (!groupedBySub[set.sub_project_id]) {
                        groupedBySub[set.sub_project_id] = [];
                    }
                    groupedBySub[set.sub_project_id].push(set);
                }

                const subProjectsWithSets = keywordLibrary
                    .filter(sp => groupedBySub[sp.id])
                    .map(sp => ({
                        subProject: sp,
                        imageSets: groupedBySub[sp.id]
                    }));

                // Also include sets that have a parent project but no matching subproject (orphan sets or direct parent sets)
                const orphans = setsForParent.filter(s => !keywordLibrary.some(sp => sp.id === s.sub_project_id));
                if (orphans.length > 0) {
                    subProjectsWithSets.push({
                        subProject: { id: 'direct', name: 'General / Unassigned' } as any,
                        imageSets: orphans
                    });
                }

                return {
                    parentProject: p,
                    subProjects: subProjectsWithSets,
                }
            });

        return result;
    }, [filteredSourceSets, projects, keywordLibrary, tagFilter]);

    const parentProject = (filterProjectId && projects) ? projects.find(p => p.id === filterProjectId) : null;

    const handleToggleSelection = (setId: string) => {
        setSelectedSets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(setId)) newSet.delete(setId);
            else newSet.add(setId);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allVisibleIds = groupedAndFilteredSets.flatMap(g => g.subProjects.flatMap(sp => sp.imageSets.map(is => is.id)));
        if (selectedSets.size === allVisibleIds.length) {
            setSelectedSets(new Set());
        } else {
            setSelectedSets(new Set(allVisibleIds));
        }
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`您确定要删除选中的 ${selectedSets.size} 个图片集吗?`)) {
            const selectedIds = Array.from(selectedSets);
            setSavedImageSets(savedImageSets.filter(s => !selectedIds.includes(s.id)));
            setSelectedSets(new Set());
        }
    };

    const handleAddToQueue = () => {
        const selectedIds = Array.from(selectedSets);
        const setsToAdd = savedImageSets.filter(s => selectedIds.includes(s.id));

        const newQueueItems: PublishingItem[] = setsToAdd.map(set => ({
            id: `queue-imageset-${set.id}-${Date.now()}`,
            sourceId: set.id,
            sourceType: 'image_set',
            name: set.name,
            status: 'queued',
            log: '等待发布',
        }));

        setPublishingQueue(prev => {
            const existingIds = new Set(prev.map(p => p.sourceId));
            const uniqueNewItems = newQueueItems.filter(item => !existingIds.has(item.sourceId));
            return [...prev, ...uniqueNewItems];
        });
        setSelectedSets(new Set());
        alert(`${newQueueItems.length}个图片集已添加到发布队列。`);
    };

    const handleExportSelected = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const selectedIds = Array.from(selectedSets);
            const setsToExport = savedImageSets.filter(s => selectedIds.includes(s.id));

            const fetchPromises: Promise<void>[] = [];

            for (const imageSet of setsToExport) {
                const folder = zip.folder(imageSet.name.replace(/[^a-z0-9]/gi, '_'));
                if (!folder) continue;

                for (const image of imageSet.images) {
                    const promise = fetch(image.url_full)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to fetch ${image.url_full}`);
                            return response.blob();
                        })
                        .then(blob => {
                            const extension = (blob.type.split('/')[1] || 'jpg').split('+')[0];
                            const filename = image.userDefinedName
                                ? `${image.userDefinedName}.${extension}`
                                : `${image.alt_description.replace(/[^a-z0-9]/gi, '_').slice(0, 50) || image.id}.${extension}`;
                            folder.file(filename, blob);
                        })
                        .catch(err => {
                            console.error(`Could not download image ${image.id}:`, err);
                            folder.file(`${image.id}_DOWNLOAD_FAILED.txt`, `Failed to download ${image.url_full}: ${err.message}`);
                        });
                    fetchPromises.push(promise);
                }
            }

            await Promise.all(fetchPromises);

            downloadZip(zip, `image-library-export-${new Date().toISOString().split('T')[0]}.zip`);

        } catch (error) {
            console.error("Failed to create ZIP file", error);
            alert("An error occurred while creating the ZIP file.");
        } finally {
            setIsExporting(false);
        }
    };

    if (savedImageSets.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                <p>您保存的图片集将显示在此处。</p>
                <div className="mt-4">
                    <Button onClick={() => setPage && setPage('image-text')}>
                        <WandIcon className="w-4 h-4 mr-2" />
                        去创建图片
                    </Button>
                </div>
            </div>
        );
    }

    const allVisibleIds = groupedAndFilteredSets.flatMap(g => g.subProjects.flatMap(sp => sp.imageSets.map(is => is.id)));

    return (
        <>
            <div className="mt-8 space-y-4 pb-20">
                {parentProject && (
                    <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
                        <h2 className="text-lg font-semibold text-white">
                            正在显示项目图库: <span className="text-blue-400">{parentProject.name}</span>
                        </h2>
                        {onClearFilter && <Button variant="secondary" onClick={onClearFilter}>清除筛选</Button>}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <Checkbox
                        id="select-all-image-sets"
                        checked={allVisibleIds.length > 0 && selectedSets.size === allVisibleIds.length}
                        isIndeterminate={selectedSets.size > 0 && selectedSets.size < allVisibleIds.length}
                        onChange={handleSelectAll}
                    />
                    <label htmlFor="select-all-image-sets" className="text-white font-medium">全选</label>

                    <div className="ml-auto flex gap-4">
                        <Select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-48">
                            <option value="">按名称筛选...</option>
                            {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </Select>
                        {setPage && (
                            <Button size="sm" onClick={() => setPage('image-text')} className="flex items-center">
                                <WandIcon className="w-4 h-4 mr-1" /> 新建图片集
                            </Button>
                        )}
                    </div>
                </div>

                {groupedAndFilteredSets.map(({ parentProject, subProjects }) => (
                    <div key={parentProject.id} className="p-4 bg-gray-800/50 rounded-lg">
                        <h2 className="text-2xl font-bold text-sky-300 mb-2">{parentProject.name}</h2>
                        {subProjects.map(({ subProject, imageSets }) => (
                            <div key={subProject.id} className="ml-4 mt-2 pl-4 border-l-2 border-gray-700">
                                <h3 className="text-lg font-semibold text-teal-300 mb-2">{subProject.name}</h3>
                                <div className="space-y-3">
                                    {imageSets.map(set => (
                                        <ImageSetCard
                                            key={set.id}
                                            imageSet={set}
                                            isSelected={selectedSets.has(set.id)}
                                            onToggleSelection={handleToggleSelection}
                                            onViewImage={setViewingImage}
                                            parentProjectName={parentProject.name}
                                            subProjectName={subProject.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {groupedAndFilteredSets.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>没有图片集符合您的筛选条件。</p>
                    </div>
                )}
            </div>

            {selectedSets.size > 0 && (
                <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-white font-semibold">{selectedSets.size} 已选择</span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedSets(new Set())}>取消选择</Button>
                    <Button variant="primary" size="sm" onClick={handleAddToQueue}>
                        <PublishIcon className="w-4 h-4 mr-1" /> 添加到发布队列
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleExportSelected} isLoading={isExporting}>
                        <DownloadIcon className="w-4 h-4 mr-1" /> 导出 (ZIP)
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                        <TrashIcon className="w-4 h-4 mr-1" /> 删除
                    </Button>
                </div>
            )}

            <Modal isOpen={!!viewingImage} onClose={() => setViewingImage(null)} title={viewingImage?.alt_description || 'Image Preview'}>
                {viewingImage && (
                    <div>
                        <img src={viewingImage.url_full} alt={viewingImage.alt_description} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
                        <div className="mt-4 p-4 bg-gray-900 rounded-lg text-sm flex justify-between items-center">
                            <div>
                                <p><strong>作者:</strong> <a href={viewingImage.author_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{viewingImage.author_name} <ExternalLinkIcon className="inline w-4 h-4" /></a></p>
                                <p><strong>来源:</strong> {viewingImage.source_platform}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(viewingImage.url_full);
                                    toast.success("URL copied!");
                                }}
                            >
                                复制完整链接
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};