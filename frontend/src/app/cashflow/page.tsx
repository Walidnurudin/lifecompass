'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import CashFlowModal from '@/components/CashFlowModal';
import { cashFlowAPI, CashFlow, CreateCashFlowData, UpdateCashFlowData } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Plus, ArrowUpDown } from 'lucide-react';

const COLORS = ['#2daaaa', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

export default function CashFlowPage() {
    const [entries, setEntries] = useState<CashFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CashFlow | null>(null);

    // Filters
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

    // Sorting
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const fetchCashFlows = useCallback(async () => {
        try {
            setLoading(true);
            const data = await cashFlowAPI.getAll({
                month: selectedMonth,
                year: selectedYear,
                sort_by: sortBy,
                order: sortOrder
            });
            setEntries(data.cash_flows || []);
        } catch (err) {
            console.error('Failed to fetch cash flow:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, sortBy, sortOrder]);

    useEffect(() => {
        fetchCashFlows();
    }, [fetchCashFlows]);

    const handleCreate = async (data: CreateCashFlowData | UpdateCashFlowData) => {
        await cashFlowAPI.create(data as CreateCashFlowData);
        fetchCashFlows();
    };

    const handleEdit = async (data: CreateCashFlowData | UpdateCashFlowData) => {
        if (!editingEntry) return;
        await cashFlowAPI.update(editingEntry.id, data as UpdateCashFlowData);
        fetchCashFlows();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this transaction?')) return;
        await cashFlowAPI.delete(id);
        setModalOpen(false);
        fetchCashFlows();
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc'); // Default to desc when switching column
        }
    };

    // Calculate chart data
    const chartData = useMemo(() => {
        const incomeData: Record<string, number> = {};
        const outcomeData: Record<string, number> = {};
        let totalInc = 0;
        let totalOut = 0;

        entries.forEach(e => {
            if (e.type === 'income') {
                incomeData[e.category] = (incomeData[e.category] || 0) + e.amount;
                totalInc += e.amount;
            } else {
                outcomeData[e.category] = (outcomeData[e.category] || 0) + e.amount;
                totalOut += e.amount;
            }
        });

        const formatForPie = (data: Record<string, number>) =>
            Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        return {
            income: formatForPie(incomeData),
            outcome: formatForPie(outcomeData),
            totalIncome: totalInc,
            totalOutcome: totalOut,
            balance: totalInc - totalOut
        };
    }, [entries]);

    return (
        <MainLayout>
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Cash Flow</h1>
                        <p className="text-slate-400 mt-1">Track your monthly income and expenses.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-[#1a2636] border border-[#3b5168] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = String(i + 1).padStart(2, '0');
                                const name = new Date(2000, i, 1).toLocaleString('default', { month: 'short' });
                                return <option key={m} value={m}>{name}</option>;
                            })}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-[#1a2636] border border-[#3b5168] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = now.getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>

                        <button
                            onClick={() => { setEditingEntry(null); setModalOpen(true); }}
                            className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-4 py-2 flex items-center gap-2 transition-colors ml-2"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Add Entry</span>
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6">
                        <p className="text-slate-400 text-sm font-medium mb-1">Total Income</p>
                        <p className="text-2xl font-bold text-emerald-400">Rp {chartData.totalIncome.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6">
                        <p className="text-slate-400 text-sm font-medium mb-1">Total Outcome</p>
                        <p className="text-2xl font-bold text-red-400">Rp {chartData.totalOutcome.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-slate-400 text-sm font-medium mb-1">Net Balance</p>
                            <p className={`text-2xl font-bold ${chartData.balance >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                                Rp {chartData.balance.toLocaleString('id-ID')}
                            </p>
                        </div>
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 ${chartData.balance >= 0 ? 'bg-teal-500' : 'bg-red-500'}`}></div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                    <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6 flex flex-col">
                        <h3 className="text-white font-medium mb-4">Outcome Distribution</h3>
                        <div className="flex-1 min-h-0">
                            {chartData.outcome.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.outcome} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                                            {chartData.outcome.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number | undefined) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`} contentStyle={{ backgroundColor: '#162130', borderColor: '#3b5168', color: '#fff' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No outcome data this month</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6 flex flex-col">
                        <h3 className="text-white font-medium mb-4">Income Distribution</h3>
                        <div className="flex-1 min-h-0">
                            {chartData.income.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.income} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2}>
                                            {chartData.income.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number | undefined) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`} contentStyle={{ backgroundColor: '#162130', borderColor: '#3b5168', color: '#fff' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No income data this month</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs uppercase bg-[#243447] text-slate-400 border-b border-[#3b5168]">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                                        <div className="flex items-center gap-1">Date <ArrowUpDown size={14} /></div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
                                        <div className="flex items-center gap-1">Title <ArrowUpDown size={14} /></div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                                        <div className="flex items-center gap-1">Category <ArrowUpDown size={14} /></div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('type')}>
                                        <div className="flex items-center gap-1">Type <ArrowUpDown size={14} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end gap-1"><ArrowUpDown size={14} /> Amount</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                                ) : entries.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No transactions found for this month.</td></tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="border-b border-[#3b5168]/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                                            onClick={() => { setEditingEntry(entry); setModalOpen(true); }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">{entry.date ? entry.date.split('T')[0] : 'N/A'}</td>
                                            <td className="px-6 py-4 font-medium text-white">{entry.title}</td>
                                            <td className="px-6 py-4 capitalize">
                                                <span className="bg-slate-700/50 px-2 py-1 rounded text-xs text-slate-300">{entry.category}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                                                    {entry.type === 'income' ? '+ Income' : '- Outcome'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium ${entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {entry.type === 'income' ? '+' : '-'}Rp {entry.amount.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <CashFlowModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingEntry(null); }}
                onSubmit={editingEntry ? handleEdit : handleCreate}
                onDelete={handleDelete}
                entry={editingEntry}
            />
        </MainLayout>
    );
}
