const http = require('http');

http.get('http://localhost:5000/api/properties', (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    const properties = JSON.parse(data);
    if (properties.length > 0) {
      const p = properties[0]; // Assuming the first one or we can print all
      console.log('Property ID:', p.id);
      console.log('Rooms:');
      p.rooms.forEach(r => {
        console.log(`- Type: ${r.type}, Base: ${r.price}, Extra Adult: ${r.extraAdultPrice}, Extra Child: ${r.extraChildPrice}, Capacity: ${r.capacity}`);
      });
    } else {
      console.log('No properties found.');
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
