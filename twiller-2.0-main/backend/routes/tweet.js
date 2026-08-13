import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseBuffer } from "music-metadata";

import Tweet from "../models/tweet.js";
import User from "../models/user.js";
import { PLANS, planLimitLabel } from "../utils/plans.js";
import { isWithinISTWindow, istMonthKey } from "../utils/timeWindow.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const AUDIO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const AUDIO_MAX_SECONDS = 5 * 60; // 5 minutes

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES },
});

// --- Feature 4: Subscription plans gate how many tweets a user can post per month ---
function consumeTweetQuota(user) {
  const plan = PLANS[user.plan] || PLANS.free;
  const cycle = istMonthKey();
  if (user.planCycleMonth !== cycle) {
    user.planCycleMonth = cycle;
    user.tweetsUsedThisCycle = 0;
  }
  if (user.tweetsUsedThisCycle >= plan.limit) {
    return { allowed: false, plan };
  }
  user.tweetsUsedThisCycle += 1;
  return { allowed: true, plan };
}

// POST a text tweet
router.post("/post", async (req, res) => {
  try {
    const user = await User.findById(req.body.author);
    if (!user) return res.status(404).send({ error: "Author not found." });

    const quota = consumeTweetQuota(user);
    if (!quota.allowed) {
      return res.status(403).send({
        error: `You've reached your ${quota.plan.name} plan limit (${planLimitLabel(
          quota.plan
        )}) for this month. Upgrade your plan to post more.`,
      });
    }

    const tweet = new Tweet({ ...req.body, type: "text" });
    await tweet.save();
    await user.save();
    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// --- Feature 2: Audio tweets ---
// multipart/form-data: fields "author", "content" (optional), "otp"; file field "audio"
router.post("/post/audio", upload.single("audio"), async (req, res) => {
  try {
    if (!isWithinISTWindow(14, 0, 19, 0)) {
      return res
        .status(403)
        .send({ error: "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST." });
    }

    const { author, content, otp } = req.body;
    const user = await User.findById(author);
    if (!user) return res.status(404).send({ error: "Author not found." });

    if (!user.otp || user.otp.purpose !== "audio-upload" || user.otp.code !== otp) {
      return res
        .status(401)
        .send({ error: "Please verify the code sent to your email before uploading audio." });
    }
    if (user.otp.expiresAt < new Date()) {
      return res.status(401).send({ error: "Your verification code expired. Please request a new one." });
    }

    if (!req.file) return res.status(400).send({ error: "An audio file is required." });
    if (req.file.size > AUDIO_MAX_BYTES) {
      return res.status(400).send({ error: "Audio file exceeds the 100MB limit." });
    }

    let duration = 0;
    try {
      const metadata = await parseBuffer(req.file.buffer, req.file.mimetype);
      duration = metadata.format.duration || 0;
    } catch {
      return res.status(400).send({ error: "Could not read that audio file. Please upload a valid audio file." });
    }
    if (duration > AUDIO_MAX_SECONDS) {
      return res.status(400).send({ error: "Audio must be 5 minutes or shorter." });
    }

    const quota = consumeTweetQuota(user);
    if (!quota.allowed) {
      return res.status(403).send({
        error: `You've reached your ${quota.plan.name} plan limit (${planLimitLabel(
          quota.plan
        )}) for this month. Upgrade your plan to post more.`,
      });
    }

    const ext = ((req.file.mimetype.split("/")[1] || "webm").split(";")[0]).replace(/[^a-z0-9]/gi, "");
    const filename = `${Date.now()}-${author}.${ext || "webm"}`;
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);

    const tweet = new Tweet({
      author,
      content: content || "",
      type: "audio",
      audioUrl: `/uploads/${filename}`,
      audioDuration: Math.round(duration),
    });
    await tweet.save();

    user.otp = undefined; // one-time use
    await user.save();

    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// GET all tweets
router.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// LIKE TWEET
router.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// RETWEET
router.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
