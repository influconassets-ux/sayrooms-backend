const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendBookingConfirmationEmail = async (customerEmail, customerName, bookingId, checkIn, checkOut, propertyName) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.warn('SendGrid is not configured. Email will not be sent.');
    return;
  }

  const msg = {
    to: customerEmail,
    from: process.env.SENDGRID_FROM_EMAIL, // Must be verified in SendGrid
    subject: `Booking Confirmation: ${propertyName} (Booking #${bookingId})`,
    text: `Hello ${customerName},\n\nYour booking for ${propertyName} is confirmed!\n\nCheck-In: ${new Date(checkIn).toLocaleDateString()}\nCheck-Out: ${new Date(checkOut).toLocaleDateString()}\n\nThank you for choosing Sayrooms!`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sayrooms Reservation</title>
      <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; }
      </style>
      </head>
      <body style="background-color: #f3f4f6; margin: 0 !important; padding: 0 !important;">

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 10px;">
        <tr>
          <td align="center">
            
            <!-- Main Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td align="center" style="background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background-color: #ffffff; color: #1e3a8a; width: 36px; height: 36px; border-radius: 8px; font-weight: 900; font-size: 20px; line-height: 36px; font-family: Arial, sans-serif;">S</td>
                      <td style="padding-left: 12px; vertical-align: middle;">
                        <span style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">SAYROOMS</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Hero Image with Premium Skeleton Fallback -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%); min-height: 200px;">
                  <img src="https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=600&q=50" alt="Sayrooms Experience" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; min-height: 200px; object-fit: cover; background-color: #e0e7ff;" />
                </td>
              </tr>

              <!-- Greeting Section -->
              <tr>
                <td align="left" style="padding: 40px 40px 10px 40px;">
                  <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827;">Booking Confirmed! 🎉</h2>
                  <p style="margin: 15px 0 0 0; font-size: 16px; color: #4b5563; line-height: 24px;">
                    Hi <strong>${customerName}</strong>,<br><br>
                    We are thrilled to let you know that your reservation at <strong>${propertyName}</strong> is locked in. Below are all the details you need for your upcoming stay.
                  </p>
                </td>
              </tr>

              <!-- Details Box -->
              <tr>
                <td align="left" style="padding: 20px 40px 30px 40px;">
                  
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 25px;">
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Booking Reference</p>
                        <p style="margin: 0; font-size: 20px; color: #111827; font-weight: 800;">#${bookingId}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Check-In</p>
                        <p style="margin: 0; font-size: 18px; color: #111827; font-weight: 600;">${new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p style="margin: 3px 0 0 0; font-size: 14px; color: #64748b;">After 3:00 PM</p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Check-Out</p>
                        <p style="margin: 0; font-size: 18px; color: #111827; font-weight: 600;">${new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p style="margin: 3px 0 0 0; font-size: 14px; color: #64748b;">Before 11:00 AM</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 10px 40px 50px 40px;">
                  <a href="https://sayrooms.com" style="display: inline-block; padding: 18px 45px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 8px;">View Booking Details</a>
                </td>
              </tr>
              
            </table>
            
            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="center" style="padding: 30px 20px; color: #6b7280; font-size: 12px; line-height: 20px;">
                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} Sayrooms. All rights reserved.</p>
                  <p style="margin: 5px 0 0 0;">Questions? Reply to this email or visit our <a href="#" style="color: #3b82f6; text-decoration: underline;">Help Center</a>.</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Confirmation email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

module.exports = {
  sendBookingConfirmationEmail
};
