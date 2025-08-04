#!/usr/bin/env node

const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://***:***@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority';

// Template data based on TemplateRegistry
const templates = [
  {
    _id: 'modernProfessional',
    name: 'Modern Professional',
    category: ['professional', 'modern'],
    thumbnail: '/api/templates/modernProfessional/thumbnail',
    isPremium: false,
    isDefault: true,
    description: 'Modern Professional template with 2-column layout',
    metadata: {
      rating: 4.8,
      usageCount: 1250,
      tags: ['modern', 'professional', 'clean']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'minimalistATS',
    name: 'Minimalist ATS',
    category: ['ats', 'minimalist'],
    thumbnail: '/api/templates/minimalistATS/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Minimalist ATS-friendly template with single-column layout',
    metadata: {
      rating: 4.6,
      usageCount: 890,
      tags: ['ats', 'minimalist', 'simple']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'creativeGraphical',
    name: 'Creative Graphical',
    category: ['creative', 'graphical'],
    thumbnail: '/api/templates/creativeGraphical/thumbnail',
    isPremium: true,
    isDefault: false,
    description: 'Creative Graphical template with visual elements',
    metadata: {
      rating: 4.4,
      usageCount: 567,
      tags: ['creative', 'graphical', 'visual']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'compactTextual',
    name: 'Compact Textual',
    category: ['compact', 'textual'],
    thumbnail: '/api/templates/compactTextual/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Compact Textual template optimized for content density',
    metadata: {
      rating: 4.3,
      usageCount: 432,
      tags: ['compact', 'textual', 'dense']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'twoColumnClassic',
    name: 'Two Column Classic',
    category: ['classic', 'traditional'],
    thumbnail: '/api/templates/twoColumnClassic/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Two Column Classic template with traditional layout',
    metadata: {
      rating: 4.5,
      usageCount: 678,
      tags: ['classic', 'traditional', 'two-column']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'modernMinimal',
    name: 'Modern Minimal',
    category: ['modern', 'minimal'],
    thumbnail: '/api/templates/modernMinimal/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Modern Minimal template with clean aesthetics',
    metadata: {
      rating: 4.7,
      usageCount: 945,
      tags: ['modern', 'minimal', 'clean']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function populateTemplates() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('cvcircle');
    const templatesCollection = db.collection('templates');
    
    console.log(`Preparing to insert ${templates.length} templates...`);
    
    // Clear existing templates first
    await templatesCollection.deleteMany({});
    console.log('Cleared existing templates');
    
    // Insert new templates
    const result = await templatesCollection.insertMany(templates);
    console.log(`Successfully inserted ${result.insertedCount} templates`);
    
    // Log the inserted templates
    const insertedTemplates = await templatesCollection.find({}).toArray();
    console.log('Inserted templates:');
    insertedTemplates.forEach(template => {
      console.log(`- ${template.name} (${template._id})`);
    });
    
  } catch (error) {
    console.error('Error populating templates:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
populateTemplates(); 