"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check } from 'lucide-react';
import { generateTOTP } from '@/lib/totp';

export default function TOTPDisplay({ secret }: { secret: string }) {
  const [code, setCode] = useState<string>("------");
  const [progress, setProgress] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const update = async () => {
      try {
        const epoch = Math.floor(Date.now() / 1000);
        const timeRemaining = 30 - (epoch % 30);
        
        // Progress percentage for visual circle/bar (100 -> 0)
        setProgress((timeRemaining / 30) * 100);

        // Update code only when we have 30s or at the start
        const newCode = await generateTOTP(secret);
        if (mounted) setCode(newCode);
      } catch (err) {
        console.error("TOTP Gen Error:", err);
        if (mounted) setCode("ERROR");
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [secret]);

  const copyCode = () => {
    if (code === "------" || code === "ERROR") return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpiring = progress < 20;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ position: 'relative', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <circle 
            cx="10" cy="10" r="8" fill="none" 
            stroke={isExpiring ? "var(--accent-red)" : "var(--accent-blue)"} 
            strokeWidth="2"
            strokeDasharray="50.26" 
            strokeDashoffset={50.26 * (1 - progress / 100)} 
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
      </div>
      <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px', color: isExpiring ? 'var(--accent-red)' : '#fff' }}>
        {code.substring(0,3)} {code.substring(3)}
      </div>
      <button 
        onClick={copyCode}
        className="btn btn-secondary" 
        style={{ padding: '0.25rem 0.5rem', background: copied ? 'var(--accent-green)' : 'transparent', color: copied ? '#fff' : 'inherit' }}
        title="Copy 2FA Code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
