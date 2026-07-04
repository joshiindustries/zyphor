"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { generateAESKey, encryptTextWithAES, exportAESKeyToRaw, arrayBufferToBase64 } from "@/lib/crypto";

export function NewNoteButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      // 1. Generate AES Key for the new note
      const aesKey = await generateAESKey();
      
      // 2. Encrypt default title
      const { iv, ciphertext } = await encryptTextWithAES(aesKey, "Untitled Note");

      // 3. POST to /api/notes
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_title: ciphertext,
          iv: iv
        })
      });

      if (!res.ok) throw new Error("Failed to create note");
      const data = await res.json();
      
      // 4. (Mock) Save the AES key to localStorage for this specific note
      // In reality, this would be wrapped with the user's RSA public key and saved to NoteShare,
      // but for this UI demo, we'll store the raw AES key in localStorage so the editor can pick it up.
      const rawKey = await exportAESKeyToRaw(aesKey);
      const base64Key = arrayBufferToBase64(rawKey);
      localStorage.setItem(`zyphor_note_key_${data.note.id}`, base64Key);

      // 5. Redirect to Editor
      router.push(`/dashboard/notes/${data.note.id}`);
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  return (
    <button 
      className="btn btn-primary" 
      onClick={handleCreateNote}
      disabled={isCreating}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem", background: "#e67e22", width: "100%" }}
    >
      {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} 
      {isCreating ? "Creating..." : "New Note"}
    </button>
  );
}
