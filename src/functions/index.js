const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// 🔑 Change this to your admin email
const ADMIN_EMAIL = "admin@yourstore.com";

/* -----------------------------------------------------------
   1️⃣ SEND WELCOME EMAIL WHEN USER REGISTERS
----------------------------------------------------------- */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  if (!user.email) return null;

  return admin.firestore().collection("mail").add({
    to: user.email,
    message: {
      subject: "🎉 Welcome to L-Mart!",
      html: `
        <h2>Welcome, ${user.email}!</h2>
        <p>Your L-Mart account has been created successfully.</p>
        <p>Thank you for joining us ❤️</p>
      `
    }
  });
});

/* -----------------------------------------------------------
   2️⃣ SEND ORDER EMAILS (NEW ORDER + STATUS UPDATE)
----------------------------------------------------------- */
exports.sendOrderNotifications = functions.firestore
  .document("users/{userId}/orders/{orderId}")
  .onWrite(async (change, context) => {

    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;

    if (!after) return null; // Deleted order → no email

    const userId = context.params.userId;
    const orderId = after.orderId || context.params.orderId;
    const userEmail = after.customerInfo?.email;

    let currentStatus = (after.status || "confirmed").toLowerCase();
    let previousStatus = before ? (before.status || "").toLowerCase() : null;

    let userSubject = "";
    let userBody = "";
    let adminSubject = "";
    let adminBody = "";

    // 🔵 NEW ORDER CREATED
    if (!before) {
      userSubject = `✅ Order Confirmed! ID: ${orderId}`;
      userBody = `Your order ${orderId} has been placed successfully.`;

      adminSubject = `🛒 New Order Received: ${orderId}`;
      adminBody = `New order placed by ${userEmail}.`;

    } else if (before && currentStatus !== previousStatus) {
      // 🔵 STATUS CHANGE
      switch (currentStatus) {
        case "cancelled":
          userSubject = `❌ Order Cancelled: ${orderId}`;
          userBody = `Your order ${orderId} has been cancelled.`;

          adminSubject = `⚠️ Order Cancelled: ${orderId}`;
          adminBody = `User ${userEmail} cancelled the order.`;
          break;

        case "returned":
          userSubject = `↩️ Return Request: ${orderId}`;
          userBody = `We received your return request for order ${orderId}.`;

          adminSubject = `📦 Return Request: ${orderId}`;
          adminBody = `Customer requested a return.`;
          break;

        case "shipped":
          userSubject = `🚚 Order Shipped: ${orderId}`;
          userBody = `Your order ${orderId} has been shipped.`;

          adminSubject = `📦 Order Shipped: ${orderId}`;
          adminBody = `Order shipped.`;
          break;

        default:
          return null;
      }
    } else {
      return null;
    }

    // EMAIL TRIGGER
    const sendMail = (to, subject, html) =>
      admin.firestore().collection("mail").add({
        to,
        message: { subject, html },
      });

    const emailQueue = [];

    if (userEmail) {
      emailQueue.push(
        sendMail(
          userEmail,
          userSubject,
          `<p>Hello,</p><p>${userBody}</p><p>Thank you for choosing L-Mart.</p>`
        )
      );
    }

    emailQueue.push(
      sendMail(
        ADMIN_EMAIL,
        adminSubject,
        `<p>${adminBody}</p><p>User: ${userEmail}</p>`
      )
    );

    return Promise.all(emailQueue);
  });
