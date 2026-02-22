'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#162130]">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return <>{children}</>;

    return (
        <div className="min-h-screen bg-[#162130] flex font-sans text-slate-100">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between h-16 px-4 bg-[#243447] border-b border-[#3b5168] shrink-0 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-semibold text-slate-200">LifeCompass</span>
                    <div className="w-8" /> {/* Balance spacer */}
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
