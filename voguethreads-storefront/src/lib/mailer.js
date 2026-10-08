import nodemailer from "nodemailer";

/**
 * VogueThreads Central Mailer Service
 * Supports configured SMTP transport with development fallback simulation.
 */

// Escape HTML entities to prevent HTML injection in emails
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
    // Development fallback transporter (mock / ethereal / logging)
    transporter = {
      isDevFallback: true,
      async sendMail(mailOptions) {
        console.log("------------------------------------------------------------");
        console.log("📧 [VOGUETHREADS EMAIL SIMULATION - DEV MODE]");
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log("Text preview:", mailOptions.text?.slice(0, 300));
        console.log("------------------------------------------------------------");
        return {
          messageId: `simulated-${Date.now()}@voguethreads.internal`,
          response: "Email simulated successfully (SMTP not configured in env)",
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

/**
 * Common HTML wrapper with VogueThreads Luxury Liquid styling
 */
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
    .tagline { font-size: 9px; letter-spacing: 0.25em; color: #8e8e93; text-transform: uppercase; margin-top: 6px; }
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
        <div class="tagline">Atelier &bull; Luxury &bull; Silhouettes</div>
      </div>
      ${contentHtml}
      <div class="divider"></div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} VogueThreads Luxury Group. All rights reserved.<br>
        This email was sent to confirm your request with VogueThreads.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Verification Email
 */
export async function sendVerificationEmail({ to, name, verificationUrl }) {
  const safeName = escapeHtml(name || "Customer");
  const transport = getTransporter();

  const html = wrapEmailHtml({
    title: "Verify Your VogueThreads Account",
    preheader: "Activate your VogueThreads membership to experience curated luxury silhouettes.",
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff; text-align: center;">Welcome, ${safeName}</h1>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; text-align: center; margin-bottom: 24px;">
        Thank you for choosing VogueThreads. To secure your client account and confirm access to our private collections, please verify your email address.
      </p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="btn">Verify Email Address</a>
      </div>
      <p style="font-size: 12px; line-height: 1.6; color: #71717a; text-align: center; margin-top: 20px;">
        This verification link will expire in 24 hours. If you did not create an account with VogueThreads, you may safely disregard this message.
      </p>
      <p style="font-size: 11px; color: #52525b; text-align: center; word-break: break-all; margin-top: 16px;">
        Or paste this link in your browser:<br><a href="${verificationUrl}" style="color: #a1a1aa;">${verificationUrl}</a>
      </p>
    `,
  });

  const text = `Welcome to VogueThreads, ${name || "Customer"}.\n\nPlease verify your account by opening this link in your browser:\n${verificationUrl}\n\nThis link expires in 24 hours.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to,
    subject: "Verify your VogueThreads Account",
    text,
    html,
  });
}

/**
 * 2. Password Reset Email
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const safeName = escapeHtml(name || "Customer");
  const transport = getTransporter();

  const html = wrapEmailHtml({
    title: "Reset Your Password",
    preheader: "Securely reset your VogueThreads client account credentials.",
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff; text-align: center;">Password Assistance</h1>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; text-align: center; margin-bottom: 24px;">
        Hello ${safeName}, we received a request to reset the password for your VogueThreads account.
      </p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p style="font-size: 12px; line-height: 1.6; color: #71717a; text-align: center; margin-top: 20px;">
        This password reset link will expire in 1 hour. If you did not request this, please ignore this email; your credentials remain secure.
      </p>
      <p style="font-size: 11px; color: #52525b; text-align: center; word-break: break-all; margin-top: 16px;">
        Or paste this link into your browser:<br><a href="${resetUrl}" style="color: #a1a1aa;">${resetUrl}</a>
      </p>
    `,
  });

  const text = `Hello ${name || "Customer"},\n\nWe received a request to reset your VogueThreads password. Click below to proceed:\n${resetUrl}\n\nThis link expires in 1 hour.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to,
    subject: "Reset your VogueThreads password",
    text,
    html,
  });
}

/**
 * 3. Email Change Verification
 */
export async function sendEmailChangeVerificationEmail({ to, name, verificationUrl }) {
  const safeName = escapeHtml(name || "Customer");
  const transport = getTransporter();

  const html = wrapEmailHtml({
    title: "Confirm Your New Email Address",
    preheader: "Verify your new email address for VogueThreads.",
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff; text-align: center;">Email Change Request</h1>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; text-align: center; margin-bottom: 24px;">
        Hello ${safeName}, please confirm that you wish to update your primary account email to this address.
      </p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="btn">Confirm New Email</a>
      </div>
      <p style="font-size: 12px; line-height: 1.6; color: #71717a; text-align: center; margin-top: 20px;">
        This confirmation link expires in 2 hours.
      </p>
    `,
  });

  const text = `Hello ${name || "Customer"},\n\nPlease confirm your new email for VogueThreads by visiting:\n${verificationUrl}\n\nThis link expires in 2 hours.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to,
    subject: "Confirm your new email address — VogueThreads",
    text,
    html,
  });
}

/**
 * 4. Order Confirmation Email
 */
export async function sendOrderConfirmationEmail({ order }) {
  if (!order || !order.customerDetails?.email) return null;
  const transport = getTransporter();

  const customerName = escapeHtml(order.customerDetails.name || "Customer");
  const orderNumber = escapeHtml(order.orderNumber);
  const grandTotal = Number(order.pricing?.grandTotal || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  const itemsListHtml = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #ffffff;">
          <strong>${escapeHtml(item.title)}</strong><br>
          <span style="font-size: 11px; color: #8e8e93;">Size: ${escapeHtml(item.size)} &bull; Color: ${escapeHtml(item.color)} &bull; Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #ffffff; text-align: right;">
          ${(Number(item.unitPrice || 0) * (item.quantity || 1)).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
        </td>
      </tr>
    `
    )
    .join("");

  const html = wrapEmailHtml({
    title: `Order Confirmed #${orderNumber}`,
    preheader: `Thank you for your order ${orderNumber}. We are preparing your garment.`,
    contentHtml: `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #ffffff; text-align: center;">Order Confirmed</h1>
      <p style="font-size: 13px; letter-spacing: 0.1em; color: #10b981; text-transform: uppercase; text-align: center; margin-bottom: 24px; font-weight: 700;">
        Order #${orderNumber}
      </p>
      <p style="font-size: 14px; line-height: 1.7; color: #a1a1aa; margin-bottom: 24px;">
        Dear ${customerName}, your order has been received and confirmed. Our artisans are preparing your selection for dispatch.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        ${itemsListHtml}
      </table>
      <div style="background-color: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #ffffff;">
          <span>Total</span>
          <span style="float: right;">${grandTotal}</span>
        </div>
      </div>
      <div style="text-align: center;">
        <a href="http://localhost:3001/account/orders/${orderNumber}" class="btn">View Order Details</a>
      </div>
    `,
  });

  const text = `Thank you for your order, ${customerName}.\n\nOrder Number: ${order.orderNumber}\nTotal: ${grandTotal}\n\nView details: http://localhost:3001/account/orders/${order.orderNumber}`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Confirmed #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}

/**
 * 5. Order Shipped Email
 */
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

/**
 * 6. Order Delivered Email
 */
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
        Dear ${customerName}, your package has been delivered. We hope you cherish your new VogueThreads pieces.
      </p>
      <div style="text-align: center;">
        <a href="http://localhost:3001/account/orders/${orderNumber}" class="btn">Review Order</a>
      </div>
    `,
  });

  const text = `Your VogueThreads order ${order.orderNumber} has been delivered. Thank you for shopping with us.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Delivered #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}

/**
 * 7. Order Cancelled Email
 */
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
        Dear ${customerName}, this email confirms that order #${orderNumber} has been cancelled.
      </p>
      <p style="font-size: 13px; color: #71717a; text-align: center; margin-bottom: 24px;">
        Reason: ${reason}
      </p>
    `,
  });

  const text = `Your VogueThreads order ${order.orderNumber} has been cancelled. Reason: ${order.cancellation?.reason || "Cancelled"}.`;

  return transport.sendMail({
    from: BRAND_SENDER,
    to: order.customerDetails.email,
    subject: `Order Cancelled #${order.orderNumber} — VogueThreads`,
    text,
    html,
  });
}
