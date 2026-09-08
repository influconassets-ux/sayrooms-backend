const twilio = require('twilio');

let twilioClient;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const sendBookingConfirmationWhatsApp = async (customerPhone, customerName, bookingId, propertyName) => {
  if (!twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
    console.warn('Twilio is not configured. WhatsApp message will not be sent.');
    return;
  }

  // Ensure phone number has country code (defaults to +91 for India if not provided, for example)
  let formattedPhone = customerPhone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+91${formattedPhone}`; // Adjust default country code as needed
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Hello ${customerName}, your booking for ${propertyName} (Booking #${bookingId}) is officially confirmed! Thank you for choosing Sayrooms.`,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${formattedPhone}`
    });
    console.log(`WhatsApp confirmation sent to ${formattedPhone}, SID: ${message.sid}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
};

module.exports = {
  sendBookingConfirmationWhatsApp
};
