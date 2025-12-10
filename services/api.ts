import { supabase } from './supabaseClient';

// Base URL for our own backend API (relative path)
// In production: /api/... proxies to backend container
// In development: Vite proxy should handle /api/ -> localhost:8000/api/
const API_BASE = '/api';

/**
 * Make a secure request to the backend API using Supabase JWT.
 * @param endpoint - The API endpoint (e.g., 'dataforseo/keyword_finder/live')
 * @param method - HTTP Method (GET, POST, etc.)
 * @param body - JSON body for POST/PUT requests
 */
export const secureFetch = async <T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> => {
    // 1. Get current session token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
        throw new Error("Authentication required. Please log in.");
    }

    // 2. Prepare headers
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Send Supabase JWT
    };

    // 3. Make fetch request
    // Ensure endpoint doesn't start with / if we append to API_BASE, or handle it gracefully
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_BASE}/${cleanEndpoint}`;

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        // 4. Handle errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || errorData.message || `API Error: ${response.status}`;
            throw new Error(errorMessage);
        }

        // 5. Return data
        return await response.json();

    } catch (error) {
        console.error(`Secure Fetch Error [${endpoint}]:`, error);
        throw error;
    }
};
