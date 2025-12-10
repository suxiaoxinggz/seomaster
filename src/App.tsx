import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import ToolApp from '../ToolApp'; // The original monolithic app

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        }
    }
});

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/dashboard" element={<ToolApp />} />

                    {/* 
                      The ToolApp handles its own sub-routing (sort of) via state 'page'.
                      We mount it at /app/* 
                    */}
                    <Route path="/app/*" element={<ToolApp />} />
                </Routes>
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
