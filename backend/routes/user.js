import express from "express";
import User from "../models/user.js";
import { requireAuth, requireSelfEmail } from "../middleware/auth.js";

const router = express.Router();

// Only these fields may be set from the client. Everything else (plan,
// tweet quota, OTP, login history...) is controlled by the server.
const REGISTER_FIELDS = ["username", "displayName", "avatar", "email"];
const EDITABLE_FIELDS = [
  "username",
  "displayName",
  "avatar",
  "bio",
  "location",
  "website",
  "phone",
  "notificationsEnabled",
];

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// Register
router.post("/register", requireAuth, requireSelfEmail((req) => req.body.email), async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email }).select("-otp");
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    const newUser = new User(pick(req.body, REGISTER_FIELDS));
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Logged in user
router.get("/loggedinuser", requireAuth, requireSelfEmail((req) => req.query.email), async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    // "-otp" so a pending verification code is never sent back to the browser.
    const user = await User.findOne({ email: email }).select("-otp");
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Update profile (also used by Feature 1's notification toggle, Feature 5's
// phone number field, etc.) — only whitelisted fields are applied.
router.patch("/userupdate/:email", requireAuth, requireSelfEmail((req) => req.params.email), async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: pick(req.body, EDITABLE_FIELDS) },
      { new: true, upsert: false }
    ).select("-otp");
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// --- Feature 6: Login history, shown on the profile page ---
router.get("/loginhistory/:email", requireAuth, requireSelfEmail((req) => req.params.email), async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).send({ error: "User not found." });
    return res.status(200).send(user.loginHistory || []);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
