import User from "../models/user.js";
import { isFirebaseAdminConfigured, verifyIdToken } from "../utils/firebaseAdmin.js";

let warned = false;

/**
 * Verifies the Firebase ID token sent by the frontend as
 *   Authorization: Bearer <idToken>
 * and attaches { uid, email } to req.auth.
 *
 * Dev mode: if FIREBASE_SERVICE_ACCOUNT isn't set, the server can't verify
 * tokens, so this lets requests through (req.auth = null) and logs a warning.
 * Set FIREBASE_SERVICE_ACCOUNT in any deployed environment.
 */
export async function requireAuth(req, res, next) {
  if (!isFirebaseAdminConfigured()) {
    if (!warned) {
      console.warn("⚠️  FIREBASE_SERVICE_ACCOUNT not set — API routes are NOT authenticated (dev mode).");
      warned = true;
    }
    req.auth = null;
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send({ error: "Missing authentication token." });

  try {
    const decoded = await verifyIdToken(token);
    req.auth = { uid: decoded.uid, email: (decoded.email || "").toLowerCase() };
    return next();
  } catch {
    return res.status(401).send({ error: "Invalid or expired authentication token." });
  }
}

/** True if the signed-in user's email equals `email` (always true in dev mode). */
export function emailMatches(req, email) {
  if (!req.auth) return true;
  return typeof email === "string" && email.toLowerCase() === req.auth.email;
}

/** Middleware factory: the email found by `getEmail(req)` must belong to the signed-in user. */
export function requireSelfEmail(getEmail) {
  return (req, res, next) => {
    if (!emailMatches(req, getEmail(req))) {
      return res.status(403).send({ error: "You can only access your own account." });
    }
    next();
  };
}

/** True if the Mongo user `userId` is the signed-in user (always true in dev mode). */
export async function ownsUserId(req, userId) {
  if (!req.auth) return true;
  if (!userId) return false;
  const user = await User.findById(userId).select("email");
  return !!user && user.email.toLowerCase() === req.auth.email;
}
