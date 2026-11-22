import mongoose from "mongoose";

const LoginHistoryEntrySchema = new mongoose.Schema(
  {
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    device: { type: String, default: "desktop" }, // "mobile" | "tablet" | "laptop" | "desktop"
    ip: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OtpSchema = new mongoose.Schema(
  {
    code: { type: String },
    purpose: { type: String }, // e.g. "password-reset" | "audio-upload" | "chrome-login" | "language-switch-fr"
    destination: { type: String }, // email or phone the code was sent to
    expiresAt: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now() },

  // --- Feature 1: Notifications ---
  notificationsEnabled: { type: Boolean, default: true },

  // --- Feature 3 & 5: phone number (password reset / non-French language OTP) ---
  phone: { type: String, default: "" },

  // --- Feature 3: Forgot password ---
  lastPasswordResetRequestAt: { type: Date, default: null },

  // --- Feature 4: Subscription plans ---
  plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
  planCycleMonth: { type: String, default: "" }, // "YYYY-M", resets tweetsUsedThisCycle when it changes
  tweetsUsedThisCycle: { type: Number, default: 0 },
  planRenewsAt: { type: Date, default: null },

  // --- Feature 5: Multi-language ---
  language: { type: String, default: "en" },

  // --- Feature 6: Login history ---
  loginHistory: { type: [LoginHistoryEntrySchema], default: [] },

  // --- Shared: single-slot OTP used by several features (one at a time) ---
  otp: { type: OtpSchema, default: undefined },
});

export default mongoose.model("User", UserSchema);
