import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import Spinner from './ui/Spinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const context = useContext(AppContext);
    // Note: AppContext might be null if we are outside ToolApp's provider.
    // However, App.tsx wraps everything in QueryClientProvider, but AppContext.Provider is inside ToolApp.
    // This is a problem! ProtectedRoute needs access to session.

    // If ProtectedRoute is used outside ToolApp, it won't have access to AppContext info unless we lift the Provider up or create a new one.
    // Given the structure, we might need to rely on supabase client directly or check local storage/session independently if context is missing.
    // BUT, for now, let's assume we can use the singleton supabase instance if we import it or re-initialize it.

    // BETTER APPROACH:
    // Since AppContent provides the context, and it's inside ToolApp, 
    // routes defined in App.tsx OUTSIDE of ToolApp won't have access to that specific context instance.
    // We should probably check the session directly using the supabase client helper.

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We need to import the supabase client factory or get it from a shared module
        // Let's assume we can get it or we just check localStorage for a quick check, 
        // but for security we should verify.
        // Actually, let's look at how ToolApp does it. It initializes it.

        // Dynamic import to avoid circular deps if any, or just import the service
        import('../services/supabaseClient').then(({ supabase }) => {
            // If supabase is exported as a singleton instance, use it.
            // If it notifies a factory, we use that.
            // efficient check:
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setLoading(false);
            });
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
