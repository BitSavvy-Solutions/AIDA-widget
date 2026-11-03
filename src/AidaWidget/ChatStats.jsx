/* src/AidaWidget/ChatStats.jsx */
import React, { useMemo } from 'react';
import ChatStatsDisplay from './ChatStatsDisplay';

// Message-level formatting helpers. Kept at module scope so they are not
// recreated on every render; they are pure and stateless.
const formatCost = (cost) => {
    if (!cost || cost <= 0) return '$0.0000';
    if (cost < 0.001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(5)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    if (cost < 100) return `$${cost.toFixed(2)}`;
    return `$${cost.toFixed(0)}`;
};

const compactNumber = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
};

const buildBaseSlides = (messages) => {
    let totalCost = 0;
    let totalTokens = 0;
    let messageCount = 0;

    for (const m of messages) {
        if (m.meta?.cost) totalCost += m.meta.cost;
        const tu = m.meta?.tokenUsage;
        if (tu) totalTokens += tu.total_tokens || 0;
        if (m.sender === 'user' || m.sender === 'bot') messageCount += 1;
    }

    return [
        { id: 'chat-cost', label: 'Chat Cost',  value: formatCost(totalCost) },
        { id: 'tokens',    label: 'Tokens Used', value: compactNumber(totalTokens) },
        { id: 'messages',  label: 'Messages',   value: String(messageCount) },
    ];
};

/**
 * Owns the "what do we actually show in the header panel?" question.
 *
 * AidaWidget no longer needs to carry slide formatting math — it just passes
 * in the messages it already has. When ads or host-provided stats land, we
 * either push entries through `extraSlides` or swap this component out
 * entirely; neither the header nor the widget shell has to change.
 *
 * `extraSlides` accepts the same slide shape as ChatStatsDisplay:
 *   { id, label, value }   or   { id, content: <Anything /> }
 */
const ChatStats = ({ messages = [], extraSlides = [] }) => {
    const slides = useMemo(
        () => [...buildBaseSlides(messages), ...extraSlides],
        [messages, extraSlides],
    );

    return <ChatStatsDisplay slides={slides} />;
};

export default ChatStats;