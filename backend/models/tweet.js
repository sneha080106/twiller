import mongoose from "mongoose";

const TweetSchema = mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  type: { type: String, enum: ["text", "audio"], default: "text" },
  likes: { type: Number, default: 0 },
  retweets: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  image: { type: String, default: null },

  // --- Feature 2: Audio tweets ---
  audioUrl: { type: String, default: null },
  audioDuration: { type: Number, default: null }, // seconds

  timestamp: { type: Date, default: Date.now() },
});

export default mongoose.model("Tweet", TweetSchema);
