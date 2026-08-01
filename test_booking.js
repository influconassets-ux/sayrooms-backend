const fetch = require('node-fetch'); // wait, fetch is built-in in Node 18+

async function testBooking() {
  const payload = {
    propertyName: "Test Package",
    bookingType: 'package',
    roomQuantity: 1,
    adults: 2,
    children: 0,
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "1234567890",
    checkIn: "2024-01-01",
    checkOut: "2024-01-05",
    totalPrice: 1000,
  };

  try {
    const res = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testBooking();
