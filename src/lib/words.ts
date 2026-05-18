export const words = [
  "apple", "river", "cloud", "stone", "horse", "light", "dream", "water", 
  "bread", "night", "glass", "paper", "train", "ocean", "sound", "world", 
  "plant", "heart", "clock", "house", "field", "music", "smile", "color", 
  "mouse", "table", "chair", "phone", "watch", "shoe", "shirt", "green", 
  "black", "white", "blue", "yellow", "red", "orange", "purple", "brown",
  "happy", "quiet", "brave", "calm", "proud", "swift", "clever", "kind",
  "small", "large", "heavy", "light", "crisp", "fresh", "sweet", "spicy",
  "summer", "winter", "spring", "autumn", "forest", "mountain", "valley",
  "tiger", "eagle", "bear", "wolf", "fox", "deer", "rabbit", "turtle"
];

export function generateMemorablePassphrase(wordCount = 3) {
  const phrase = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    phrase.push(words[randomIndex]);
  }
  return phrase.join('-');
}
