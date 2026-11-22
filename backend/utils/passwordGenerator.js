// Generates a random password made only of uppercase and lowercase letters —
// explicitly no numbers or special characters, per the Forgot Password spec.

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALL = UPPER + LOWER;

export function generateRandomPassword(length = 12) {
  const chars = [];
  // Guarantee at least one of each case so it isn't accidentally all-upper/all-lower.
  chars.push(UPPER[Math.floor(Math.random() * UPPER.length)]);
  chars.push(LOWER[Math.floor(Math.random() * LOWER.length)]);
  for (let i = 2; i < length; i++) {
    chars.push(ALL[Math.floor(Math.random() * ALL.length)]);
  }
  // Shuffle so the guaranteed characters aren't always in the first two slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
