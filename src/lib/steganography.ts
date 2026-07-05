/**
 * Zyphor Steganography Engine
 * Uses HTML5 Canvas to encode/decode arbitrary text into the Least Significant Bit (LSB)
 * of the RGB channels of an image.
 */

// Helper to convert string to binary string
function textToBinary(text: string): string {
  let binary = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Pad to 16 bits to handle full UTF-16 encoding (supports emojis, extended chars)
    const binString = charCode.toString(2).padStart(16, "0");
    binary += binString;
  }
  // Add a delimiter to mark the end of the message (16 bits of zeros)
  return binary + "0000000000000000";
}

// Helper to convert binary string to text
function binaryToText(binary: string): string {
  let text = "";
  for (let i = 0; i < binary.length; i += 16) {
    const chunk = binary.slice(i, i + 16);
    if (chunk === "0000000000000000") break; // Delimiter found
    const charCode = parseInt(chunk, 2);
    text += String.fromCharCode(charCode);
  }
  return text;
}

export async function encodeMessageInImage(imageSrc: string, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Canvas 2D context not supported."));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const binaryMessage = textToBinary(message);

      // Check if image is large enough
      // Each pixel has R, G, B, A (4 bytes). We use R, G, B channels (3 bits per pixel).
      if (binaryMessage.length > (data.length / 4) * 3) {
        reject(new Error("Image is too small to hold this message."));
        return;
      }

      let bitIndex = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Iterate over R, G, B
        for (let j = 0; j < 3; j++) {
          if (bitIndex < binaryMessage.length) {
            const bit = parseInt(binaryMessage[bitIndex]);
            // Clear LSB and set to our message bit
            data[i + j] = (data[i + j] & 254) | bit;
            bitIndex++;
          }
        }
        if (bitIndex >= binaryMessage.length) break;
      }

      ctx.putImageData(imageData, 0, 0);
      
      // Must use PNG. JPEG compression destroys LSB data.
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = imageSrc;
  });
}

export async function decodeMessageFromImage(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas 2D context not supported."));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let binaryMessage = "";
      
      for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          // Extract LSB
          const bit = data[i + j] & 1;
          binaryMessage += bit.toString();

          // Check for delimiter every 16 bits
          if (binaryMessage.length % 16 === 0) {
            const chunk = binaryMessage.slice(-16);
            if (chunk === "0000000000000000") {
              // Complete message extracted
              const text = binaryToText(binaryMessage);
              resolve(text);
              return;
            }
          }
        }
      }

      // If we reach here without finding the delimiter, the image probably doesn't contain a message
      reject(new Error("No hidden message found in this image."));
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = imageSrc;
  });
}
