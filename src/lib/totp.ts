/**
 * Native WebCrypto TOTP Implementation (RFC 6238)
 */

function base32ToBuffer(base32: string): ArrayBuffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const str = base32.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.ceil((str.length * 5) / 8));

  for (let i = 0; i < str.length; i++) {
    const val = alphabet.indexOf(str[i]);
    if (val === -1) {
      throw new Error("Invalid Base32 character: " + str[i]);
    }
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output.buffer;
}

export async function generateTOTP(secret: string): Promise<string> {
  // 1. Decode Base32 secret
  const keyBuffer = base32ToBuffer(secret.replace(/\s+/g, ''));
  
  // 2. Import Key for HMAC-SHA1
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  // 3. Compute Time Step (T0=0, X=30)
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, timeStep, false); // Big-endian

  // 4. Compute HMAC
  const hmac = await crypto.subtle.sign("HMAC", key, timeBuffer);
  const hmacView = new Uint8Array(hmac);

  // 5. Truncate
  const offset = hmacView[19] & 0xf;
  const binary =
    ((hmacView[offset] & 0x7f) << 24) |
    ((hmacView[offset + 1] & 0xff) << 16) |
    ((hmacView[offset + 2] & 0xff) << 8) |
    (hmacView[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}
