'use client';

import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const MOTIVATION_QUOTES = [
    "Your potential is endless. Now go out and do what you were created to do.",
    "Don't stop when you're tired. Stop when you're done.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "It does not matter how slowly you go as long as you do not stop.",
    "Hard work beats talent when talent doesn't work hard.",
    "Believe you can and you're halfway there.",
    "The only bad workout is the one that didn't happen.",
    "Focus on being productive instead of busy.",
    "No excuses. Just execute.",
    "Great things never come from comfort zones.",
    "If it doesn't challenge you, it doesn't change you.",
    "Do something today that your future self will thank you for.",
];

export default function MotivationWidget() {
    const [quote, setQuote] = useState("");

    useEffect(() => {
        const fetchQuote = () => {
            const cachedQuoteStr = localStorage.getItem('lifecompass_motivation');
            let cachedQuote = cachedQuoteStr ? JSON.parse(cachedQuoteStr) : null;

            const now = new Date().getTime();
            const sixHoursInMs = 6 * 60 * 60 * 1000;

            if (!cachedQuote || (now - cachedQuote.timestamp) > sixHoursInMs) {
                // Pick a new random quote
                const newQuote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
                cachedQuote = { text: newQuote, timestamp: now };
                localStorage.setItem('lifecompass_motivation', JSON.stringify(cachedQuote));
            }

            setQuote(cachedQuote.text);
        };

        fetchQuote();

        // Check every minute if 6 hours have passed (so it updates if left open)
        const interval = setInterval(fetchQuote, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!quote) return null;

    return (
        <div className="bg-[#1a2636] border border-[#3b5168] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[160px]">
            <Quote size={48} className="text-[#3b5168] absolute -top-2 -left-2 opacity-30" />
            <div className="relative z-10">
                <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">Fuel for the journey</p>
                <p className="text-xl md:text-2xl font-serif text-slate-200 italic leading-relaxed">
                    &quot;{quote}&quot;
                </p>
            </div>
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
}
