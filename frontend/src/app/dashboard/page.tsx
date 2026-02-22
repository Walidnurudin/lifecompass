import React from 'react';
import MainLayout from '@/components/MainLayout';

export default function DashboardPage() {
    return (
        <MainLayout>
            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
                <p className="text-slate-400">Welcome back. Select &quot;Calendar&quot; or &quot;Cash Flow&quot; from the sidebar to get started.</p>
            </div>
        </MainLayout>
    );
}
