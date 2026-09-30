const { Worker } = require('bullmq');
const prisma = require('../prismaClient');
const { generateVoucherPDF } = require('../services/pdfService');
const { sendVoucherEmailWithAttachment } = require('../utils/emailService');

const connection = { 
  host: process.env.REDIS_HOST || '127.0.0.1', 
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined
};

// Create a worker that processes jobs from the 'booking-notifications' queue
const worker = new Worker('booking-notifications', async job => {
  const { bookingId } = job.data;
  console.log(`[Worker] Processing job for booking #${bookingId}...`);

  try {
    // 1. Fetch data from DB
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }});
    
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found in database.`);
    }
    
    // Fetch property and room details
    let propertyAddress = "Verified Sayrooms Property";
    let roomType = "Standard Room";
    let hostName = "";
    let hostContactEmail = "";
    let hostContactPhone = "";
    let hostAlternatePhone = "";
    let checkInTime = "14:00";
    let checkOutTime = "11:00";
    let cancellationPolicy = "";
    let houseRules = "";

    if (booking.propertyId) {
       const prop = await prisma.property.findUnique({ where: { id: booking.propertyId } });
       if (prop) {
           propertyAddress = `${prop.addressLine1}${prop.addressLine2 ? ', ' + prop.addressLine2 : ''}, ${prop.city}, ${prop.state}, ${prop.country} - ${prop.pincode}`;
           hostName = prop.hostName || "";
           hostContactEmail = prop.contactEmail || "";
           hostContactPhone = prop.contactPhone || "";
           hostAlternatePhone = prop.alternatePhone || "";
           checkInTime = prop.checkInTime || "14:00";
           checkOutTime = prop.checkOutTime || "11:00";
           cancellationPolicy = prop.cancellationPolicy || "";
           houseRules = prop.houseRules || "";
       }
    }

    if (booking.roomId) {
       const room = await prisma.room.findUnique({ where: { id: booking.roomId } });
       if (room) { roomType = room.type; }
    }

    // Attach all details to booking for PDF template
    booking.propertyAddress = propertyAddress;
    booking.roomType = roomType;
    booking.hostName = hostName;
    booking.hostContactEmail = hostContactEmail;
    booking.hostContactPhone = hostContactPhone;
    booking.hostAlternatePhone = hostAlternatePhone;
    booking.checkInTime = checkInTime;
    booking.checkOutTime = checkOutTime;
    booking.cancellationPolicy = cancellationPolicy;
    booking.houseRules = houseRules;

    if (!booking.customerEmail) {
      console.log(`[Worker] Booking #${bookingId} has no email. Skipping.`);
      return;
    }

    // 2. Generate PDF
    console.log(`[Worker] Generating PDF for booking #${bookingId}...`);
    const pdfBuffer = await generateVoucherPDF(booking);
    
    // 3. Send Email
    console.log(`[Worker] Sending email with attachment for booking #${bookingId}...`);
    await sendVoucherEmailWithAttachment(
      booking,
      pdfBuffer
    );

    console.log(`[Worker] Job completed successfully for booking #${bookingId}`);
  } catch (error) {
    console.error(`[Worker] Error processing job for booking #${bookingId}:`, error);
    throw error; // Throwing error triggers BullMQ to retry the job
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error: ${err.message}`);
});

console.log('[Worker] Booking notification worker started.');

module.exports = worker;
