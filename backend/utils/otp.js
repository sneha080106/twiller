import crypto from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000; // OTPs are valid for 5 minutes

export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}
