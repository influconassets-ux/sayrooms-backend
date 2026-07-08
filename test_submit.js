const FormData = require('form-data');
const fetch = require('node-fetch'); // wait, fetch is built-in in Node 18+

async function run() {
  const formData = new FormData();
  formData.append('propertyName', 'Test Property');
  formData.append('propertyType', 'hotel');
  formData.append('maxGuests', '4');
  formData.append('totalRooms', '2');
  formData.append('totalBathrooms', '2');
  formData.append('checkInTime', '12:00 PM');
  formData.append('checkOutTime', '11:00 AM');
  formData.append('description', 'Test Description');
  formData.append('propertyId', 'TEST-001');

  formData.append('addressLine1', 'Test Address');
  formData.append('city', 'Test City');
  formData.append('state', 'Test State');
  formData.append('pincode', '123456');
  formData.append('country', 'India');
  formData.append('latitude', '22.0');
  formData.append('longitude', '88.0');

  formData.append('amenities', JSON.stringify(['wifi', 'ac']));
  formData.append('tags', JSON.stringify(['Couple Friendly']));
  formData.append('nearbyPlaces', JSON.stringify([]));

  formData.append('rooms', JSON.stringify([{
    type: 'Standard',
    price: '1000',
    capacity: '2',
    size: '100 sqft',
    description: 'Test room'
  }]));

  try {
    const res = await fetch('http://localhost:5000/api/properties', {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      console.log('Success:', await res.json());
    } else {
      console.log('Error Status:', res.status);
      console.log('Error Body:', await res.text());
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

run();
