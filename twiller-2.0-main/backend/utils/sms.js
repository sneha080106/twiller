// Dev-mode SMS "sender". Twiller doesn't ship with a paid SMS provider
// configured out of the box, so by default this just logs the message to the
// console (and the calling route echoes the code back in the response as
// `devOtp` so you can test the flow end-to-end locally).
//
// To send real text messages, install your provider's SDK (e.g. `npm i twilio`)
// and replace the body of this function — everything that calls sendSms()
// elsewhere in the app stays the same.
export async function sendSms(to, message) {
  if (!process.env.SMS_API_KEY) {
    console.log("=====================================");
    console.log("📱 [DEV MODE] SMS not actually sent — no SMS provider configured");
    console.log("To:", to);
    console.log("Message:", message);
    console.log("=====================================");
    return { devMode: true };
  }

  // Example using Twilio, once you've `npm i twilio` and set the env vars:
  //
  // import twilio from "twilio";
  // const client = twilio(process.env.SMS_API_KEY, process.env.SMS_API_SECRET);
  // await client.messages.create({ to, from: process.env.SMS_FROM_NUMBER, body: message });
  // return { devMode: false };

  return { devMode: true };
}
