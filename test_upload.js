const fs = require('fs');

async function runTest() {
  try {
    const response = await fetch('http://localhost:5000/api/properties/1');
    
    if (!response.ok) {
      const text = await response.text();
      console.log('FAILED:', response.status, text);
    } else {
      const data = await response.json();
      console.log('SUCCESS:', data.propertyName);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

runTest();
