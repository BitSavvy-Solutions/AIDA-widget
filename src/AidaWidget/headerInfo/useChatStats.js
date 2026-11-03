/* src/AidaWidget/headerInfo/useChatStats.js */
import { useMemo } from 'react';

const formatCost = (n) => {
    if (!n || n <= 0) return '$0.0000';
    if (n < 0.01) return `$${n.toFixed(4)}`;
    if (n < 1) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(2)}`;
};

const formatCompact = (n) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const useChatStats = (messages = []) => {
    return useMemo(() => {
        let totalCost = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let reasoningTokens = 0;
        let botMessages = 0;
        let webSearches = 0;

        for (const m of messages) {
            if (m.sender !== 'bot' || !m.meta) continue;
            botMessages += 1;
            totalCost += m.meta.cost || 0;

            const tu = m.meta.tokenUsage;
            if (tu) {
                inputTokens += tu.input_tokens || 0;
                outputTokens += tu.output_tokens || 0;
                reasoningTokens += tu.output_token_details?.reasoning || 0;
            }
            if (m.meta.webSearchEnabled) webSearches += 1;
        }

        return {
            totalCost,
            totalCostLabel: formatCost(totalCost),
            inputTokens,
            outputTokens,
            reasoningTokens,
            totalTokens: inputTokens + outputTokens,
            totalTokensLabel: formatCompact(inputTokens + outputTokens),
            botMessages,
            webSearches,
        };
    }, [messages]);
};