
import { PublishingItem, PublishingChannel, PublishingPlatform, PublishedDestination, PostToPublish, ImageObject, Article, SavedImageSet, PublishedDestinationDetail, WpTerm } from '../types';
import { formatArticleForWordPress } from './formatters/wordpress/articleFormatter';
import { formatPostForWordPress } from './formatters/wordpress/postFormatter';
import { formatImageSetForWordPress } from './formatters/wordpress/imageSetFormatter';
import { fetchWpCategories, fetchWpTags, createWpTerm } from './wordpressApiService';

// Interface for richer upload context
interface WordPressUploadData {
    image: ImageObject;
    blob?: Blob; // for base64
    sourceItem: Article | PostToPublish | SavedImageSet;
    imageIndex?: number; // for post images
}

/**
 * Normalizes a WordPress API URL and appends a path.
 * Ensures the final URL is in the format: https://domain.com/wp-json/wp/v2/path
 * @param baseUrl The base URL provided by the user (e.g., https://domain.com or https://domain.com/wp-json).
 * @param path The API path to append (e.g., /wp/v2/media).
 * @returns The fully constructed and normalized endpoint URL.
 */
function getWpEndpoint(baseUrl: string, path: string): string {
    // 1. Remove trailing slashes from the base URL.
    let normalizedUrl = baseUrl.replace(/\/+$/, '');

    // 2. Ensure it ends with /wp-json if it's a base URL.
    if (!normalizedUrl.includes('/wp-json')) {
        normalizedUrl = `${normalizedUrl}/wp-json`;
    }

    // 3. Append the path.
    return `${normalizedUrl}${path}`;
}

const base64ToBlob = (base64: string): { blob: Blob, extension: string } => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    const extension = contentType.split('/')[1] || 'jpeg';
    return { blob: new Blob([uInt8Array], { type: contentType }), extension };
};


/**
 * Publishes an image to WordPress Media Library with context-aware metadata.
 * @param uploadData An object containing the image and its context.
 * @param channel The WordPress channel configuration.
 * @returns The URL of the uploaded image on WordPress.
 */
