const mongoose = require('mongoose');

const holidayPackageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: String, default: '2 Nights • 3 Days' },
  shortDescription: { type: String },
  image: { type: String },
  price: { type: String, required: true },
  
  // New Pricing Fields
  pricingModel: { type: String, enum: ['per_couple', 'per_family', 'per_person'], default: 'per_person' },
  extraChildPrice: { type: Number, default: 0 },
  
  // Details Tab
  about: { type: String },
  quickInfo: { type: [String], default: [] }, // e.g. "Breakfast Included", "Pickup & Drop"
  highlights: { type: [String], default: [] }, // Bullet points under Package Highlights
  inclusions: { type: [String], default: [] }, // What's Included (icons mapped on frontend)
  
  // Itinerary Tab
  itinerary: [{
    dayNumber: Number,
    title: String,
    activities: [String]
  }],
  
  // Media & Places Tab
  gallery: { type: [String], default: [] }, // Array of image URLs
  placesToVisit: [{
    name: String,
    image: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('HolidayPackage', holidayPackageSchema);
