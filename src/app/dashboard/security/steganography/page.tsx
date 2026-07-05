"use client";

import { useState, useRef } from "react";
import { Shield, Upload, Download, Eye, EyeOff, Lock, Unlock, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { encodeMessageInImage, decodeMessageFromImage } from "@/lib/steganography";

export default function SteganographyEngine() {
  const [mode, setMode] = useState<"ENCODE" | "DECODE">("ENCODE");
  
  // Shared state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Encode state
  const [secretMessage, setSecretMessage] = useState("");
  const [encodedImage, setEncodedImage] = useState<string | null>(null);

  // Decode state
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setEncodedImage(null);
      setDecodedMessage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEncode = async () => {
    if (!imageSrc || !secretMessage) return;
    
    setLoading(true);
    setError(null);
    try {
      // Small artificial delay for visual effect
      await new Promise(r => setTimeout(r, 800)); 
      
      const result = await encodeMessageInImage(imageSrc, secretMessage);
      setEncodedImage(result);
    } catch (err: any) {
      setError(err.message || "Failed to encode message.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (!imageSrc) return;
    
    setLoading(true);
    setError(null);
    try {
      // Small artificial delay for visual effect
      await new Promise(r => setTimeout(r, 1200));
      
      const result = await decodeMessageFromImage(imageSrc);
      setDecodedMessage(result);
    } catch (err: any) {
      setError(err.message || "Failed to decode message. Are you sure this image contains a Zyphor steganography payload?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", color: "#fff", padding: "2rem", fontFamily: "monospace" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <Link href="/dashboard/security" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", textDecoration: "none", marginBottom: "1rem" }}>
              <ArrowLeft size={16} /> Back to Security Center
            </Link>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 0.5rem 0", color: "#10b981" }}>
              <EyeOff size={32} /> Steganography Engine
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
              Covertly embed or extract encrypted payloads within standard image files.
            </p>
          </div>
        </header>

        {/* Mode Toggle */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.5)", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", marginBottom: "2rem" }}>
          <button 
            onClick={() => { setMode("ENCODE"); setImageSrc(null); setEncodedImage(null); setError(null); }}
            style={{ flex: 1, padding: "0.75rem", background: mode === "ENCODE" ? "rgba(16, 185, 129, 0.2)" : "transparent", color: mode === "ENCODE" ? "#10b981" : "var(--text-secondary)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontWeight: "600", transition: "all 0.2s" }}
          >
            <Lock size={18} /> HIDE PAYLOAD
          </button>
          <button 
            onClick={() => { setMode("DECODE"); setImageSrc(null); setDecodedMessage(null); setError(null); }}
            style={{ flex: 1, padding: "0.75rem", background: mode === "DECODE" ? "rgba(59, 130, 246, 0.2)" : "transparent", color: mode === "DECODE" ? "#3b82f6" : "var(--text-secondary)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontWeight: "600", transition: "all 0.2s" }}
          >
            <Unlock size={18} /> EXTRACT PAYLOAD
          </button>
        </div>

        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", padding: "2rem" }}>
          
          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "1rem", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", marginBottom: "2rem", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          {/* Upload Zone */}
          {!imageSrc ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ border: "2px dashed var(--glass-border)", borderRadius: "var(--radius-md)", padding: "4rem 2rem", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.2)", transition: "all 0.2s" }}
              className="hover:border-green-500 hover:bg-black/40"
            >
              <Upload size={48} color="var(--text-secondary)" style={{ margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>
                {mode === "ENCODE" ? "Select Cover Image" : "Select Image with Hidden Payload"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                JPEG or PNG supported. (Encrypted output will always be PNG to preserve LSB data)
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {/* Image Preview */}
              <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
                <img src={imageSrc} alt="Preview" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block" }} />
                <button 
                  onClick={() => { setImageSrc(null); setEncodedImage(null); setDecodedMessage(null); }}
                  style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                >
                  Clear Image
                </button>
              </div>

              {/* ENCODE MODE WORKFLOW */}
              {mode === "ENCODE" && !encodedImage && (
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Secret Payload (Text / Ciphertext)</label>
                  <textarea
                    value={secretMessage}
                    onChange={(e) => setSecretMessage(e.target.value)}
                    placeholder="Enter highly classified data..."
                    rows={5}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1rem", color: "#10b981", fontFamily: "monospace", outline: "none", resize: "vertical", marginBottom: "1rem" }}
                  />
                  <button 
                    onClick={handleEncode}
                    disabled={!secretMessage || loading}
                    className="btn"
                    style={{ width: "100%", padding: "1rem", background: "#10b981", color: "#000", fontWeight: "700", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1.1rem" }}
                  >
                    {loading ? "INJECTING PAYLOAD INTO LSB..." : <><Lock size={20} /> EXECUTE STEGANOGRAPHY INJECTION</>}
                  </button>
                </div>
              )}

              {/* ENCODE SUCCESS */}
              {mode === "ENCODE" && encodedImage && (
                <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ color: "#10b981", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}><Shield size={20} /> PAYLOAD INJECTED</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                    Your secret message is now embedded within the pixels of this image. The image looks identical, but contains hidden binary data. Download and store safely.
                  </p>
                  <a 
                    href={encodedImage} 
                    download="zyphor_classified_image.png"
                    className="btn"
                    style={{ display: "inline-flex", background: "#10b981", color: "#000", fontWeight: "700", border: "none", padding: "0.75rem 1.5rem", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
                  >
                    <Download size={18} /> DOWNLOAD CLASSIFIED IMAGE (PNG)
                  </a>
                </div>
              )}

              {/* DECODE MODE WORKFLOW */}
              {mode === "DECODE" && !decodedMessage && (
                <div>
                  <button 
                    onClick={handleDecode}
                    disabled={loading}
                    className="btn"
                    style={{ width: "100%", padding: "1rem", background: "#3b82f6", color: "#000", fontWeight: "700", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1.1rem" }}
                  >
                    {loading ? "ANALYZING LSB PIXEL DATA..." : <><Eye size={20} /> EXTRACT HIDDEN PAYLOAD</>}
                  </button>
                </div>
              )}

              {/* DECODE SUCCESS */}
              {mode === "DECODE" && decodedMessage && (
                <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid #3b82f6", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ color: "#3b82f6", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}><Unlock size={20} /> PAYLOAD EXTRACTED</h3>
                  <div style={{ background: "rgba(0,0,0,0.5)", border: "1px dashed #3b82f6", padding: "1.5rem", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {decodedMessage}
                  </div>
                </div>
              )}

            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            style={{ display: "none" }} 
          />
        </div>
      </div>
    </div>
  );
}
