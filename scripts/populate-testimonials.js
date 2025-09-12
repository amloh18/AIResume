const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Testimonial Schema
const testimonialSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  designation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  starRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

const testimonials = [
  {
    username: "Sarah Chen",
    designation: "Software Engineer",
    company: "Google",
    starRating: 5,
    message: "CVCircle helped me land my dream job at Google. The CV builder is incredibly intuitive and professional. The AI suggestions were spot-on and helped me highlight my technical skills perfectly.",
    isActive: true
  },
  {
    username: "Michael Rodriguez",
    designation: "Product Manager",
    company: "Microsoft",
    starRating: 5,
    message: "The job tracker feature is a game-changer. I can finally keep track of all my applications in one place. The analytics helped me understand which applications were most likely to succeed.",
    isActive: true
  },
  {
    username: "Emily Johnson",
    designation: "UX Designer",
    company: "Amazon",
    starRating: 5,
    message: "The community support is amazing. I got feedback from real HR professionals that helped me improve my resume significantly. The templates are beautiful and ATS-friendly.",
    isActive: true
  },
  {
    username: "David Kim",
    designation: "Data Scientist",
    company: "Netflix",
    starRating: 5,
    message: "As a data scientist, I needed a CV that could showcase my technical projects effectively. CVCircle's templates and AI suggestions helped me create a compelling narrative.",
    isActive: true
  },
  {
    username: "Lisa Wang",
    designation: "Marketing Manager",
    company: "Spotify",
    starRating: 5,
    message: "The cover letter generator is fantastic! It helped me craft personalized cover letters for each application. I landed 3 interviews in just 2 weeks after using CVCircle.",
    isActive: true
  },
  {
    username: "James Thompson",
    designation: "DevOps Engineer",
    company: "Uber",
    starRating: 5,
    message: "The ATS optimization feature is incredible. My CV now passes through ATS systems without any issues. The job matching feature also helped me find relevant positions.",
    isActive: true
  },
  {
    username: "Maria Garcia",
    designation: "Business Analyst",
    company: "Salesforce",
    starRating: 5,
    message: "CVCircle's guided CV creation process made it so easy to build a professional resume. The industry-specific templates are exactly what I needed for the tech industry.",
    isActive: true
  },
  {
    username: "Alex Chen",
    designation: "Frontend Developer",
    company: "Airbnb",
    starRating: 5,
    message: "The CV health score feature helped me identify areas for improvement. After following the suggestions, my CV score improved from 65% to 95%. Highly recommended!",
    isActive: true
  }
];

async function populateTestimonials() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing testimonials
    await Testimonial.deleteMany({});
    console.log('Cleared existing testimonials');

    // Insert new testimonials
    const insertedTestimonials = await Testimonial.insertMany(testimonials);
    console.log(`Successfully inserted ${insertedTestimonials.length} testimonials`);

    // Display inserted testimonials
    console.log('\nInserted testimonials:');
    insertedTestimonials.forEach((testimonial, index) => {
      console.log(`${index + 1}. ${testimonial.username} - ${testimonial.designation} at ${testimonial.company}`);
    });

  } catch (error) {
    console.error('Error populating testimonials:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
populateTestimonials();
