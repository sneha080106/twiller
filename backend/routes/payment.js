import express from "express";
import Stripe from "stripe";
import User from "../models/user.js";
import { PLANS } from "../utils/plans.js";
import { isWithinISTWindow, istMonthKey } from "../utils/timeWindow.js";
import { sendMail } from "../utils/mailer.js";
import { generateInvoicePdfBuffer } from "../utils/invoice.js";
import { requireAuth, requireSelfEmail } from "../middleware/auth.js";

const router = express.Router();

// If STRIPE_SECRET_KEY isn't set, payments run in "dev mode": the plan is
// applied immediately and an invoice email is sent, without ever calling
// Stripe. Add a real key to backend/.env to go through actual Stripe Checkout.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function applySubscription(email, planKey) {
  const user = await User.findOne({ email });
  if (!user) return null;
  user.plan = planKey;
  user.planCycleMonth = istMonthKey();
  user.tweetsUsedThisCycle = 0;
  user.planRenewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();
  return user;
}

async function sendInvoiceEmail(email, planKey) {
  const user = await User.findOne({ email });
  if (!user) return;
  const plan = PLANS[planKey];
  const pdf = await generateInvoicePdfBuffer({ user, plan, invoiceDate: new Date().toLocaleString("en-IN") });
  await sendMail({
    to: email,
    subject: "Your Twiller Subscription Invoice",
    html: `<p>Hi ${user.displayName},</p>
           <p>Thanks for subscribing to the <b>${plan.name}</b> plan
           (${plan.price === 0 ? "Free" : `₹${plan.price}/month`}). Your invoice is attached.</p>`,
    attachments: [{ filename: "twiller-invoice.pdf", content: pdf }],
  });
}

// --- Feature 4: create a checkout session (time-restricted to 10-11 AM IST) ---
router.post("/payment/create-checkout-session", requireAuth, requireSelfEmail((req) => req.body.email), async (req, res) => {
  try {
    if (!isWithinISTWindow(10, 0, 11, 0)) {
      return res.status(403).send({ error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." });
    }

    const { email, plan } = req.body;
    if (!PLANS[plan] || plan === "free") {
      return res.status(400).send({ error: "Please choose a paid plan (Bronze, Silver, or Gold)." });
    }
    const planInfo = PLANS[plan];

    if (!stripe) {
      await applySubscription(email, plan);
      await sendInvoiceEmail(email, plan);
      return res.status(200).send({
        devMode: true,
        message: `Stripe isn't configured, so your subscription was applied directly (dev mode). You're now on the ${planInfo.name} plan.`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `Twiller ${planInfo.name} Plan (Monthly)` },
            unit_amount: planInfo.price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { email, plan },
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/subscribe?success=true`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/subscribe?canceled=true`,
    });

    return res.status(200).send({ url: session.url });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Stripe needs the RAW request body to verify webhook signatures, so this
// route brings its own express.raw() middleware — see index.js, which is
// careful to skip the global express.json() parser for this one path.
router.post("/payment/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(200).send();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { email, plan } = session.metadata || {};
    if (email && plan) {
      await applySubscription(email, plan);
      await sendInvoiceEmail(email, plan);
    }
  }

  res.status(200).send();
});

export default router;
