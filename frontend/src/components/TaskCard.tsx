'use client';

import React from 'react';
import { Task } from '@/lib/api';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
}

const priorityConfig = {
    high: { label: 'High', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    medium: { label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    low: { label: 'Low', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

const statusConfig = {
    todo: { label: 'To Do', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: '○' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '◐' },
    done: { label: 'Done', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '●' },
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
    const priority = priorityConfig[task.priority];
    const status = statusConfig[task.status];
    const isDone = task.status === 'done';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isOverdue = () => {
        if (!task.due_date || isDone) return false;
        return new Date(task.due_date) < new Date();
    };

    const nextStatus = (): string => {
        if (task.status === 'todo') return 'in_progress';
        if (task.status === 'in_progress') return 'done';
        return 'todo';
    };

    return (
        <div className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 ${isDone ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className={`text-base font-semibold text-white mb-1 truncate ${isDone ? 'line-through text-white/50' : ''}`}>
                        {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                        <p className="text-sm text-white/50 mb-3 line-clamp-2">
                            {task.description}
                        </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button
                            onClick={() => onStatusChange(task.id, nextStatus())}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${status.color}`}
                            title={`Click to change to ${nextStatus().replace('_', ' ')}`}
                        >
                            <span>{status.icon}</span>
                            {status.label}
                        </button>

                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${priority.color}`}>
                            {priority.label}
                        </span>

                        {task.due_date && (
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${isOverdue() ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/50 border-white/10'}`}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(task)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit task"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete task"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
