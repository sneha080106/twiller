import admin from "firebase-admin";

// Forgot Password needs to set a *brand new* password on the user's Firebase
// Auth account without knowing their old one — that's only possible from a
// trusted server using the Firebase Admin SDK with a service account.
//
// To enable this for real, create a service account (Firebase Console ->
// Project Settings -> Service Accounts -> Generate new private key) and put
// the JSON as a single-line string in FIREBASE_SERVICE_ACCOUNT in backend/.env.
//
// Until you do that, this runs in "dev mode": the flow still works end to
// end (OTP, daily limit, generated password, email), it just doesn't
// actually touch the Firebase account — it logs what it *would* have done.

let initialized = false;

function getAdmin() {
  if (initialized) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    return admin;
  } catch (err) {
    console.error("⚠️ Failed to initialize firebase-admin from FIREBASE_SERVICE_ACCOUNT:", err.message);
    return null;
  }
}

export async function setFirebaseUserPassword(email, newPassword) {
  const instance = getAdmin();
  if (!instance) {
    console.log(`🔧 [DEV MODE] firebase-admin not configured — would set ${email}'s password to: ${newPassword}`);
    return { devMode: true };
  }
  const userRecord = await instance.auth().getUserByEmail(email);
  await instance.auth().updateUser(userRecord.uid, { password: newPassword });
  return { devMode: false };
}

// Used by middleware/auth.js to protect routes. Returns false in dev mode
// (no FIREBASE_SERVICE_ACCOUNT), in which case routes are left open so the
// project still runs locally without any Firebase admin setup.
export function isFirebaseAdminConfigured() {
  return !!getAdmin();
}

export async function verifyIdToken(idToken) {
  const instance = getAdmin();
  if (!instance) return null;
  return instance.auth().verifyIdToken(idToken);
}
