// src/AidaWidget/CreditsDisplay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { fetchUserCredits } from './utils/creditsApi';

const CreditsDisplay = ({ userId, lastCost, theme = 'dark' }) => {
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
  
  // Fetch initial balance on mount or when userId changes
  useEffect(() => {
    const loadBalance = async () => {
      if (!userId) {
        setBalance(0);
        setDisplayBalance(0);
        return;
      }
      
      const fetchedBalance = await fetchUserCredits(userId);
      const newBalance = fetchedBalance !== null ? fetchedBalance : 0;
      setBalance(newBalance);
      setDisplayBalance(newBalance);
    };
    
    loadBalance();
  }, [userId]);
  
  // Handle cost changes and deduction animation
  useEffect(() => {
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
          if (actualBalance !== null) {
            setBalance(actualBalance);
            // If there's a discrepancy, smoothly adjust
            if (Math.abs(actualBalance - newBalance) > 0.00001) {
              animateBalanceChange(newBalance, actualBalance);
            }
          }
        }
      }, 2000);
    }
  }, [lastCost, balance, displayBalance, userId]);
  
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
      
      // Easing function
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
  const balanceColor = displayBalance < 0 
    ? 'text-red-400' 
    : displayBalance === 0 
    ? 'text-gray-400' 
    : 'text-green-400';
  
  return (
    <div className="flex flex-col items-start relative">
      <div className="text-xs opacity-60 leading-tight">
        Balance
      </div>
      <div className={`text-xs font-mono font-semibold leading-tight ${balanceColor} transition-colors duration-300`}>
        {balance === null ? '$-.-----' : formatCredits(displayBalance)}
      </div>
      
      {/* Deduction indicator */}
      {showDeduction && (
        <div className={`absolute top-full mt-1 text-xs font-mono text-red-400 animate-pulse whitespace-nowrap`}>
          - {formatCredits(deductionAmount)}
        </div>
      )}
    </div>
  );
};

export default CreditsDisplay;