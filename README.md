# Twiller

A full-stack Twitter/X-style social app built with **Next.js, Express and MongoDB**. Beyond the basics (posting, likes, retweets) it implements a set of real-world account and payment flows: OTP verification, device-aware login rules, audio tweets, subscription plans with Stripe, and multi-language support.

**Live demo:** _add your Vercel link here_  ·  **Backend API:** _add your Render link here_

<!--
Add 3-4 screenshots or a short GIF in docs/screenshots/ and reference them like this:
![Home feed](docs/screenshots/feed.png)
-->

## Features

| Area | What it does |
| --- | --- |
| **Auth** | Email/password and Google sign-in through Firebase Authentication |
| **Tweets** | Text tweets (200 chars) with optional image URL, likes, retweets, live feed, profile page and profile editing |
| **Audio tweets** | Record or upload audio (max 5 min / 100 MB). Requires an email OTP first |
| **Forgot password** | Request by email or phone, verify an OTP, receive a generated 12-letter password by email. Limited to one request per day |
| **Device-aware login** | Mobile logins limited to 10 AM-1 PM IST, Chrome logins need an email OTP, Edge/IE need no extra step. Every login is recorded and shown as login history in settings |
| **Subscription plans** | Free, Bronze, Silver and Gold plans limit how many tweets you can post per month. Payment through Stripe Checkout, with a PDF invoice emailed afterwards |
| **Languages** | English, Spanish, Hindi, Portuguese, Chinese and French. Switching to French is verified by email OTP, every other language by phone OTP |
| **Notifications** | Per-user notification toggle in settings |

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, Firebase Auth
- **Backend:** Node.js, Express 5, Mongoose / MongoDB, Firebase Admin, Stripe, Nodemailer, Multer, PDFKit
- **Hosting (suggested):** Vercel (frontend), Render (backend), MongoDB Atlas (database)

## How it fits together

```
Browser (Next.js)
  |-- Firebase Auth: sign in / sign up, gets an ID token
  |-- axios + "Authorization: Bearer <ID token>"
  v
Express API  --->  verifies the token with Firebase Admin
  |                then checks the request is for the signed-in user
  |-- MongoDB: users, tweets, login history, OTPs
  |-- Stripe: checkout + webhook -> applies plan, emails PDF invoice
  `-- Nodemailer: OTP and invoice emails
```

## Project structure

```
backend/
  index.js            app entry, middleware, DB connection
  middleware/auth.js  Firebase ID-token verification
  routes/             user, tweet, auth, otp, language, payment
  models/             User, Tweet (Mongoose)
  utils/              mailer, OTP, invoice PDF, IST time windows, device parser, ...
frontend/
  src/app/            Next.js pages (home, forgot-password)
  src/components/     feed, composer, tweet card, profile, settings, modals, ui/
  src/context/        AuthContext, LanguageContext, Firebase setup
  src/lib/            axios instance (adds the auth token), notifications helper
```


**1. Backend**

```bash
cd backend
cp .env.example .env     # set at least MONGODB_URL
npm install
npm run dev              # http://localhost:5000
```

**2. Frontend** (in a second terminal)

```bash
cd frontend
cp .env.example .env.local   # paste your Firebase web app config
npm install
npm run dev                  # http://localhost:3000
```


## API overview

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | token | Create the user profile after Firebase sign-up |
| GET | `/loggedinuser?email=` | token | Fetch your profile |
| PATCH | `/userupdate/:email` | token | Update profile fields (whitelisted) |
| GET | `/loginhistory/:email` | token | Your recent logins |
| POST | `/auth/login-check` | token | Device rules, Chrome OTP, records login history |
| POST | `/auth/forgot-password/request` and `/reset` | public | OTP-based password reset |
| GET | `/post` | public | Feed |
| POST | `/post`, `/post/audio` | token | Create a text or audio tweet |
| POST | `/like/:id`, `/retweet/:id` | token | Like or retweet |
| POST | `/otp/send` | token | Send an OTP for audio uploads |
| POST | `/language/request-switch` and `/confirm-switch` | token | OTP-verified language change |
| POST | `/payment/create-checkout-session` | token | Start a plan purchase |
| POST | `/payment/webhook` | Stripe signature | Confirm payment, apply plan, email invoice |

## Security notes

- API routes verify the caller's Firebase ID token and check that the request is for that user's own account.
- Clients can only set a whitelisted set of profile fields, so they cannot change their own plan or quota.
- Pending OTP codes are never returned from the user endpoints.
- Secrets live only in environment variables. `.env` files are git-ignored.

## Known limitations

- Phone OTPs are not connected to an SMS provider yet (the code path is stubbed and logs to the console).
- Uploaded audio is stored on the server's disk, which is wiped on every redeploy on hosts like Render. Moving it to S3 or Firebase Storage is the natural next step.
- There are no automated tests yet.

## Author

Built by **Sneha**. [GitHub](https://github.com/sneha080106)
