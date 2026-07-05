"use client";

import { useState, useEffect } from "react";
import { requireVaultPassword, VaultPasswordModal } from "@/lib/vault-password";
import { deriveKey, decryptTextWithAES, base64ToArrayBuffer } from "@/lib/crypto";
import { NoteGrid } from "./NoteGrid";

export function NotesClient({ initialNotes }: { initialNotes: any[] }) {
  const [decryptedNotes, setDecryptedNotes] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(true);

  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultModalResolve, setVaultModalResolve] = useState<(val: string | null) => void>(() => () => {});

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

  useEffect(() => {
    async function decryptAll() {
      setIsDecrypting(true);
      
      const pwd = await requireVaultPassword(handlePromptPassword);
      if (!pwd) {
        setIsDecrypting(false);
        return;
      }

      try {
        const saltRes = await fetch("/api/vault/salt");
        const saltData = await saltRes.json();
        if (!saltData.success) throw new Error("Vault not initialized.");
        
        const salt = new Uint8Array(base64ToArrayBuffer(saltData.salt));
        const key = await deriveKey(pwd, salt);

        const decrypted = await Promise.all(
          initialNotes.map(async (n) => {
            let plainTitle = "Untitled Note";
            if (n.encrypted_title) {
              try {
                plainTitle = await decryptTextWithAES(key, n.encrypted_title);
              } catch (err) {
                console.error("Failed to decrypt note title", n.id, err);
                plainTitle = "[Decryption Failed]";
              }
            }
            return { ...n, decryptedTitle: plainTitle };
          })
        );
        setDecryptedNotes(decrypted);
      } catch (err) {
        console.error("Error decrypting notes", err);
      } finally {
        setIsDecrypting(false);
      }
    }

    decryptAll();
  }, [initialNotes]);

  return (
    <>
      <VaultPasswordModal
        isOpen={isVaultModalOpen}
        onClose={handleVaultModalCancel}
        onSubmit={handleVaultModalSubmit}
      />
      {isDecrypting ? (
        <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
          Decrypting notes with Master Vault Key...
        </div>
      ) : (
        <NoteGrid notes={decryptedNotes} />
      )}
    </>
  );
}
