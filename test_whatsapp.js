require('dotenv').config();
const { sendBookingConfirmationWhatsApp } = require('./utils/whatsappService');

const testWhatsApp = async () => {
  console.log("Attempting to send test WhatsApp message via Twilio...");

  // 👉 Replace this string with the EXACT mobile number you used to scan the QR code.
  // Make sure to include your country code, e.g., "+919876543210" or "+14155552671"
  const yourMobileNumber = "+918250703544"; // <--- CHANGE THIS BEFORE RUNNING

  try {
    const randomId = Math.floor(Math.random() * 10000);

    await sendBookingConfirmationWhatsApp(
      yourMobileNumber,           // customerPhone
      "VIP Guest",                // customerName
      `TEST-${randomId}`,         // bookingId
      "Sayrooms Grand Hotel"      // propertyName
    );

    console.log(`\n⏳ If your keys are correct and you scanned the QR code with ${yourMobileNumber}, the message should arrive in a few seconds!`);
  } catch (e) {
    console.error("Test failed:", e);
  }
};

testWhatsApp();
