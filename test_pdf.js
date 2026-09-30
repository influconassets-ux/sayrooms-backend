const fs = require('fs');
const { generateVoucherPDF } = require('./services/pdfService');

const runTest = async () => {
  console.log('Generating sample voucher PDF...');
  
  // Dummy booking data matching Prisma schema
  const dummyBooking = {
    id: 10245,
    propertyName: 'Sayrooms Grand Resort & Spa',
    roomQuantity: 2,
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    customerPhone: '+91-9876543210',
    checkIn: new Date(Date.now() + 86400000), // Tomorrow
    checkOut: new Date(Date.now() + 86400000 * 3), // 3 days from now
    totalPrice: 4500.00,
    adults: 2,
    children: 1,
    createdAt: new Date(),
    propertyAddress: "123 Beachfront Avenue, North Goa, Goa, India - 403516",
    roomType: "Ocean View Suite with Balcony"
  };

  try {
    const pdfBuffer = await generateVoucherPDF(dummyBooking);
    fs.writeFileSync('sample_voucher.pdf', pdfBuffer);
    console.log('✅ Successfully created sample_voucher.pdf!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    process.exit(1);
  }
};

runTest();
