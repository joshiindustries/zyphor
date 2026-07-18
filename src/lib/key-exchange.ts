/**
 * Utility for client-side zero-knowledge key generation and encryption.
 * Handles RSA-OAEP identity keys plus AES-GCM message envelopes.
 */

export async function generateIdentityKeyPair() {
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
  const b64Lines = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const byteStr = window.atob(b64Lines);
  const bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

function parseMaybeJwk(value: string): JsonWebKey | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && parsed.kty) return parsed as JsonWebKey;
  } catch {
    // Not a JWK JSON value.
  }
  return null;
}

export async function importPublicKey(pemOrJwk: string): Promise<CryptoKey> {
  const jwk = parseMaybeJwk(pemOrJwk);
  if (jwk) {
    return window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  }

  return window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(pemOrJwk),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function importPrivateKey(pemOrJwk: string): Promise<CryptoKey> {
  const jwk = parseMaybeJwk(pemOrJwk);
  if (jwk) {
    return window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"]
    );
  }

  return window.crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pemOrJwk),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

export async function encryptMessage(text: string, recipientPublicKeyPem: string, senderPublicKeyPem?: string | null): Promise<string> {
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
  const publicKeys = [recipientPublicKeyPem];
  if (senderPublicKeyPem && senderPublicKeyPem !== recipientPublicKeyPem) {
    publicKeys.push(senderPublicKeyPem);
  }

  const encryptedKeys: string[] = [];
  for (const publicKey of publicKeys) {
    const rsaPubKey = await importPublicKey(publicKey);
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      rsaPubKey,
      rawAesKey
    );
    encryptedKeys.push(window.btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey))));
  }

  return JSON.stringify({
    iv: window.btoa(String.fromCharCode(...new Uint8Array(iv))),
    encryptedContent: window.btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    encryptedAesKey: encryptedKeys[0],
    encryptedKeys,
  });
}

export async function decryptMessage(payload: string, privateKeyPem: string): Promise<string> {
  const parsed = JSON.parse(payload);
  const iv = new Uint8Array(window.atob(parsed.iv).split("").map((c: string) => c.charCodeAt(0)));
  const encryptedContent = new Uint8Array(window.atob(parsed.encryptedContent).split("").map((c: string) => c.charCodeAt(0)));
  const candidateKeys: string[] = Array.isArray(parsed.encryptedKeys) && parsed.encryptedKeys.length > 0
    ? parsed.encryptedKeys
    : [parsed.encryptedAesKey];

  const rsaPrivKey = await importPrivateKey(privateKeyPem);
  let rawAesKey: ArrayBuffer | null = null;
  for (const encryptedKey of candidateKeys) {
    if (!encryptedKey) continue;
    try {
      const encryptedAesKey = new Uint8Array(window.atob(encryptedKey).split("").map((c: string) => c.charCodeAt(0)));
      rawAesKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        rsaPrivKey,
        encryptedAesKey
      );
      break;
    } catch {
      // Try the next recipient key in the envelope.
    }
  }

  if (!rawAesKey) {
    throw new Error("Message cannot be decrypted by this device key.");
  }

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

  return new TextDecoder().decode(decrypted);
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

  return new TextDecoder().decode(decrypted);
}