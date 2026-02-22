import React from 'react';
import MainLayout from '@/components/MainLayout';
import MotivationWidget from '@/components/MotivationWidget';
import NotesEditor from '@/components/NotesEditor';
import AIConsultationChat from '@/components/AIConsultationChat';

export default function DashboardPage() {
    return (
        <MainLayout>
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 mt-1">Your productivity hub. Capture ideas, stay motivated, and focus.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column (Motivation & Notes) */}
                    <div className="space-y-6 flex flex-col">
                        <MotivationWidget />
                        <div className="flex-1">
                            <NotesEditor />
                        </div>
                    </div>

                    {/* Right Column (AI Chat) */}
                    <div className="h-full">
                        <AIConsultationChat />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
