require('dotenv').config();
const { sendBookingConfirmationEmail } = require('./utils/emailService');

const testEmail = async () => {
  console.log("Attempting to send test email via SendGrid...");

  // 👉 Replace this string with YOUR actual personal email address
  const yourEmailAddress = "tabc1196@gmail.com";

  try {
    const randomId = Math.floor(Math.random() * 10000);

    await sendBookingConfirmationEmail(
      yourEmailAddress,           // customerEmail
      "Tapan",        // customerName
      `TEST-${randomId}`,         // bookingId
      new Date(),                 // checkIn (Today)
      new Date(Date.now() + 86400000), // checkOut (Tomorrow)
      "Sayrooms Grand Hotel"      // propertyName
    );
    console.log(`✅ Success! Please check the inbox for ${yourEmailAddress}`);
  } catch (e) {
    console.error("❌ Test failed:", e);
  }
}

testEmail();