async function uploadImageToWordPress(uploadData: WordPressUploadData, channel: PublishingChannel): Promise<{ url: string, id: number }> {
    const { image, blob, sourceItem, imageIndex } = uploadData;
    const { apiUrl, username, password } = channel.config;
    if (!apiUrl || !username || !password) {
        throw new Error("WordPress channel configuration is incomplete.");
    }

    let imageBlob: Blob;
    let imageType: string;

    if (blob) {
        imageBlob = blob;
        imageType = blob.type;
    } else {
        const response = await fetch(image.url_full);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from ${image.url_full}. Status: ${response.statusText}`);
        }
        imageBlob = await response.blob();
        imageType = imageBlob.type;
    }

    const formData = new FormData();
    const extension = (imageType.split('/')[1] || 'jpg').split('+')[0];

    // --- Start of new dynamic metadata logic ---
    let finalTitle: string;
    let finalAltText: string;
    const finalDescription = image.alt_description || '';

    // Check if the source is an Article or Post
    if ('title' in sourceItem && ('content' in sourceItem || 'htmlContent' in sourceItem)) {
        const post = sourceItem as Article | PostToPublish;

        // Title Logic for Posts
        if (image.userDefinedName) {
            finalTitle = image.userDefinedName;
        } else if (post.title) {
            finalTitle = `${post.title}-image-${(imageIndex || 0) + 1}`;
        } else {
            finalTitle = image.alt_description;
        }

        // Alt Text Logic for Posts
        const keywordContext = (post as PostToPublish).keyword_context || (post as Article).keyword_context;
        finalAltText = keywordContext || image.alt_description;

    }
    // Check if the source is an Image Set from the Library
    else if ('search_term_or_prompt' in sourceItem) {
        const imageSet = sourceItem as SavedImageSet;

        // Title Logic for Library Images
        finalTitle = image.userDefinedName || image.alt_description;

        // Alt Text Logic for Library Images
        finalAltText = imageSet.search_term_or_prompt || image.alt_description;
    }
    // Fallback for any other case
    else {
        finalTitle = image.userDefinedName || image.alt_description;
        finalAltText = image.alt_description;
    }

    const filenameBase = finalTitle.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '-').slice(0, 80) || image.id;
    const filename = `${filenameBase}.${extension}`;

    formData.append('file', new File([imageBlob], filename, { type: imageType }));
    formData.append('title', finalTitle || filename);
    formData.append('alt_text', finalAltText || finalTitle);
    formData.append('caption', `Image by ${image.author_name} on ${image.source_platform}`);

    if (finalDescription) {
        formData.append('description', finalDescription);
    }
    // --- End of new dynamic metadata logic ---

    const endpoint = getWpEndpoint(apiUrl, '/wp/v2/media');
    const authString = btoa(`${username}:${password}`);

    const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
        },
        body: formData,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`WordPress media upload failed with status ${uploadResponse.status}: ${errorText}`);
    }

    const mediaData = await uploadResponse.json();
    if (!mediaData.source_url) {
        throw new Error('WordPress media upload succeeded, but no source_url was returned.');
    }

    return { url: mediaData.source_url, id: mediaData.id };
}


async function publishImageSetToWordPress(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    const { images } = formatImageSetForWordPress(item.data as SavedImageSet);
    const details: PublishedDestinationDetail[] = [];
    let successCount = 0;

    for (const image of images) {
        try {
            const { url: newUrl } = await uploadImageToWordPress({ image, sourceItem: item.data as SavedImageSet }, channel);
            details.push({ status: 'success', log: `Uploaded ${image.id}`, url: newUrl });
            successCount++;
        } catch (error: any) {
            details.push({ status: 'failed', log: `Failed to upload ${image.id}: ${error.message}` });
        }
    }

    const overallStatus = successCount === images.length ? 'success' : 'failed';
    const log = `Published ${successCount}/${images.length} images to Media Library.`;

    return {
        platform: PublishingPlatform.WORDPRESS,
        status: overallStatus,
        target: channel.config.apiUrl,
        publishedAt: new Date().toISOString(),
        log,
        details,
    };
}

// Helper to resolve term names (tags, categories) to IDs (Kept same as before, included for context if needed, but referenced outside)
// Note: We are replacing the whole block, so we assume resolveTermIds exists below or we keep it. 
// Ah, the tool replaces lines 56 to 429. resolveTermIds is lines 186-246. I should include it or exclude it from range.
// Safe play: I will include resolveTermIds if it falls in range.
// Wait, range is HUGE. 56-429 covers everything.

async function resolveTermIds(termNamesString: string | undefined, termType: 'tags' | 'categories', channel: PublishingChannel): Promise<number[]> {
    if (!termNamesString || !termNamesString.trim()) {
        return [];
    }

    const userInputParts = termNamesString.split(',').map(s => s.trim()).filter(Boolean);
    if (userInputParts.length === 0) return [];

    const existingTerms: WpTerm[] = termType === 'tags'
        ? await fetchWpTags(channel)
        : await fetchWpCategories(channel);

    const nameToIdMap = new Map<string, number>(existingTerms.map(term => [term.name.toLowerCase(), term.id]));
    const idToNameMap = new Map<number, string>(existingTerms.map(term => [term.id, term.name]));

    const resolvedIds = new Set<number>();
    const namesToCreate = new Set<string>();

    for (const part of userInputParts) {
        const partLower = part.toLowerCase();
        const numId = parseInt(part, 10);

        if (nameToIdMap.has(partLower)) {
            resolvedIds.add(nameToIdMap.get(partLower)!);
        }
        else if (!isNaN(numId) && idToNameMap.has(numId)) {
            resolvedIds.add(numId);
        }
        else {
            if (!nameToIdMap.has(partLower)) {
                namesToCreate.add(part);
            }
        }
    }

    if (namesToCreate.size > 0) {
        const creationPromises = Array.from(namesToCreate).map(name => createWpTerm(channel, termType, name));
        try {
            const createdTerms = await Promise.all(creationPromises);
            createdTerms.forEach(term => resolvedIds.add(term.id));
        } catch (creationError) {
            console.error(`Failed to create some ${termType}.`, creationError);
            throw creationError;
        }
    }

    return Array.from(resolvedIds);
}

async function publishToWordPress(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    const { apiUrl, username, password } = channel.config;

    // 1. Use the appropriate formatter based on source type
    const { title, images } = item.source_type === 'article'
        ? formatArticleForWordPress(item.data as Article)
        : formatPostForWordPress(item.data as PostToPublish);

    let content = item.source_type === 'article'
        ? formatArticleForWordPress(item.data as Article).content
        : formatPostForWordPress(item.data as PostToPublish).content;

    let featuredMediaId: number | undefined;

    // 2. Process images: Smart Handling for Base64 vs Direct URL vs Featured Image
    if (images && images.length > 0) {
        const imgTagRegex = /<img\s+[^>]*?>/gi;
        const matches = [...content.matchAll(imgTagRegex)];
        const imageMap = new Map(images.map(img => [img.id, img]));
        const replacements: { old: string, new: string }[] = [];

        // Track if we found a candidate for featured image
        let firstImageProcessed = false;

        for (const match of matches) {
            const imgTag = match[0];
            const srcMatch = imgTag.match(/src=["'](.*?)["']/);
            const src = srcMatch ? srcMatch[1] : null;
            if (!src) continue;

            const idMatch = imgTag.match(/data-image-id=["'](.*?)["']/);
            const id = idMatch ? idMatch[1] : null;

            // Resolve Image Object
            let imageMeta: ImageObject | undefined;
            if (id && imageMap.has(id)) {
                imageMeta = imageMap.get(id);
            } else {
                imageMeta = images.find(img => img.url_regular === src || img.base64 === src);
            }

            // Fallback Metadata
            if (!imageMeta) {
                imageMeta = {
                    id: id || `unknown-${Date.now()}`,
                    url_regular: src,
                    url_full: src,
                    alt_description: 'Embedded Image',
                    author_name: 'Unknown',
                    author_url: '',
                    source_platform: 'custom' as any,
                    source_url: '',
                    width: 1024,
                    height: 1024
                };
            }

            const isBase64 = src.startsWith('data:');
            const isFirstImage = !firstImageProcessed;

            if (isFirstImage) firstImageProcessed = true;

            if (isBase64) {
                // Must upload Base64
                try {
                    const { blob } = base64ToBlob(src);
                    const { url: newUrl, id: wpId } = await uploadImageToWordPress(
                        { image: imageMeta, blob, sourceItem: item.data as PostToPublish | Article },
                        channel
                    );

                    // Set Featured Image if it's the first one
                    if (isFirstImage) featuredMediaId = wpId;

                    // Text Replacement
                    const newTag = imgTag.replace(src, newUrl);
                    replacements.push({ old: imgTag, new: newTag });

                } catch (error) {
                    console.error(`Failed to upload image for post ${title}:`, error);
                }
            } else {
                // It is a Direct URL (R2/External)
                // We KEEP the URL in the content (Direct URL Support)

                // BUT: if it's the first image, and we haven't set a featured image yet,
                // we should "sideload" it to WP just for the featured_media ID.
                if (isFirstImage && !featuredMediaId) {
                    try {
                        console.log(`Sideloading first image for Featured Media: ${src}`);
                        // We pass undefined blob to trigger fetch from URL inside the function
                        const { id: wpId } = await uploadImageToWordPress(
                            { image: imageMeta, sourceItem: item.data as PostToPublish | Article },
                            channel
                        );
                        featuredMediaId = wpId;
                    } catch (e) {
                        console.warn("Failed to sideload featured image from URL", e);
                    }
                }
            }
        }

        // Apply replacements
        replacements.forEach(rep => {
            content = content.replace(rep.old, rep.new);
        });
    }

    // 3. Prepare post payload
    const postPayload: any = {
        title: { raw: title },
        content: content,
        status: channel.config.status || 'draft',
    };
    if (channel.config.lang) postPayload.lang = channel.config.lang;
    if (featuredMediaId) postPayload.featured_media = featuredMediaId;

    // 4. Publish the post
    const endpoint = getWpEndpoint(apiUrl, '/wp/v2/posts');
    const authString = btoa(`${username}:${password}`);

    try {
        const [tagIds, categoryIds] = await Promise.all([
            resolveTermIds(channel.config.tags, 'tags', channel),
            resolveTermIds(channel.config.categories, 'categories', channel)
        ]);
        if (tagIds.length > 0) postPayload.tags = tagIds;
        if (categoryIds.length > 0) postPayload.categories = categoryIds;

        const postResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload),
        });

        if (!postResponse.ok) {
            const errorText = await postResponse.text();
            throw new Error(`WordPress post creation failed (1st attempt): ${errorText}`);
        }

        const createdPost = await postResponse.json();
        return {
            platform: PublishingPlatform.WORDPRESS,
            status: 'success',
            target: channel.config.apiUrl,
            url: createdPost.link,
            publishedAt: new Date().toISOString(),
            log: `Successfully published post with ID: ${createdPost.id}`,
        };

    } catch (initialError) {
        console.warn("Initial post creation failed. Retrying without tags/categories.", initialError);
        delete postPayload.tags;
        delete postPayload.categories;

        const retryResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload),
        });

        if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            throw new Error(`WordPress post creation failed on both attempts. Initial error: ${(initialError as Error).message}. Retry error: ${errorText}`);
        }

        const createdPost = await retryResponse.json();
        return {
            platform: PublishingPlatform.WORDPRESS,
            status: 'success',
            target: channel.config.apiUrl,
            url: createdPost.link,
            publishedAt: new Date().toISOString(),
            log: `Successfully published post with ID: ${createdPost.id} (tags/categories were skipped due to an initial error).`,
        };
    }
}


/**
 * Publishes a publishing item to the specified channel.
 * This acts as a router to the correct publishing function based on platform.
 * @param item The item to publish.
 * @param channel The channel to publish to.
 * @returns A promise resolving to the publication result.
 */
export async function publishItem(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    switch (channel.platform) {
        case PublishingPlatform.WORDPRESS:
            if (item.source_type === 'article' || item.source_type === 'post') {
                return publishToWordPress(item, channel);
            }
            if (item.source_type === 'image_set') {
                return publishImageSetToWordPress(item, channel);
            }
            throw new Error(`Publishing type '${item.source_type}' to WordPress is not supported yet.`);

        case PublishingPlatform.CLOUDFLARE_R2:
        case PublishingPlatform.SUPABASE:
        case PublishingPlatform.GCS:
        case PublishingPlatform.S3:
            throw new Error(`Publishing to ${channel.platform} is not yet implemented.`);

        default:
            throw new Error(`Unknown or unsupported publishing platform: ${channel.platform}`);
    }
}
