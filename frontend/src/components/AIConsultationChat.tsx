'use client';

import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '@/lib/api';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

export default function AIConsultationChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'welcome',
        role: 'ai',
        content: "Hi! I'm your productivity coach. Need help prioritizing your day, overcoming procrastination, or sticking to your goals? Let's talk!"
    }]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput(""); // clear input early for better UX

        // Add user message to UI immediately
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: userMsg,
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const res = await aiAPI.consult(userMsg);

            // Add AI response to UI
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: res.reply,
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to get AI response:", error);
            // Add error message to UI
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "Oops! Something went wrong communicating with the server. Are checking my API keys? Try again later!"
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl flex flex-col h-[500px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#3b5168] flex items-center gap-2">
                <Bot className="text-teal-400" size={20} />
                <h3 className="font-semibold text-white">AI Motivation Coach</h3>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${msg.role === 'user' ? 'bg-teal-600' : 'bg-[#243447] border border-[#3b5168]'}`}>
                            {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-teal-400" />}
                        </div>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-[#243447] text-slate-200 border border-[#3b5168] rounded-tl-none'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 flex-row">
                        <div className="w-8 h-8 rounded-full bg-[#243447] border border-[#3b5168] flex shrink-0 items-center justify-center">
                            <Bot size={16} className="text-teal-400" />
                        </div>
                        <div className="bg-[#243447] text-slate-200 border border-[#3b5168] rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-teal-400" />
                            <span className="text-sm">Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#3b5168]">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask for advice..."
                        className="w-full bg-[#243447] border border-[#3b5168] text-white rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-teal-500 transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:hover:bg-teal-600"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
