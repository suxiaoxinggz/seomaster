import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Page } from '../types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();

    // Adapter to make Sidebar work with React Router
    const handleSetPage = (page: Page) => {
        if (page === 'account') {
            // Already here
            return;
        }

        // Map pages to routes
        // Assuming ToolApp is at /app and handles these generic pages
        // or we have specific routes. 
        // Since ToolApp handles all these "pages" internally, we likely just want to go to /app
        // and ideally tell it which page to open.
        // For now, let's just go to /app which defaults to dashboard.
        navigate('/app');
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
            <Sidebar currentPage="account" setPage={handleSetPage} />
            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    );
};

export default Layout;
