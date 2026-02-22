'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { taskAPI, Task, CreateTaskData, UpdateTaskData } from '@/lib/api';
import TaskModal from '@/components/TaskModal';
import MainLayout from '@/components/MainLayout';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Default to February 2026 based on the user's mockup requirements, 
    // or just use current date if preferred later.
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchTasks = useCallback(async () => {
        try {
            const data = await taskAPI.getAll(); // fetch all tasks
            setTasks(data.tasks || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchTasks();
        }
    }, [user, fetchTasks]);

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
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await taskAPI.delete(id);
            setModalOpen(false);
            setEditingTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Failed to delete task:', err);
            alert('Failed to delete task');
        }
    };

    const openCreateModal = () => {
        setEditingTask(null);
        setModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setModalOpen(true);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = useMemo(() => {
        return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    }, [currentDate]);

    const firstDayOfMonth = useMemo(() => {
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    }, [currentDate]);

    const getTasksForDate = (day: number) => {
        const targetStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return tasks.filter(t => t.due_date && t.due_date.startsWith(targetStr));
    };

    const getCategoryStyle = (task: Task) => {
        let baseStyle = '';
        switch (task.category) {
            case 'hobby':
                baseStyle = 'bg-emerald-700 text-white';
                break;
            case 'event':
                baseStyle = 'bg-blue-600 text-white';
                break;
            case 'task':
            default:
                baseStyle = 'bg-amber-700 text-white';
        }

        if (!task.due_date) return baseStyle;

        const taskDate = new Date(task.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (task.status === 'done' || taskDate < today) {
            return `${baseStyle} line-through opacity-60`;
        }

        return baseStyle;
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#162130]">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-[#162130] flex flex-col font-sans text-slate-100">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 bg-[#243447] border-b border-[#3b5168]">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        &lt;
                    </button>
                    <h1 className="text-xl font-medium tracking-wide">
                        {MONTHS[currentDate.getMonth()]}, {currentDate.getFullYear()}
                    </h1>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        &gt;
                    </button>
                </header>

                {/* Calendar Container */}
                <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
                    {/* Days of Week */}
                    <div className="grid grid-cols-7 bg-[#2daaaa]/20 rounded-t-lg overflow-hidden border border-[#3b5168] border-b-0">
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="py-3 text-center text-sm font-semibold text-white/90 border-r border-[#3b5168] last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-[#162130] border-l border-[#3b5168] rounded-b-lg shadow-2xl relative">
                        {blanks.map((blank) => (
                            <div key={`blank-${blank}`} className="border-b border-r border-[#3b5168] min-h-[120px] bg-[#1a2636]/50"></div>
                        ))}

                        {dayCells.map((day) => (
                            <div key={day} className="border-b border-r border-[#3b5168] min-h-[120px] p-2 flex flex-col relative group hover:bg-white/[0.02] transition-colors">
                                <span
                                    className={`
                                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                                    ${isToday(day) ? 'bg-[#2daaaa] text-white shadow-lg' : 'text-slate-300'}
                                `}
                                >
                                    {day}
                                </span>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar pb-6">
                                    {getTasksForDate(day).map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => openEditModal(task)}
                                            className={`w-full text-xs font-medium px-2 py-1.5 rounded cursor-pointer truncate transition-all hover:opacity-90 hover:scale-[1.02] ${getCategoryStyle(task)}`}
                                            title={task.title}
                                        >
                                            {task.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Fill remaining cells in the last row to complete the grid */}
                        {Array.from({ length: (7 - ((blanks.length + dayCells.length) % 7)) % 7 }).map((_, i) => (
                            <div key={`end-blank-${i}`} className="border-b border-r border-[#3b5168] min-h-[120px] bg-[#1a2636]/50"></div>
                        ))}
                    </div>
                </main>

                {/* Floating Action Button */}
                <button
                    onClick={openCreateModal}
                    className="fixed bottom-10 right-10 w-16 h-16 bg-[#2daaaa] hover:bg-[#258f8f] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40 border-4 border-[#162130]"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {/* Modal */}
                <TaskModal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingTask(null);
                    }}
                    onSubmit={editingTask ? handleEdit : handleCreate}
                    onDelete={handleDelete}
                    task={editingTask}
                />
            </div>
        </MainLayout>
    );
}
