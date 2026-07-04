/**
 * Utility for client-side zero-knowledge key generation and encryption.
 * For Phase 3 Secure Chat Foundation.
 */

export async function generateIdentityKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
  const exportedAsBase64 = window.btoa(exportedAsString);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
  const exportedAsBase64 = window.btoa(exportedAsString);
  return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64Lines = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  const byteStr = window.atob(b64Lines);
  const bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function importPublicKey(pem: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

export async function encryptMessage(text: string, recipientPublicKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data
  );
  
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  
  const rsaPubKey = await importPublicKey(recipientPublicKeyPem);
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPubKey,
    rawAesKey
  );
  
  return JSON.stringify({
    iv: window.btoa(String.fromCharCode(...new Uint8Array(iv))),
    encryptedContent: window.btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    encryptedAesKey: window.btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey)))
  });
}

export async function decryptMessage(payload: string, privateKeyPem: string): Promise<string> {
  const parsed = JSON.parse(payload);
  const iv = new Uint8Array(window.atob(parsed.iv).split("").map(c => c.charCodeAt(0)));
  const encryptedContent = new Uint8Array(window.atob(parsed.encryptedContent).split("").map(c => c.charCodeAt(0)));
  const encryptedAesKey = new Uint8Array(window.atob(parsed.encryptedAesKey).split("").map(c => c.charCodeAt(0)));
  
  const rsaPrivKey = await importPrivateKey(privateKeyPem);
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaPrivKey,
    encryptedAesKey
  );
  
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedContent
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// --- Group Chat Utilities ---

export async function generateGroupKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptGroupKeyForUser(groupKey: CryptoKey, userPublicKeyPem: string): Promise<string> {
  const rawAesKey = await window.crypto.subtle.exportKey("raw", groupKey);
  const rsaPubKey = await importPublicKey(userPublicKeyPem);
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPubKey,
    rawAesKey
  );
  return window.btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey)));
}

export async function decryptGroupKey(encryptedGroupKeyB64: string, privateKeyPem: string): Promise<CryptoKey> {
  const encryptedAesKey = new Uint8Array(window.atob(encryptedGroupKeyB64).split("").map(c => c.charCodeAt(0)));
  const rsaPrivKey = await importPrivateKey(privateKeyPem);
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaPrivKey,
    encryptedAesKey
  );
  return window.crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptGroupMessage(text: string, groupKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    groupKey,
    data
  );
  
  return JSON.stringify({
    iv: window.btoa(String.fromCharCode(...new Uint8Array(iv))),
    encryptedContent: window.btoa(String.fromCharCode(...new Uint8Array(encryptedContent)))
  });
}

export async function decryptGroupMessage(payload: string, groupKey: CryptoKey): Promise<string> {
  const parsed = JSON.parse(payload);
  const iv = new Uint8Array(window.atob(parsed.iv).split("").map(c => c.charCodeAt(0)));
  const encryptedContent = new Uint8Array(window.atob(parsed.encryptedContent).split("").map(c => c.charCodeAt(0)));
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    groupKey,
    encryptedContent
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
