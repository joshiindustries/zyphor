"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, CheckCircle, Loader2, Lock, Fingerprint } from "lucide-react";
import { generateIdentityKeyPair, exportPrivateKey, exportPublicKey } from "@/lib/key-exchange";
import { arrayBufferToBase64, deriveKey, encryptTextWithAES } from "@/lib/crypto";
import { withCsrfHeaders } from "@/lib/csrf-client";

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function createEncryptedSecret(secret: string, passphrase: string) {
  const salt = randomSalt();
  const key = await deriveKey(passphrase, salt);
  const encryptedSecret = await encryptTextWithAES(key, secret);
  const verifier = await encryptTextWithAES(key, "ZYPHOR_UNLOCK_OK");

  return {
    salt: arrayBufferToBase64(salt),
    encryptedSecret,
    verifier,
  };
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(buffer);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default function SetupKeysPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "generating" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [unlockPin, setUnlockPin] = useState("");
  const [createPasskey, setCreatePasskey] = useState(false);

  const handleGenerateKeys = async () => {
    if (!masterPassword || masterPassword.length < 8) {
      setError("Master Vault Password must be at least 8 characters.");
      return;
    }

    if (unlockPin && unlockPin.length < 6) {
      setError("Unlock PIN must be at least 6 digits or leave it empty.");
      return;
    }

    try {
      setStatus("generating");
      setError(null);

      const keyPair = await generateIdentityKeyPair();
      const publicKeyPem = await exportPublicKey(keyPair.publicKey);
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey);
      const encryptedPrivateKey = await createEncryptedSecret(privateKeyPem, masterPassword);

      const deviceId = crypto.randomUUID();
      localStorage.setItem("zyphor_device_id", deviceId);
      localStorage.setItem("zyphor_public_key_pem", publicKeyPem);
      localStorage.setItem("zyphor_private_key_pem", privateKeyPem);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);

      setStatus("uploading");

      const keyRes = await fetch("/api/keys", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          device_id: deviceId,
          public_key: publicKeyPem,
          encrypted_private_key: encryptedPrivateKey.encryptedSecret,
          private_key_salt: encryptedPrivateKey.salt,
          private_key_hint: "Encrypted with your master vault password",
        }),
      });

      if (!keyRes.ok) {
        const data = await keyRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save device key to server");
      }

      if (unlockPin) {
        const encryptedPinSecret = await createEncryptedSecret(masterPassword, unlockPin);
        const pinRes = await fetch("/api/vault/unlock-credentials", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            type: "PIN",
            label: "Device PIN",
            salt: encryptedPinSecret.salt,
            verifier: encryptedPinSecret.verifier,
            encrypted_secret: encryptedPinSecret.encryptedSecret,
          }),
        });

        if (!pinRes.ok) {
          const data = await pinRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save PIN unlock record");
        }
      }

      if (createPasskey) {
        if (!("credentials" in navigator) || !window.PublicKeyCredential) {
          throw new Error("This browser does not support passkeys.");
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userIdBytes = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Zyphor" },
            user: {
              id: userIdBytes,
              name: "Zyphor user",
              displayName: "Zyphor user",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "preferred",
            },
            attestation: "none",
          },
        }) as PublicKeyCredential | null;

        if (!credential) throw new Error("Passkey creation was cancelled.");

        const response = credential.response as AuthenticatorAttestationResponse;
        const passkeySecret = await createEncryptedSecret(masterPassword, masterPassword);
        const passkeyRes = await fetch("/api/passkeys", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            credential_id: bufferToBase64Url(credential.rawId),
            public_key: arrayBufferToBase64(response.attestationObject),
            transports: JSON.stringify(response.getTransports?.() || []),
            name: "Device passkey",
            encrypted_secret: passkeySecret.encryptedSecret,
            secret_salt: passkeySecret.salt,
          }),
        });

        if (!passkeyRes.ok) {
          const data = await passkeyRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save passkey record");
        }
      }

      setStatus("done");
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during key generation");
      setStatus("idle");
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "1rem" }}>
      <div className="glass-panel" style={{ borderRadius: "var(--radius-md)", padding: "clamp(1.25rem, 5vw, 3rem)", maxWidth: "560px", width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "rgba(59,130,246,0.12)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Shield size={44} color="var(--accent-blue)" />
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem" }}>Secure Your Device</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: "1.6" }}>
          Zyphor saves your public key in the database and stores your private key only as an encrypted recovery copy. Your master password or PIN is never stored as plaintext.
        </p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#ef4444", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative", textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Master Vault Password</label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} size={18} />
                <input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} placeholder="Enter or create Master Password" className="input-field" style={{ paddingLeft: "2.5rem", width: "100%" }} />
              </div>
            </div>

            <div style={{ position: "relative", textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Optional Unlock PIN</label>
              <div style={{ position: "relative" }}>
                <Key style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} size={18} />
                <input type="password" inputMode="numeric" value={unlockPin} onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ""))} placeholder="6+ digits for notes, passwords and cloud unlock" className="input-field" style={{ paddingLeft: "2.5rem", width: "100%" }} />
              </div>
            </div>

            <button type="button" onClick={() => setCreatePasskey(!createPasskey)} className="btn btn-secondary" style={{ justifyContent: "space-between", border: `1px solid ${createPasskey ? "var(--accent-blue)" : "var(--glass-border)"}` }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}><Fingerprint size={18} /> Add device passkey metadata</span>
              <span>{createPasskey ? "On" : "Off"}</span>
            </button>

            <button onClick={handleGenerateKeys} className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.05rem" }}>
              <Key size={20} /> Save Secure Device Keys
            </button>
          </div>
        )}

        {status === "generating" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" />
            <p>Generating RSA-4096 keys...</p>
          </div>
        )}

        {status === "uploading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" />
            <p>Saving encrypted recovery records...</p>
          </div>
        )}

        {status === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#10b981" }}>
            <CheckCircle size={48} />
            <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>Device secured.</p>
          </div>
        )}
      </div>
    </main>
  );
}
