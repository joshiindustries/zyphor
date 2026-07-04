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

export function arrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// -----------------------------------------------------------------------------
// Asymmetric Crypto (RSA-OAEP 4096-bit)
// -----------------------------------------------------------------------------

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithRSA(publicKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  return window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    data
  );
}

export async function decryptWithRSA(privateKey: CryptoKey, encryptedData: ArrayBuffer): Promise<ArrayBuffer> {
  return window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedData
  );
}

// -----------------------------------------------------------------------------
// Symmetric Crypto (AES-GCM 256-bit)
// -----------------------------------------------------------------------------

export async function generateAESKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptTextWithAES(aesKey: CryptoKey, plaintext: string): Promise<{ iv: string, ciphertext: string }> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encoder.encode(plaintext)
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encryptedBuffer)
  };
}

export async function decryptTextWithAES(aesKey: CryptoKey, ivBase64: string, ciphertextBase64: string): Promise<string> {
  const ivBuffer = base64ToArrayBuffer(ivBase64);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    aesKey,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// -----------------------------------------------------------------------------
// Key Export / Import
// -----------------------------------------------------------------------------

export async function exportPublicKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKeyFromJWK(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function exportAESKeyToRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return window.crypto.subtle.exportKey("raw", key);
}

export async function importAESKeyFromRaw(rawKey: ArrayBuffer): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}
