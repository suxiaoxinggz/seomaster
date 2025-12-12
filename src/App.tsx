import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages and Components
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import AccountSettings from './pages/AccountSettings';
import ToolApp from '../ToolApp';
import ProtectedRoute from '../components/ProtectedRoute'; // Importing from root components
import Layout from '../components/Layout'; // Importing from root components

// Services
import { supabase } from '../services/supabaseClient';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        }
    }
});

const AppRoutes: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // Redirect to account settings when recovery flow is triggered
                navigate('/account-settings');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage initialView="login" />} />
            <Route path="/signup" element={<AuthPage initialView="signup" />} />
            <Route path="/account-settings" element={
                <ProtectedRoute>
                    <Layout>
                        <AccountSettings />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={<ToolApp />} />
            <Route path="/app/*" element={<ToolApp />} />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>

            <Toaster position="top-right" toastOptions={{
                style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }} />
        </QueryClientProvider>
    );
};

export default App;
