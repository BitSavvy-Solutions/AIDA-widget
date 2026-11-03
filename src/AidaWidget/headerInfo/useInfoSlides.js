/* src/AidaWidget/headerInfo/useInfoSlides.js */
import { useMemo } from 'react';
import { useChatStats } from './useChatStats';

/**
 * Builds the ordered slide list for the header info display.
 * Always returns at least 2 slides so the carousel is always swipeable.
 */
export const useInfoSlides = ({ messages = [] }) => {
    const stats = useChatStats(messages);

    return useMemo(() => {
        const slides = [];

        // --- Slide 1: cumulative cost of this chat (always present) ---
        slides.push({
            id: 'chat-cost',
            kind: 'cost',
            label: 'Chat Cost',
            value: stats.totalCostLabel,
        });

        // --- Slide 2: token usage (always present; shows 0 until used) ---
        slides.push({
            id: 'chat-tokens',
            kind: 'tokens',
            label: 'Tokens',
            value: stats.totalTokensLabel,
        });

        // --- Slide 3: response count (always present — cheap and always meaningful) ---
        slides.push({
            id: 'chat-msgs',
            kind: 'messages',
            label: 'Responses',
            value: String(stats.botMessages),
        });

        // --- Conditional extras (only when relevant) ---
        if (stats.webSearches > 0) {
            slides.push({
                id: 'chat-web',
                kind: 'web',
                label: 'Web Searches',
                value: String(stats.webSearches),
            });
        }

        // --- Future slides go here (monthly spend, ads) ---

        return slides;
    }, [stats]);
};