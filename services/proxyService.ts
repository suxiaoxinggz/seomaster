
interface ProxyOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
}

/**
 * Helper to make requests via the backend proxy to bypass CORS.
 * Standard implementation without WAF tunneling.
 */
export const fetchProxy = async (options: ProxyOptions): Promise<any> => {
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url: options.url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body || undefined
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Proxy Error: ${response.status} - ${text}`);
    }

    // We return the raw response object so the caller can decide (json vs blob)
    return response;
};
