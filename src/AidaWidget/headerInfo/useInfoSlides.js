/* src/AidaWidget/headerInfo/useInfoSlides.js */
import { useMemo } from 'react';
import { useChatStats } from './useChatStats';

/**
 * Builds the ordered slide list for the header info display.
 * Always returns at least 2 slides so the carousel is always swipeable.
 */
export const useInfoSlides = ({ messages = [], credits = null }) => {
    const stats = useChatStats(messages);
    return useMemo(() => {
        const slides = [
            { id: 'chat-cost', kind: 'cost', label: 'Chat Cost', value: stats.totalCostLabel },
        ];
        if (credits?.isAvailable) {
            slides.push({ id: 'credits', kind: 'cost', label: 'Credits', value: credits.balanceLabel });
        }
        slides.push({ id: 'chat-tokens', kind: 'tokens', label: 'Tokens', value: stats.totalTokensLabel });
        slides.push({ id: 'chat-msgs', kind: 'messages', label: 'Responses', value: String(stats.botMessages) });
        if (stats.webSearches > 0) {
            slides.push({ id: 'chat-web', kind: 'web', label: 'Web Searches', value: String(stats.webSearches) });
        }
        return slides;
    }, [stats, credits]);
};