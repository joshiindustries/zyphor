"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Idle timeout in milliseconds (5 minutes)
const IDLE_TIMEOUT = 5 * 60 * 1000;

export default function VaultSecurityManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLockedAlertVisible, setIsLockedAlertVisible] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndLock = useCallback(() => {
    const hasVaultPwd = sessionStorage.getItem("zyphor_vault_pwd");
    const hasMasterKey = sessionStorage.getItem("zyphor_master_key");

    if (hasVaultPwd || hasMasterKey) {
      console.log("VaultSecurityManager: Idle timeout reached. Scrubbing cryptographic keys from memory.");
      
      // Scrub memory
      sessionStorage.removeItem("zyphor_vault_pwd");
      sessionStorage.removeItem("zyphor_master_key");
      
      // Show alert
      setIsLockedAlertVisible(true);
      
      // Redirect to safety if they are deep in a secure module
      if (pathname !== "/dashboard") {
        router.push("/dashboard");
      }

      // Hide alert after 5 seconds
      setTimeout(() => {
        setIsLockedAlertVisible(false);
      }, 5000);
    }
  }, [pathname, router]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Only bother tracking if there's actually a key in memory to protect
    const hasVaultPwd = sessionStorage.getItem("zyphor_vault_pwd");
    const hasMasterKey = sessionStorage.getItem("zyphor_master_key");
    
    if (hasVaultPwd || hasMasterKey) {
      idleTimerRef.current = setTimeout(checkAndLock, IDLE_TIMEOUT);
    }
  }, [checkAndLock]);

  useEffect(() => {
    // Initial setup
    resetIdleTimer();

    // Events that signify user presence
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // We also check every time the pathname changes, to see if we should start tracking
  useEffect(() => {
    resetIdleTimer();
  }, [pathname, resetIdleTimer]);

  return (
    <AnimatePresence>
      {isLockedAlertVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(231, 76, 60, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 500
          }}
        >
          <Lock size={20} />
          <span>Vault automatically locked due to inactivity.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
