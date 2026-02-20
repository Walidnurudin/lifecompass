'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { taskAPI, Task, CreateTaskData, UpdateTaskData, TaskQueryParams } from '@/lib/api';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';

export default function DashboardPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params: TaskQueryParams = {};
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            if (sortBy) params.sort_by = sortBy;
            if (sortOrder) params.order = sortOrder;

            const data = await taskAPI.getAll(params);
            setTasks(data.tasks || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterPriority, sortBy, sortOrder]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchTasks();
        }
    }, [user, authLoading, router, fetchTasks]);

    const handleCreate = async (data: CreateTaskData | UpdateTaskData) => {
        await taskAPI.create(data as CreateTaskData);
        fetchTasks();
    };

    const handleEdit = async (data: CreateTaskData | UpdateTaskData) => {
        if (!editingTask) return;
        await taskAPI.update(editingTask.id, data as UpdateTaskData);
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task?')) return;
        await taskAPI.delete(id);
        fetchTasks();
    };

    const handleStatusChange = async (id: string, status: string) => {
        await taskAPI.update(id, { status });
        fetchTasks();
    };

    const openCreateModal = () => {
        setEditingTask(null);
        setModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setModalOpen(true);
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    // Stats
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a1a]">
            {/* Gradient bg */}
            <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-teal-600/10 to-transparent pointer-events-none" />

            {/* Header */}
            <header className="relative border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">
                        <span className="text-teal-400">✦</span> <span className="text-teal-400">Life</span>Compass
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-white/40">{user.email}</span>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-white/40 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative max-w-6xl mx-auto px-6 py-8">
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{totalTasks}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                        <p className="text-xs text-blue-400/60 uppercase tracking-wider mb-1">In Progress</p>
                        <p className="text-2xl font-bold text-blue-400">{inProgressTasks}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                        <p className="text-xs text-emerald-400/60 uppercase tracking-wider mb-1">Completed</p>
                        <p className="text-2xl font-bold text-emerald-400">{doneTasks}</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Task
                    </button>

                    <div className="flex-1" />

                    {/* Filters */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer min-w-[130px]"
                    >
                        <option value="" className="bg-[#1a1a2e]">All Status</option>
                        <option value="todo" className="bg-[#1a1a2e]">To Do</option>
                        <option value="in_progress" className="bg-[#1a1a2e]">In Progress</option>
                        <option value="done" className="bg-[#1a1a2e]">Done</option>
                    </select>

                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer min-w-[130px]"
                    >
                        <option value="" className="bg-[#1a1a2e]">All Priority</option>
                        <option value="high" className="bg-[#1a1a2e]">High</option>
                        <option value="medium" className="bg-[#1a1a2e]">Medium</option>
                        <option value="low" className="bg-[#1a1a2e]">Low</option>
                    </select>

                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [s, o] = e.target.value.split('-');
                            setSortBy(s);
                            setSortOrder(o);
                        }}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer min-w-[160px]"
                    >
                        <option value="created_at-desc" className="bg-[#1a1a2e]">Newest First</option>
                        <option value="created_at-asc" className="bg-[#1a1a2e]">Oldest First</option>
                        <option value="due_date-asc" className="bg-[#1a1a2e]">Due Date (Earliest)</option>
                        <option value="due_date-desc" className="bg-[#1a1a2e]">Due Date (Latest)</option>
                        <option value="priority-asc" className="bg-[#1a1a2e]">Priority (High→Low)</option>
                        <option value="priority-desc" className="bg-[#1a1a2e]">Priority (Low→High)</option>
                    </select>
                </div>

                {/* Task list */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-lg font-medium text-white/60 mb-2">No tasks yet</h3>
                        <p className="text-sm text-white/30 mb-6">Create your first task to get started</p>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Task
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {tasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            <TaskModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingTask(null);
                }}
                onSubmit={editingTask ? handleEdit : handleCreate}
                task={editingTask}
            />
        </div>
    );
}
