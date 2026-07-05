"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, FileText, CheckSquare, Calendar as CalendarIcon, 
  MessageSquare, Video, Shield, Key, Folder, Home, Settings,
  ArrowRight, Loader2
} from 'lucide-react';
import { VaultPasswordModal, requireVaultPassword } from '@/lib/vault-password';
import { deriveKey, decryptTextWithAES, base64ToArrayBuffer } from '@/lib/crypto';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Deep Search State
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [deepSearchStatus, setDeepSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [deepSearchCommands, setDeepSearchCommands] = useState<CommandItem[]>([]);
  
  // Vault Modal State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultModalResolve, setVaultModalResolve] = useState<(val: string | null) => void>(() => () => {});

  const baseCommands: CommandItem[] = [
    // Navigation
    { id: 'nav-home', title: 'Go to Dashboard', category: 'Navigation', icon: <Home size={16} />, action: () => router.push('/dashboard') },
    { id: 'nav-vault', title: 'Cloud Vault', category: 'Navigation', icon: <Folder size={16} />, action: () => router.push('/dashboard/vault') },
    { id: 'nav-notes', title: 'Secure Notes', category: 'Navigation', icon: <FileText size={16} />, action: () => router.push('/dashboard/notes') },
    { id: 'nav-tasks', title: 'Kanban Tasks', category: 'Navigation', icon: <CheckSquare size={16} />, action: () => router.push('/dashboard/tasks') },
    { id: 'nav-calendar', title: 'Calendar', category: 'Navigation', icon: <CalendarIcon size={16} />, action: () => router.push('/dashboard/calendar') },
    { id: 'nav-chat', title: 'E2EE Chat', category: 'Navigation', icon: <MessageSquare size={16} />, action: () => router.push('/dashboard/chat') },
    { id: 'nav-calls', title: 'Video Calls', category: 'Navigation', icon: <Video size={16} />, action: () => router.push('/dashboard/calls') },
    { id: 'nav-passwords', title: 'Password Manager', category: 'Navigation', icon: <Key size={16} />, action: () => router.push('/dashboard/passwords') },
    { id: 'nav-security', title: 'Security Center', category: 'Navigation', icon: <Shield size={16} />, action: () => router.push('/dashboard/security') },
    { id: 'nav-settings', title: 'Settings', category: 'Navigation', icon: <Settings size={16} />, action: () => router.push('/dashboard/settings') },
    // Actions
    { id: 'action-note', title: 'Create New Note', category: 'Quick Actions', icon: <FileText size={16} />, action: () => router.push('/dashboard/notes') },
    { id: 'action-task', title: 'Create New Task', category: 'Quick Actions', icon: <CheckSquare size={16} />, action: () => router.push('/dashboard/tasks') },
    { id: 'action-call', title: 'Start a Call', category: 'Quick Actions', icon: <Video size={16} />, action: () => router.push('/dashboard/calls') },
  ];

  const handlePromptPassword = () => {
    return new Promise<string | null>((resolve) => {
      setVaultModalResolve(() => resolve);
      setIsVaultModalOpen(true);
    });
  };

  const handleVaultModalSubmit = (password: string) => {
    setIsVaultModalOpen(false);
    vaultModalResolve(password);
  };

  const handleVaultModalCancel = () => {
    setIsVaultModalOpen(false);
    vaultModalResolve(null);
  };

  // Trigger Deep Search
  useEffect(() => {
    if (query.startsWith("?") && deepSearchStatus === "idle") {
      setIsDeepSearch(true);
      performDeepSearch();
    } else if (!query.startsWith("?")) {
      setIsDeepSearch(false);
    }
  }, [query]);

  const performDeepSearch = async () => {
    setDeepSearchStatus("loading");
    
    const pwd = await requireVaultPassword(handlePromptPassword);
    if (!pwd) {
      setDeepSearchStatus("error");
      return;
    }

    try {
      // 1. Fetch Salt
      const saltRes = await fetch("/api/vault/salt");
      const saltData = await saltRes.json();
      if (!saltData.success) throw new Error("No salt");
      
      const salt = new Uint8Array(base64ToArrayBuffer(saltData.salt));
      const key = await deriveKey(pwd, salt);

      // 2. Fetch Notes
      const notesRes = await fetch("/api/notes");
      const notesData = await notesRes.json();
      const rawNotes = notesData.notes || [];

      // 3. Decrypt in memory
      const decryptedCommands: CommandItem[] = [];

      for (const n of rawNotes) {
        if (n.encrypted_title) {
          try {
            const plainTitle = await decryptTextWithAES(key, n.encrypted_title);
            let plainContent = "";
            if (n.encrypted_content) {
              plainContent = await decryptTextWithAES(key, n.encrypted_content);
            }
            
            // We append the content to the title to allow fuzzy matching, but hide it in UI.
            decryptedCommands.push({
              id: `ds-note-${n.id}`,
              title: plainTitle,
              category: `Deep Search: Notes`, // ${plainContent.substring(0,20)}...
              icon: <FileText size={16} color="var(--accent-blue)" />,
              action: () => router.push(`/dashboard/notes/${n.id}`)
            });
          } catch (e) {
            console.error("Deep Search: Failed to decrypt note", n.id);
          }
        }
      }

      setDeepSearchCommands(decryptedCommands);
      setDeepSearchStatus("ready");

      // Refocus input since modal might have stolen it
      setTimeout(() => inputRef.current?.focus(), 50);

    } catch (err) {
      console.error(err);
      setDeepSearchStatus("error");
    }
  };

  // Filter logic
  let filteredCommands: CommandItem[] = [];
  
  if (isDeepSearch && deepSearchStatus === "ready") {
    const sq = query.substring(1).trim().toLowerCase();
    if (sq.length === 0) {
      filteredCommands = deepSearchCommands;
    } else {
      filteredCommands = deepSearchCommands.filter(cmd => 
        cmd.title.toLowerCase().includes(sq)
      );
    }
  } else if (!isDeepSearch) {
    filteredCommands = baseCommands.filter(cmd => 
      cmd.title.toLowerCase().includes(query.toLowerCase()) || 
      cmd.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setIsDeepSearch(false);
      if (deepSearchStatus !== "idle" && deepSearchStatus !== "ready") {
        setDeepSearchStatus("idle");
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If Vault Modal is open, let it handle keys
    if (isVaultModalOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <VaultPasswordModal
        isOpen={isVaultModalOpen}
        onClose={handleVaultModalCancel}
        onSubmit={handleVaultModalSubmit}
      />
      
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          zIndex: 99998, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '10vh'
        }}
        onClick={() => !isVaultModalOpen && setIsOpen(false)}
      >
        <div 
          style={{
            width: '100%', maxWidth: '600px', backgroundColor: '#1a1d24',
            borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid #333', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #333' }}>
            {isDeepSearch && deepSearchStatus === "loading" ? (
              <Loader2 size={20} color="#3498db" className="animate-spin" style={{ marginRight: '12px' }} />
            ) : (
              <Search size={20} color={isDeepSearch ? "#3498db" : "#888"} style={{ marginRight: '12px' }} />
            )}
            <input 
              ref={inputRef}
              type="text"
              placeholder="Search commands... (Type '?' for Deep E2EE Search)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isVaultModalOpen}
              style={{
                width: '100%', background: 'transparent', border: 'none', color: isDeepSearch ? '#3498db' : '#fff',
                fontSize: '16px', outline: 'none'
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', backgroundColor: '#222', padding: '4px 8px', borderRadius: '4px' }}>
              ESC
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
            {isDeepSearch && deepSearchStatus === "loading" ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#3498db' }}>
                Decrypting secure index in memory...
              </div>
            ) : isDeepSearch && deepSearchStatus === "error" ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--accent-red)' }}>
                Deep Search Failed. Vault Locked.
              </div>
            ) : filteredCommands.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                No results found for "{query}"
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div 
                    key={cmd.id}
                    onClick={() => { cmd.action(); setIsOpen(false); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px 16px',
                      cursor: 'pointer', backgroundColor: isSelected ? '#2a2f3a' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? '#3498db' : 'transparent'}`,
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '8px', 
                      backgroundColor: isSelected ? '#3498db20' : '#222',
                      color: isSelected ? '#3498db' : '#888',
                      marginRight: '12px'
                    }}>
                      {cmd.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isSelected ? '#fff' : '#ccc', fontSize: '14px', fontWeight: 500 }}>
                        {cmd.title}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
                        {cmd.category}
                      </div>
                    </div>
                    {isSelected && (
                      <ArrowRight size={16} color="#3498db" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div style={{ padding: '12px 16px', borderTop: '1px solid #333', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#14161a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '12px' }}>
              <kbd style={{ backgroundColor: '#222', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>↑</kbd>
              <kbd style={{ backgroundColor: '#222', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>↓</kbd>
              <span>Navigate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '12px' }}>
              <kbd style={{ backgroundColor: '#222', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>↵</kbd>
              <span>Select</span>
            </div>
            {isDeepSearch && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#3498db', fontSize: '12px' }}>
                <Shield size={14} /> Zero-Knowledge Mode
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
