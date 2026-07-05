"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { motion, Variants } from "framer-motion";

interface Note {
  id: string;
  encrypted_title: string;
  decryptedTitle?: string;
  updated_at: Date;
}

interface NoteGridProps {
  notes: Note[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function NoteGrid({ notes }: NoteGridProps) {
  if (notes.length === 0) {
    return (
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ color: "var(--text-secondary)" }}
      >
        No notes found. Create your first encrypted note!
      </motion.p>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}
    >
      {notes.map((note) => (
        <motion.div key={note.id} variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }}>
          <Link href={`/dashboard/notes/${note.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", cursor: "pointer", height: "200px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: "700", fontSize: "1.1rem", margin: 0, wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.decryptedTitle || "Encrypted Note"}</h3>
                <button style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><MoreVertical size={16}/></button>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-all" }}>
                Ciphertext: {note.encrypted_title.substring(0, 40)}...
              </p>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "auto" }}>
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
