const { Queue } = require('bullmq');

// Define connection (can be configured via env vars)
const connection = { 
  host: process.env.REDIS_HOST || '127.0.0.1', 
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create a new queue
const bookingQueue = new Queue('booking-notifications', { connection });

const addBookingToQueue = async (bookingId) => {
  console.log(`[Queue] Adding booking ${bookingId} to notification queue.`);
  await bookingQueue.add('send-notification', { bookingId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  });
};

module.exports = { bookingQueue, addBookingToQueue };
