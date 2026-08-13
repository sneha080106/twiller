import express from "express";
import User from "../models/user.js";
import { generateOtp, OTP_TTL_MS } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { sendSms } from "../utils/sms.js";

const router = express.Router();

export const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];

// --- Feature 5: Multi-language support ---
// French -> verify via email OTP. Every other language -> verify via phone OTP.
router.post("/language/request-switch", async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).send({ error: "Unsupported language." });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found." });

    // Switching to English never needs re-verification if already on English.
    if (language === user.language) {
      return res.status(200).send({ alreadyActive: true, language });
    }

    const code = generateOtp();
    const purpose = `language-switch-${language}`;

    if (language === "fr") {
      user.otp = {
        code,
        purpose,
        destination: user.email,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        verified: false,
      };
      await user.save();
      const result = await sendOtpEmail(user.email, code, "language switch to French");
      const devInfo = result?.devMode ? { devOtp: code } : {};
      return res.status(200).send({ channel: "email", message: "Verification code sent to your email.", ...devInfo });
    }

    if (!user.phone) {
      return res.status(400).send({ error: "Please add a phone number to your profile before switching languages." });
    }
    user.otp = {
      code,
      purpose,
      destination: user.phone,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      verified: false,
    };
    await user.save();
    const result = await sendSms(user.phone, `Your Twiller language switch code is ${code}.`);
    const devInfo = result?.devMode ? { devOtp: code } : {};
    return res
      .status(200)
      .send({ channel: "phone", message: "Verification code sent to your registered mobile number.", ...devInfo });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

router.post("/language/confirm-switch", async (req, res) => {
  try {
    const { email, language, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found." });

    const purpose = `language-switch-${language}`;
    if (!user.otp || user.otp.purpose !== purpose || user.otp.code !== code) {
      return res.status(401).send({ error: "Invalid verification code." });
    }
    if (user.otp.expiresAt < new Date()) {
      return res.status(401).send({ error: "Verification code expired. Please request a new one." });
    }

    user.language = language;
    user.otp = undefined;
    await user.save();
    res.status(200).send({ language });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

export default router;
