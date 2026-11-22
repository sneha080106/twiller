import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/user.js";
import tweetRoutes from "./routes/tweet.js";
import authRoutes from "./routes/auth.js";
import otpRoutes from "./routes/otp.js";
import languageRoutes from "./routes/language.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());

// The Stripe webhook route (inside routes/payment.js) needs the RAW request
// body for signature verification, so it must never go through the global
// express.json() parser below. Everything else does.
app.use((req, res, next) => {
  if (req.originalUrl === "/payment/webhook") return next();
  return express.json()(req, res, next);
});

// Serves uploaded audio tweets (see routes/tweet.js -> POST /post/audio)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

app.use(userRoutes);
app.use(tweetRoutes);
app.use(authRoutes);
app.use(otpRoutes);
app.use(languageRoutes);
app.use(paymentRoutes);

const port = process.env.PORT || 5000;
// MONOGDB_URL (typo) is still accepted so older .env files keep working.
const url = process.env.MONGODB_URL || process.env.MONOGDB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
