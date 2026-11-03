/* src/AidaWidget/headerInfo/useCredits.js */
import { useState, useEffect } from 'react';
import { fetchUserCredits } from '../utils/creditsApi';

const formatBalance = (n) => {
    if (n === null || n === undefined) return '...';
    if (n === 0) return '$0.00';
    if (Math.abs(n) < 0.01) return `$${n.toFixed(5)}`;
    return `$${n.toFixed(2)}`;
};

/**
 * Account credit balance, refreshed after each paid response.
 * @param {string} userId   null/undefined for anonymous => no fetch, no slide
 * @param {*} refreshKey    changes when a response completes (pass lastCost)
 */
export const useCredits = (userId, refreshKey) => {
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        let cancelled = false;
        if (!userId) {
            setBalance(null);
            return () => { cancelled = true; };
        }
        (async () => {
            const fetched = await fetchUserCredits(userId);
            if (!cancelled) setBalance(fetched ?? 0);
        })();
        return () => { cancelled = true; };
    }, [userId, refreshKey]);

    return {
        balance,
        balanceLabel: formatBalance(balance),
        isAvailable: Boolean(userId) && balance !== null,
    };
};