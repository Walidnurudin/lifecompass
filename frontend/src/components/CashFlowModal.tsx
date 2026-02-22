'use client';

import React, { useState, useEffect } from 'react';
import { CashFlow, CreateCashFlowData, UpdateCashFlowData } from '@/lib/api';

interface CashFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCashFlowData | UpdateCashFlowData) => Promise<void>;
    onDelete?: (id: string) => void;
    entry?: CashFlow | null;
}

const INCOME_CATEGORIES = ['salary', 'business', 'other'];
const OUTCOME_CATEGORIES = ['snacks', 'food', 'internet', 'transportation', 'shopping', 'toiletries', 'other'];

export default function CashFlowModal({ isOpen, onClose, onSubmit, onDelete, entry }: CashFlowModalProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('outcome');
    const [category, setCategory] = useState('food');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!entry;

    useEffect(() => {
        if (entry) {
            setTitle(entry.title);
            setType(entry.type);
            setCategory(entry.category);
            setAmount(entry.amount.toString());
            setDescription(entry.description || '');
            setDate(entry.date ? entry.date.split('T')[0] : '');
        } else {
            setTitle('');
            setType('outcome');
            setCategory('food');
            setAmount('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
        }
        setError('');
    }, [entry, isOpen]);

    // Handle changing type to update default category
    const handleTypeChange = (newType: string) => {
        setType(newType);
        if (newType === 'income') {
            setCategory('salary');
        } else {
            setCategory('food');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data: CreateCashFlowData | UpdateCashFlowData = {
                title: title.trim(),
                type,
                category,
                amount: parsedAmount,
                description: description.trim() || undefined,
                date: date || undefined,
            };
            await onSubmit(data);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const currentCategories = type === 'income' ? INCOME_CATEGORIES : OUTCOME_CATEGORIES;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">
                        {isEdit ? 'Edit Transaction' : 'Add New Transaction'}
                    </h2>
                    <button onClick={onClose} className="p-1 text-white/40 hover:text-white rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50"
                            placeholder="e.g., Grocery Shopping"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Type</label>
                            <select
                                value={type}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-teal-500/50 cursor-pointer"
                            >
                                <option value="outcome" className="bg-[#1a1a2e]">Outcome / Expense</option>
                                <option value="income" className="bg-[#1a1a2e]">Income</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white capitalize focus:outline-none focus:border-teal-500/50 cursor-pointer"
                            >
                                {currentCategories.map(cat => (
                                    <option key={cat} value={cat} className="bg-[#1a1a2e] capitalize">{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-teal-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2 gap-3">
                        <div>
                            {isEdit && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(entry.id)}
                                    className="px-4 py-2 text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors border border-transparent hover:border-red-500/30"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors"
                            >
                                {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Entry'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
