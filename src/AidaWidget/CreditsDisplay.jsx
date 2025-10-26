// src/AidaWidget/CreditsDisplay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { fetchUserCredits } from './utils/creditsApi';

const CreditsDisplay = ({ userId, lastCost, theme = 'dark' }) => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(false); // ✨ ADDED: State to toggle balance visibility
  const [balance, setBalance] = useState(null);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [showDeduction, setShowDeduction] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const prevCostRef = useRef(0);
  const animationRef = useRef(null);

  // Format number to fixed decimal places with proper display
  const formatCredits = (value) => {
    if (value === null || value === undefined) return '$0.00000';
    const num = typeof value === 'number' ? value : 0;

    // For very small numbers, show more precision
    if (Math.abs(num) < 0.00001 && num !== 0) {
      return `$${num.toFixed(7)}`;
    }
    return `$${num.toFixed(5)}`;
  };

  // ✅ MODIFIED: Fetch balance only when it becomes visible
  useEffect(() => {
    const loadBalance = async () => {
      if (!userId) {
        setBalance(0);
        setDisplayBalance(0);
        return;
      }
      
      // Show loading state while fetching
      setBalance(null);
      const fetchedBalance = await fetchUserCredits(userId);
      const newBalance = fetchedBalance !== null ? fetchedBalance : 0;
      setBalance(newBalance);
      setDisplayBalance(newBalance);
    };

    if (isBalanceVisible) {
      loadBalance();
    }
  }, [userId, isBalanceVisible]);

  // ✅ MODIFIED: Handle cost changes only when balance is visible
  useEffect(() => {
    if (!isBalanceVisible) return; // Don't process deductions if hidden

    if (lastCost > 0 && lastCost !== prevCostRef.current) {
      prevCostRef.current = lastCost;

      // Show deduction amount
      setDeductionAmount(lastCost);
      setShowDeduction(true);

      // After 2 seconds, apply deduction and fetch updated balance
      setTimeout(async () => {
        setShowDeduction(false);

        // Optimistically update the balance
        const newBalance = (balance || 0) - lastCost;
        setBalance(newBalance);

        // Animate the balance change
        animateBalanceChange(displayBalance, newBalance);

        // Fetch actual balance from server (async)
        if (userId) {
          const actualBalance = await fetchUserCredits(userId);
          if (actualBalance !== null && actualBalance < newBalance) {
            setBalance(actualBalance);
            if (Math.abs(actualBalance - newBalance) > 0.00001) {
              animateBalanceChange(newBalance, actualBalance);
            }
          }
        }
      }, 2000);
    }
  }, [lastCost, balance, displayBalance, userId, isBalanceVisible]); // Added isBalanceVisible dependency

  // Smooth animation for balance changes
  const animateBalanceChange = (from, to) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 500; // ms
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuad = progress * (2 - progress);
      const current = from + (to - from) * easeOutQuad;

      setDisplayBalance(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const isDark = theme === 'dark';

  // ✨ ADDED: Conditional rendering for showing/hiding balance
  if (!isBalanceVisible) {
    return (
      <button
        onClick={() => setIsBalanceVisible(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white shadow-sm"
        title="Show account balance"
      >
        Show Balance
      </button>
    );
  }

  const balanceColor = displayBalance < 0
    ? 'text-red-400'
    : displayBalance === 0
      ? 'text-gray-400'
      : 'text-green-400';

  return (
    // ✨ MODIFIED: Wrapped in a flex container to include the "Hide" button
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-start relative">
        <div className="text-xs opacity-60 leading-tight">
          Balance
        </div>
        <div className={`text-xs font-mono font-semibold leading-tight ${balanceColor} transition-colors duration-300`}>
          {balance === null ? 'Loading...' : formatCredits(displayBalance)}
        </div>

        {/* Deduction indicator */}
        {showDeduction && (
          <div className={`absolute top-full mt-1 text-xs font-mono text-red-400 animate-pulse whitespace-nowrap`}>
            - {formatCredits(deductionAmount)}
          </div>
        )}
      </div>
      {/* ✨ ADDED: Hide button */}
      <button
        onClick={() => setIsBalanceVisible(false)}
        className="text-xs font-medium text-gray-400 hover:text-white transition-colors px-1 py-0.5 rounded"
        title="Hide balance"
      >
        Hide
      </button>
    </div>
  );
};

export default CreditsDisplay;