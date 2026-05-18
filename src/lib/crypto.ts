/**
 * Client-side cryptographic functions for E2E encryption using Web Crypto API.
 * Uses AES-256-GCM for encryption and PBKDF2 (SHA-512) for key derivation.
 */

const SALT_SIZE = 16;
const IV_SIZE = 12;
const ITERATIONS = 100000;

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-512",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, password: string): Promise<{
  encryptedData: Blob;
  salt: Uint8Array;
  iv: Uint8Array;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await deriveKey(password, salt);
  
  const arrayBuffer = await file.arrayBuffer();
  
  const encryptedFile = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    arrayBuffer
  );

  return {
    encryptedData: new Blob([encryptedFile], { type: "application/octet-stream" }),
    salt,
    iv
  };
}

export async function decryptData(
  encryptedData: ArrayBuffer,
  password: string,
  saltBase64: string,
  ivBase64: string
): Promise<Blob> {
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const key = await deriveKey(password, salt);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  return new Blob([decryptedData]);
}

export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
