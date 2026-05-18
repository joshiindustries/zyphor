"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withCsrfHeaders } from "@/lib/csrf-client";

export default function ProfileForm({ user }: { user: any }) {
  const [name, setName] = useState(user.name || "");
  const [dob, setDob] = useState(user.dob || "");
  const [image, setImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string>(user.avatar || user.image || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setMessage("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const value = reader.result as string;
        setImage(value);
        setCurrentImage(value);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload: any = { name, dob };
      if (image) payload.image = image;

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage("Profile updated successfully!");
        if (image) {
          setCurrentImage(image);
        }
        router.refresh();
      } else {
        setMessage("Failed to update profile.");
      }
    } catch (err) {
      setMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {message && (
        <div style={{ color: message.includes("success") ? "#10b981" : "#ef4444", fontSize: "0.9rem", padding: "0.75rem", background: message.includes("success") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-sm)" }}>
          {message}
        </div>
      )}
      
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Display Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="input-field" 
          placeholder="John Doe"
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Profile Picture</label>
        {currentImage && (
          <div style={{ marginBottom: "0.75rem" }}>
            <img
              src={currentImage}
              alt="Profile preview"
              style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--glass-border)" }}
            />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageChange}
            id="profile-upload"
            style={{ display: "none" }}
          />
          <button 
            type="button" 
            onClick={() => document.getElementById('profile-upload')?.click()}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
          >
            Choose Image
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {image ? "Image selected" : "No image selected"}
          </span>
        </div>
      </div>

      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Date of Birth</label>
        <input 
          type="date" 
          value={dob} 
          onChange={e => setDob(e.target.value)} 
          className="input-field" 
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
