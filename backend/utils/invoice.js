import PDFDocument from "pdfkit";

/**
 * Builds a simple one-page PDF invoice and resolves with its Buffer,
 * so it can be attached directly to the confirmation email.
 */
export function generateInvoicePdfBuffer({ user, plan, invoiceDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("Twiller", { align: "left" });
    doc.fontSize(12).fillColor("#555").text("Subscription Invoice", { align: "left" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(11);
    doc.text(`Invoice date: ${invoiceDate}`);
    doc.text(`Billed to: ${user.displayName} (${user.email})`);
    doc.moveDown();

    doc.fontSize(14).text("Plan details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Plan: ${plan.name}`);
    doc.text(`Price: ${plan.price === 0 ? "Free" : `₹${plan.price} / month`}`);
    doc.text(`Tweet limit: ${plan.limit === Infinity ? "Unlimited" : `${plan.limit} tweets / month`}`);
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor("#555").text("Thank you for subscribing to Twiller!");

    doc.end();
  });
}
