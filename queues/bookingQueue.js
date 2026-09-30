const { Queue } = require('bullmq');

// Define connection (can be configured via env vars)
const connection = { 
  host: process.env.REDIS_HOST || '127.0.0.1', 
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined
};

// Create a new queue
const bookingQueue = new Queue('booking-notifications', { connection });

const addBookingToQueue = async (bookingId) => {
  try {
    await bookingQueue.add('send-voucher', { bookingId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
    console.log(`Booking ${bookingId} added to notification queue.`);
  } catch (error) {
    console.error('Error adding to booking queue:', error);
  }
};

module.exports = { bookingQueue, addBookingToQueue };
