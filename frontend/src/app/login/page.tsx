'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] px-4">
            {/* Gradient orbs */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-teal-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        <span className="text-teal-400">✦</span> <span className="text-teal-400">Life</span>Compass
                    </h1>
                    <p className="text-white/40 mt-2">Welcome back</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-white/40 mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-teal-400 hover:text-teal-300 transition-colors">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
