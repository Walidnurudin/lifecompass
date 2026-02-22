'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { noteAPI } from '@/lib/api';
import debounce from 'lodash/debounce';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

export default function NotesEditor() {
    const [content, setContent] = useState("");
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial load
    useEffect(() => {
        const loadNote = async () => {
            try {
                const res = await noteAPI.get();
                setContent(res.note.content || "");
            } catch (error) {
                console.error("Failed to load note:", error);
                setStatus('error');
            } finally {
                setIsLoaded(true);
            }
        };
        loadNote();
    }, []);

    // Debounced save function
    const debouncedSave = useCallback(
        // eslint-disable-next-line react-hooks/exhaustive-deps
        debounce(async (text: string) => {
            try {
                setStatus('saving');
                await noteAPI.update(text);
                setStatus('saved');

                // Return to idle after 2 seconds showing success
                setTimeout(() => {
                    setStatus(prev => prev === 'saved' ? 'idle' : prev);
                }, 2000);
            } catch (error) {
                console.error("Failed to save note:", error);
                setStatus('error');
            }
        }, 1500), // Wait 1.5 seconds after typing stops
        []
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setContent(newText);
        debouncedSave(newText);
    };

    if (!isLoaded) {
        return (
            <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
                <Loader2 className="animate-spin text-slate-500" size={24} />
            </div>
        );
    }

    return (
        <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#3b5168] flex items-center justify-between">
                <h3 className="font-semibold text-white">Scratchpad</h3>
                <div className="text-xs font-medium flex items-center gap-1.5 min-w-[80px] justify-end">
                    {status === 'saving' && (
                        <>
                            <Loader2 size={12} className="animate-spin text-teal-400" />
                            <span className="text-teal-400">Saving...</span>
                        </>
                    )}
                    {status === 'saved' && (
                        <>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-emerald-500">Saved</span>
                        </>
                    )}
                    {status === 'error' && (
                        <span className="text-red-400">Save failed</span>
                    )}
                    {status === 'idle' && (
                        <>
                            <Save size={12} className="text-slate-500" />
                            <span className="text-slate-500">Auto-saved</span>
                        </>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4">
                <textarea
                    value={content}
                    onChange={handleChange}
                    placeholder="Write down your thoughts, daily goals, or brain dumps here..."
                    className="w-full h-full bg-transparent text-slate-300 placeholder-slate-600 focus:outline-none resize-none px-2 leading-relaxed"
                    spellCheck="false"
                />
            </div>
        </div>
    );
}
