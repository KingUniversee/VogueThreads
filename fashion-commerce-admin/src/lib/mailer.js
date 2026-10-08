import nodemailer from "nodemailer";

/**
 * VogueThreads Central Mailer Service - Admin Control Plane
 * Supports configured SMTP transport with development fallback simulation.
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  } else {
    transporter = {
      isDevFallback: true,
      async sendMail(mailOptions) {
        console.log("------------------------------------------------------------");
        console.log("📧 [ADMIN MAILER SIMULATION - DEV MODE]");
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log("------------------------------------------------------------");
        return {
          messageId: `admin-simulated-${Date.now()}@voguethreads.internal`,
          response: "Admin email simulated successfully",
        };
      },
    };
  }

  return transporter;
}

const BRAND_SENDER =
  process.env.SMTP_FROM ||
  process.env.EMAIL_FROM ||
  '"VogueThreads Concierge" <concierge@voguethreads.in>';

function wrapEmailHtml({ title, preheader, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f7; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #141618; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 40px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: #ffffff; text-decoration: none; }
    .btn { display: inline-block; background-color: #ffffff; color: #000000 !important; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; padding: 16px 36px; border-radius: 50px; text-decoration: none; margin: 24px 0; }
    .footer { text-align: center; font-size: 11px; color: #636366; margin-top: 36px; line-height: 1.6; }
    .divider { height: 1px; background-color: rgba(255, 255, 255, 0.08); margin: 28px 0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#0c0d0e;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  <div class="container">
    <div class="card">
      <div class="logo">
        <a href="http://localhost:3001" class="logo-text">VogueThreads</a>
      </div>
      ${contentHtml}
      <div class="divider"></div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} VogueThreads Luxury Group. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderShippedEmail({ order }) {
  if (!order || !order.customerDetails?.email) return null;
  const transport = getTransporter();

  const customerName = escapeHtml(order.customerDetails.name || "Customer");
  const orderNumber = escapeHtml(order.orderNumber);
  const carrier = escapeHtml(order.fulfillment?.carrier || "Courier Partner");
  const awbNumber = escapeHtml(order.fulfillment?.awbNumber || "In Transit");
  const trackingUrl = order.fulfillment?.trackingUrl || `http://localhost:3001/account/orders/${orderNumber}`;

  const html = wrapEmailHtml({
    title: `Order Shipped #${orderNumber}`,
    preheader: `Your order ${orderNumber} is on its way.`,
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #ffffff; text-align: center;">Your Order is En Route</h1>
      <p style="font-size: 13px; letter-spacing: 0.1em; color: #3b82f6; text-transform: uppercase; text-align: center; margin-bottom: 24px; font-weight: 700;">
        Order #${orderNumber} &bull; Shipped
      </p>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; margin-bottom: 24px; text-align: center;">
        Dear ${customerName}, your shipment has been dispatched.
      </p>
      <div style="background-color: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 12px; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Carrier</div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">${carrier}</div>
        <div style="font-size: 12px; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">AWB / Tracking Number</div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${awbNumber}</div>
      </div>
      <div style="text-align: center;">
        <a href="${trackingUrl}" class="btn">Track Shipment</a>
      </div>
    `,
  });

  const text = `Your order ${order.orderNumber} has shipped with ${carrier}. Tracking: ${awbNumber}.\nTrack link: ${trackingUrl}`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Shipped #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}

export async function sendOrderDeliveredEmail({ order }) {
  if (!order || !order.customerDetails?.email) return null;
  const transport = getTransporter();

  const customerName = escapeHtml(order.customerDetails.name || "Customer");
  const orderNumber = escapeHtml(order.orderNumber);

  const html = wrapEmailHtml({
    title: `Order Delivered #${orderNumber}`,
    preheader: `Your order ${orderNumber} has been delivered.`,
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #ffffff; text-align: center;">Delivered</h1>
      <p style="font-size: 13px; letter-spacing: 0.1em; color: #10b981; text-transform: uppercase; text-align: center; margin-bottom: 24px; font-weight: 700;">
        Order #${orderNumber} &bull; Successfully Delivered
      </p>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; margin-bottom: 24px; text-align: center;">
        Dear ${customerName}, your package has been delivered. Thank you for shopping with VogueThreads.
      </p>
      <div style="text-align: center;">
        <a href="http://localhost:3001/account/orders/${orderNumber}" class="btn">Review Order</a>
      </div>
    `,
  });

  const text = `Your VogueThreads order ${order.orderNumber} has been delivered.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Delivered #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}

export async function sendOrderCancelledEmail({ order }) {
  if (!order || !order.customerDetails?.email) return null;
  const transport = getTransporter();

  const customerName = escapeHtml(order.customerDetails.name || "Customer");
  const orderNumber = escapeHtml(order.orderNumber);
  const reason = escapeHtml(order.cancellation?.reason || "Cancelled by client request");

  const html = wrapEmailHtml({
    title: `Order Cancelled #${orderNumber}`,
    preheader: `Confirmation of cancellation for order ${orderNumber}.`,
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #ffffff; text-align: center;">Order Cancellation</h1>
      <p style="font-size: 13px; letter-spacing: 0.1em; color: #ef4444; text-transform: uppercase; text-align: center; margin-bottom: 24px; font-weight: 700;">
        Order #${orderNumber}
      </p>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; margin-bottom: 16px; text-align: center;">
        Dear ${customerName}, order #${orderNumber} has been cancelled.
      </p>
      <p style="font-size: 13px; color: #71717a; text-align: center; margin-bottom: 24px;">
        Reason: ${reason}
      </p>
    `,
  });

  const text = `Your order ${order.orderNumber} has been cancelled. Reason: ${order.cancellation?.reason || "Cancelled"}.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Cancelled #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}
