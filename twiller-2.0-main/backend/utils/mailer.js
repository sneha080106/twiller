import nodemailer from "nodemailer";

// If EMAIL_USER / EMAIL_PASS aren't set in .env, we don't fail the request —
// we just log the email to the console so the whole app is demoable without
// setting up real SMTP credentials first. Fill in .env to send real email.
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendMail({ to, subject, html, attachments }) {
  if (!transporter) {
    console.log("=====================================");
    console.log("📧 [DEV MODE] Email not actually sent — EMAIL_USER/EMAIL_PASS not set in .env");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Body:", html);
    console.log("=====================================");
    return { devMode: true };
  }
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });
  return { devMode: false };
}

export async function sendOtpEmail(to, otp, purpose) {
  return sendMail({
    to,
    subject: "Your Twiller verification code",
    html: `<p>Your verification code for <b>${purpose}</b> is:</p>
           <h2 style="letter-spacing:4px;">${otp}</h2>
           <p>This code expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}
