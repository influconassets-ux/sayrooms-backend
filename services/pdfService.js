const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const generateVoucherPDF = async (bookingData) => {
  try {
    // Read HTML template
    const templatePath = path.join(__dirname, '../templates/voucherTemplate.html');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);
    
    // Format dates
    const checkInDate = new Date(bookingData.checkIn).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
    });
    const checkOutDate = new Date(bookingData.checkOut).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
    });
    const bookingDate = new Date(bookingData.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    // Read Logo as base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../assets/logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64');
    } catch(err) {
      console.warn("Logo not found, fallback to empty string");
    }

    // Inject dynamic data
    const html = template({
      ...bookingData,
      checkInFormatted: checkInDate,
      checkOutFormatted: checkOutDate,
      bookingDateFormatted: bookingDate,
      logoBase64: logoBase64
    });

    const isLinux = process.platform === 'linux';
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu',
        ...(isLinux ? ['--no-zygote', '--single-process'] : [])
      ] 
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    await browser.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF voucher:', error);
    throw error;
  }
};

module.exports = { generateVoucherPDF };
