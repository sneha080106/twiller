import express from "express";
import User from "../models/user.js";
import { generateOtp, OTP_TTL_MS } from "../utils/otp.js";
import { sendOtpEmail, sendMail } from "../utils/mailer.js";
import { sendSms } from "../utils/sms.js";
import { generateRandomPassword } from "../utils/passwordGenerator.js";
import { setFirebaseUserPassword } from "../utils/firebaseAdmin.js";
import { getISTParts, istDateKey } from "../utils/timeWindow.js";
import { parseDevice, isChromeBrowser, isMicrosoftBrowser } from "../utils/deviceParser.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Feature 3: Forgot password                                          */
/* ------------------------------------------------------------------ */

// Step 1: request a reset — identifier can be an email or a phone number.
// Limited to once per (IST) calendar day.
router.post("/auth/forgot-password/request", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).send({ error: "Please enter your registered email address or phone number." });
    }

    const isEmail = identifier.includes("@");
    const user = await User.findOne(isEmail ? { email: identifier } : { phone: identifier });
    if (!user) {
      return res.status(404).send({ error: "No account found with that email or phone number." });
    }

    if (user.lastPasswordResetRequestAt && istDateKey(user.lastPasswordResetRequestAt) === istDateKey()) {
      return res.status(429).send({ error: "You can use this option only one time per day." });
    }

    const code = generateOtp();
    user.otp = {
      code,
      purpose: "password-reset",
      destination: identifier,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      verified: false,
    };
    user.lastPasswordResetRequestAt = new Date();
    await user.save();

    let devInfo = {};
    if (isEmail) {
      const result = await sendOtpEmail(user.email, code, "password reset");
      if (result?.devMode) devInfo = { devOtp: code };
    } else {
      const result = await sendSms(user.phone, `Your Twiller password reset code is ${code}. It expires in 5 minutes.`);
      if (result?.devMode) devInfo = { devOtp: code };
    }

    res.status(200).send({
      message: `A verification code has been sent to your ${isEmail ? "email" : "phone"}.`,
      channel: isEmail ? "email" : "phone",
      ...devInfo,
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Step 2: verify the code and get a brand-new, randomly generated password
// (letters only — no numbers or special characters). Always emailed to the
// account's registered email address, since that's the only channel we can
// deliver a secret over without a paid SMS provider.
router.post("/auth/forgot-password/reset", async (req, res) => {
  try {
    const { identifier, code } = req.body;
    const isEmail = identifier.includes("@");
    const user = await User.findOne(isEmail ? { email: identifier } : { phone: identifier });
    if (!user) return res.status(404).send({ error: "No account found with that email or phone number." });

    if (!user.otp || user.otp.purpose !== "password-reset" || user.otp.code !== code) {
      return res.status(401).send({ error: "Invalid verification code." });
    }
    if (user.otp.expiresAt < new Date()) {
      return res.status(401).send({ error: "Verification code has expired. Please request a new one." });
    }

    const newPassword = generateRandomPassword(12);
    const result = await setFirebaseUserPassword(user.email, newPassword);

    await sendMail({
      to: user.email,
      subject: "Your new Twiller password",
      html: `<p>Hi ${user.displayName},</p>
             <p>Your password has been reset. Your new temporary password is:</p>
             <h2 style="letter-spacing:2px;">${newPassword}</h2>
             <p>Please log in and change it as soon as possible.</p>`,
    });

    user.otp = undefined;
    await user.save();

    const devInfo = result?.devMode ? { devPassword: newPassword } : {};
    res.status(200).send({
      message: "Your password has been reset. Check your email for the new password.",
      ...devInfo,
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/* ------------------------------------------------------------------ */
/* Feature 6: Login history + device-aware authentication              */
/* ------------------------------------------------------------------ */
//
// The frontend calls this AFTER Firebase's own signInWithEmailAndPassword /
// signInWithPopup already succeeded, and BEFORE it treats the user as fully
// logged in. That lets us layer these app-level rules on top of Firebase
// auth without needing to reimplement password checking ourselves:
//
//  - Mobile devices may only log in between 10:00 AM and 1:00 PM IST.
//  - Chrome requires an extra email OTP step.
//  - Microsoft browsers (Edge/IE) skip any extra step.
//  - Every successful login is recorded to loginHistory.
router.post("/auth/login-check", async (req, res) => {
  try {
    const { email, code, deviceWidthHint } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found." });

    const ua = req.headers["user-agent"] || "";
    const { browser, os, device: uaDevice } = parseDevice(ua);

    // UA strings can't distinguish laptop vs. desktop; use an optional
    // screen-width hint from the client as a rough proxy.
    let device = uaDevice;
    if (device === "desktop" && typeof deviceWidthHint === "number" && deviceWidthHint > 0 && deviceWidthHint < 1366) {
      device = "laptop";
    }

    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString();

    if (device === "mobile") {
      const { hour } = getISTParts();
      if (!(hour >= 10 && hour < 13)) {
        return res
          .status(403)
          .send({ error: "Login from a mobile device is only allowed between 10:00 AM and 1:00 PM IST." });
      }
    }

    if (isChromeBrowser(browser)) {
      if (!code) {
        const otp = generateOtp();
        user.otp = {
          code: otp,
          purpose: "chrome-login",
          destination: user.email,
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          verified: false,
        };
        await user.save();
        const result = await sendOtpEmail(user.email, otp, "Chrome login verification");
        const devInfo = result?.devMode ? { devOtp: otp } : {};
        return res.status(200).send({
          otpRequired: true,
          message: "Logging in from Chrome requires email verification. A code has been sent to your email.",
          ...devInfo,
        });
      }
      if (!user.otp || user.otp.purpose !== "chrome-login" || user.otp.code !== code) {
        return res.status(401).send({ error: "Invalid verification code." });
      }
      if (user.otp.expiresAt < new Date()) {
        return res.status(401).send({ error: "Verification code expired. Please try logging in again." });
      }
      user.otp = undefined;
    }
    // Microsoft browsers (and anything else) fall straight through — no extra step.

    user.loginHistory = user.loginHistory || [];
    user.loginHistory.unshift({ browser, os, device, ip, timestamp: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 50);
    await user.save();

    return res.status(200).send({ ok: true, browser, os, device });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
