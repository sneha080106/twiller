import express from "express";
import User from "../models/user.js";
import { generateOtp, OTP_TTL_MS } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { requireAuth, requireSelfEmail } from "../middleware/auth.js";

const router = express.Router();

// Purposes that are allowed to request a code through this generic endpoint.
// (Password reset and login have their own dedicated, more specific routes.)
const ALLOWED_PURPOSES = ["audio-upload"];

// --- Feature 2: Audio tweets require email OTP verification before upload ---
router.post("/otp/send", requireAuth, requireSelfEmail((req) => req.body.email), async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!ALLOWED_PURPOSES.includes(purpose)) {
      return res.status(400).send({ error: "Invalid OTP purpose." });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found." });

    const code = generateOtp();
    user.otp = {
      code,
      purpose,
      destination: email,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      verified: false,
    };
    await user.save();

    const result = await sendOtpEmail(email, code, purpose);
    const devInfo = result?.devMode ? { devOtp: code } : {};
    res.status(200).send({ message: "Verification code sent to your email.", ...devInfo });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

export default router;
