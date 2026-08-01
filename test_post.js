const http = require('http');

const data = JSON.stringify({
  propertyName: "Test Property",
  rooms: JSON.stringify([{
    type: "Test",
    price: 100,
    extraAdultPrice: 50,
    extraChildPrice: 25
  }])
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/properties',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
