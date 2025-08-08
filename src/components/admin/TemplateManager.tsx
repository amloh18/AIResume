'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Globe, 
  Crown, 
  Star, 
  Brain, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Trash2,
  Save,
  Plus,
  X,
  Layout,
  Palette
} from 'lucide-react';
import PreviewBridge from './PreviewBridge';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  categories?: string[];
  tier: 'free' | 'premium';
  isDefault: boolean;
  isActive: boolean;
  isPublished: boolean;
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    backgroundColor: string;
    fontSize: string;
  };
  availableSections: Array<{
    key: string;
    displayName: string;
    componentName: string;
    isList: boolean;
    defaultItemContent: any;
  }>;
  templateData: any;
  createdAt: string;
  updatedAt: string;
}

interface TemplatePreviewData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    title: string;
    summary: string;
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    duration: string;
    description: string;
  }>;
  skills: Array<string>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string;
  }>;
}

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [uploadedJson, setUploadedJson] = useState('');
  const [jsonError, setJsonError] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSortCategory, setSelectedSortCategory] = useState<string>('all');
  const [showDefaultDataModal, setShowDefaultDataModal] = useState(false);
  const [defaultDataJson, setDefaultDataJson] = useState('');
  const [defaultDataError, setDefaultDataError] = useState<string>('');
  const [previewData, setPreviewData] = useState<TemplatePreviewData>({
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      title: 'Senior Software Engineer',
      summary: 'Experienced software engineer with 5+ years of expertise in full-stack development.'
    },
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Software Engineer',
        duration: '2021 - Present',
        description: 'Led development of scalable web applications using React and Node.js.'
      }
    ],
    education: [
      {
        institution: 'University of Technology',
        degree: 'Bachelor of Computer Science',
        duration: '2015 - 2019',
        description: 'Graduated with honors, specialized in software engineering.'
      }
    ],
    skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS'],
    projects: [
      {
        name: 'E-commerce Platform',
        description: 'Built a full-stack e-commerce solution with payment integration.',
        technologies: 'React, Node.js, Stripe, MongoDB'
      }
    ]
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to fetch templates');
        // Add mock data for testing
        setTemplates([
          {
            id: '1',
            name: 'Modern Professional CV',
            description: 'A clean and modern CV template for professionals',
            category: 'cv',
            categories: ['Professional', 'Modern'],
            tier: 'premium',
            isDefault: false,
            isActive: true,
            isPublished: true,
            globalStyles: {
              fontFamily: 'Inter, system-ui, sans-serif',
              primaryColor: '#2563eb',
              backgroundColor: '#ffffff',
              fontSize: '12pt'
            },
            availableSections: [],
            templateData: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setUploadedJson(content);
        setJsonError('');
      };
      reader.readAsText(file);
    }
  };

  const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setUploadedJson(value);
    
    // Only validate JSON if there's content
    if (value.trim()) {
      try {
        const parsedJson = JSON.parse(value);
        setJsonError('');
        
        // Update preview data if the JSON contains template data
        if (parsedJson.templateData && parsedJson.templateData.personalInfo) {
          setPreviewData(parsedJson.templateData);
        } else if (parsedJson.personalInfo) {
          // If the JSON is directly CV data (not wrapped in templateData)
          setPreviewData(parsedJson);
        }
      } catch (error) {
        setJsonError('Invalid JSON format');
      }
    } else {
      setJsonError('');
    }
  };

  const handleCreateTemplate = async () => {
    if (jsonError || !uploadedJson || selectedCategories.length === 0) return;

    try {
      const templateData = JSON.parse(uploadedJson);
      
      // Prepare the template data for database
      const templateToSave = {
        ...templateData,
        categories: selectedCategories,
        isPublished: true,
        isActive: true,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Ensure template is globally available
        globalAccess: true,
        tier: templateData.tier || 'free',
        // Ensure we have a name field
        name: templateData.name || templateData.templateName || 'Untitled Template'
      };

      console.log('Saving template:', templateToSave);

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateToSave),
      });

      if (response.ok) {
        const savedTemplate = await response.json();
        console.log('Template saved successfully:', savedTemplate);
        
        setShowUploadModal(false);
        setUploadedJson('');
        setJsonError('');
        setSelectedCategories([]);
        fetchTemplates();
        
        // Show success message
        alert('Template created successfully!');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Failed to create template: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template. Please check the console for details.');
    }
  };

  const handleUpdateTemplate = async (template: Template) => {
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        const updatedTemplate = await response.json();
        setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate : t));
        alert('Template updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update template: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        alert('Template deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete template: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const getTierIcon = (tier: string) => {
    return tier === 'premium' ? (
      <Crown size={16} className="text-yellow-500" />
    ) : (
      <Star size={16} className="text-gray-400" />
    );
  };

  const getTierColor = (tier: string) => {
    return tier === 'premium' 
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  const loadSampleTemplate = () => {
    const sampleTemplate = {
      name: "Modern Professional CV",
      description: "A clean and modern CV template for professionals",
      category: "cv",
      tier: "premium",
      isDefault: false,
      isActive: true,
      isPublished: true,
      globalStyles: {
        fontFamily: "Inter, system-ui, sans-serif",
        primaryColor: "#2563eb",
        backgroundColor: "#ffffff",
        fontSize: "12pt"
      },
      availableSections: [
        {
          key: "personal_info",
          displayName: "Personal Information",
          componentName: "HeaderModern",
          isList: false,
          defaultItemContent: {}
        },
        {
          key: "experience",
          displayName: "Work Experience",
          componentName: "ExperienceTimeline",
          isList: true,
          defaultItemContent: {}
        },
        {
          key: "education",
          displayName: "Education",
          componentName: "EducationSection",
          isList: true,
          defaultItemContent: {}
        },
        {
          key: "skills",
          displayName: "Skills",
          componentName: "SkillsSection",
          isList: false,
          defaultItemContent: {}
        },
        {
          key: "projects",
          displayName: "Projects",
          componentName: "ProjectsSection",
          isList: true,
          defaultItemContent: {}
        }
      ],
      templateData: {
        personalInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA',
          title: 'Senior Software Engineer',
          summary: 'Experienced software engineer with 5+ years of expertise in full-stack development, specializing in React, Node.js, and cloud technologies.'
        },
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Software Engineer',
            duration: '2021 - Present',
            description: 'Led development of scalable web applications using React and Node.js.'
          },
          {
            company: 'Startup Inc',
            position: 'Full Stack Developer',
            duration: '2019 - 2021',
            description: 'Built and maintained multiple client-facing applications.'
          }
        ],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Computer Science',
            duration: '2015 - 2019',
            description: 'Graduated with honors, specialized in software engineering.'
          }
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker'],
        projects: [
          {
            name: 'E-commerce Platform',
            description: 'Built a full-stack e-commerce solution with payment integration.',
            technologies: 'React, Node.js, Stripe, MongoDB'
          }
        ]
      }
    };
    
    setUploadedJson(JSON.stringify(sampleTemplate, null, 2));
    setSelectedCategories(['Professional', 'Modern']);
    setPreviewData(sampleTemplate.templateData);
    setJsonError('');
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const updatePreviewData = () => {
    if (!uploadedJson.trim()) return;
    
    try {
      const parsedJson = JSON.parse(uploadedJson);
      if (parsedJson.templateData && parsedJson.templateData.personalInfo) {
        setPreviewData(parsedJson.templateData);
        setJsonError('');
      } else if (parsedJson.personalInfo) {
        // If the JSON is directly CV data (not wrapped in templateData)
        setPreviewData(parsedJson);
        setJsonError('');
      } else {
        setJsonError('No valid CV data found in JSON. Please include personalInfo section.');
      }
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleDefaultDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDefaultDataJson(value);
    
    if (value.trim()) {
      try {
        JSON.parse(value);
        setDefaultDataError('');
      } catch (error) {
        setDefaultDataError('Invalid JSON format');
      }
    } else {
      setDefaultDataError('');
    }
  };

  const loadSampleDefaultData = () => {
    const sampleData = {
      personalInfo: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@techcorp.com',
        phone: '+1 (555) 987-6543',
        location: 'New York, NY',
        title: 'Senior Frontend Developer',
        summary: 'Passionate frontend developer with 6+ years of experience building scalable web applications using React, TypeScript, and modern CSS frameworks.'
      },
      experience: [
        {
          company: 'TechCorp Inc.',
          position: 'Senior Frontend Developer',
          duration: '2022 - Present',
          description: 'Lead frontend development for enterprise applications, mentoring junior developers and implementing best practices.'
        },
        {
          company: 'StartupXYZ',
          position: 'Full Stack Developer',
          duration: '2020 - 2022',
          description: 'Built and maintained multiple client-facing applications using React, Node.js, and PostgreSQL.'
        },
        {
          company: 'Digital Agency',
          position: 'Web Developer',
          duration: '2018 - 2020',
          description: 'Developed responsive websites and e-commerce solutions for various clients.'
        }
      ],
      education: [
        {
          institution: 'University of Technology',
          degree: 'Bachelor of Computer Science',
          duration: '2014 - 2018',
          description: 'Graduated with honors, specialized in web development and user experience design.'
        }
      ],
      skills: ['React', 'TypeScript', 'JavaScript', 'CSS3', 'HTML5', 'Node.js', 'Git', 'AWS', 'Docker', 'Figma'],
      projects: [
        {
          name: 'E-commerce Platform',
          description: 'Built a full-stack e-commerce solution with payment integration and admin dashboard.',
          technologies: 'React, Node.js, Stripe, MongoDB, Redux'
        },
        {
          name: 'Task Management App',
          description: 'Developed a collaborative task management application with real-time updates.',
          technologies: 'React, Socket.io, Express, PostgreSQL'
        },
        {
          name: 'Portfolio Website',
          description: 'Created a responsive portfolio website with modern animations and SEO optimization.',
          technologies: 'Next.js, Tailwind CSS, Framer Motion'
        }
      ]
    };
    
    setDefaultDataJson(JSON.stringify(sampleData, null, 2));
    setDefaultDataError('');
  };

  // Helper function to extract CV data from template
  const extractCVDataFromTemplate = (template: Template | null): any => {
    if (!template || !template.templateData) {
      return previewData;
    }

    // If templateData is the entire template object, extract the actual CV data
    if (template.templateData.name && template.templateData.category) {
      // This is the entire template object, not CV data
      // Look for CV data within the templateData
      const cvDataKeys = ['personalInfo', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
      const cvData: any = {};
      
      cvDataKeys.forEach(key => {
        if (template.templateData[key]) {
          cvData[key] = template.templateData[key];
        }
      });
      
      return Object.keys(cvData).length > 0 ? cvData : previewData;
    }
    
    // If templateData is already CV data, return it
    return template.templateData;
  };

  const updateAllTemplatesWithDefaultData = async () => {
    if (defaultDataError || !defaultDataJson.trim()) return;

    try {
      const parsedData = JSON.parse(defaultDataJson);
      
      // Update all templates with the new default data
      const updatePromises = templates.map(template => 
        fetch(`/api/admin/templates/${template.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...template,
            templateData: parsedData
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const failedUpdates = responses.filter(response => !response.ok);

      if (failedUpdates.length === 0) {
        alert('Default data updated successfully for all templates!');
        setShowDefaultDataModal(false);
        setDefaultDataJson('');
        setDefaultDataError('');
        
        // Refresh the templates list and update preview data
        await fetchTemplates();
        
        // Update the current preview data to reflect the new default data
        setPreviewData(parsedData);
        
        // If there's a selected template, update its templateData as well
        if (selectedTemplate) {
          setSelectedTemplate({
            ...selectedTemplate,
            templateData: parsedData
          });
        }
      } else {
        alert(`Failed to update ${failedUpdates.length} templates. Please try again.`);
      }
    } catch (error) {
      console.error('Error updating default data:', error);
      alert('Failed to update default data. Please check the console for details.');
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (selectedSortCategory === 'all') return true;
    return template.categories && template.categories.includes(selectedSortCategory);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Manager</h1>
          <p className="text-gray-600 dark:text-gray-400">Upload and manage CV templates</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDefaultDataModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            <FileText size={16} />
            Add Data
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            <Upload size={16} />
            Upload Template
          </button>
        </div>
      </div>

      {/* Sorting Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedSortCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            selectedSortCategory === 'all'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All Templates
        </button>
        {['Creative', 'Professional', 'Modern'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedSortCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedSortCategory === category
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {getTierIcon(template.tier)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Layout size={14} />
                <span>{template.availableSections.length} sections</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Palette size={14} />
                <span>{template.category}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {template.isDefault && (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs rounded">
                  Default
                </span>
              )}
              {template.isPublished ? (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 text-xs rounded">
                  Published
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-xs rounded">
                  Draft
                </span>
              )}
              <span className={`px-2 py-1 text-xs rounded ${getTierColor(template.tier)}`}>
                {template.tier}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowPreviewModal(true);
                }}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                onClick={() => handleDeleteTemplate(template.id)}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Template Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload Template</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadedJson('');
                    setJsonError('');
                    setSelectedCategories([]);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - JSON Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload JSON File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        JSON Content
                      </label>
                      <button
                        onClick={loadSampleTemplate}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Load Sample
                      </button>
                    </div>
                    <textarea
                      key="json-editor"
                      value={uploadedJson}
                      onChange={handleJsonChange}
                      rows={20}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none"
                      placeholder="Paste your JSON template data here..."
                    />
                    {jsonError && (
                      <p className="text-red-600 text-sm mt-1">{jsonError}</p>
                    )}
                  </div>

                  {/* Template Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Creative', 'Professional', 'Modern'].map((category) => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedCategories.includes(category)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Template Preview</h3>
                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg" style={{ width: '210mm', height: '297mm', transform: 'scale(0.4)', transformOrigin: 'top left' }}>
                    <div className="p-8 h-full">
                      <PreviewBridge 
                        cvData={previewData}
                        templateSections={[
                          { key: 'personal_info', displayName: 'Personal Information', componentName: 'HeaderModern', isList: false, defaultItemContent: {} },
                          { key: 'experience', displayName: 'Work Experience', componentName: 'ExperienceTimeline', isList: true, defaultItemContent: {} },
                          { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
                          { key: 'skills', displayName: 'Skills', componentName: 'SkillsSection', isList: false, defaultItemContent: {} },
                          { key: 'projects', displayName: 'Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} }
                        ]}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadedJson('');
                    setJsonError('');
                    setSelectedCategories([]);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updatePreviewData}
                  disabled={!uploadedJson}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={16} />
                  Default Data
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={!!jsonError || !uploadedJson || selectedCategories.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Create Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Template Preview & Edit</h2>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bigger Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Template Preview</h3>
                                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg" style={{ width: '210mm', height: '297mm', transform: 'scale(0.6)', transformOrigin: 'top left' }}>
                  <div className="p-8 h-full">
                    <PreviewBridge 
                      cvData={extractCVDataFromTemplate(selectedTemplate)}
                      templateSections={selectedTemplate?.availableSections || [
                        { key: 'personal_info', displayName: 'Personal Information', componentName: 'HeaderModern', isList: false, defaultItemContent: {} },
                        { key: 'experience', displayName: 'Work Experience', componentName: 'ExperienceTimeline', isList: true, defaultItemContent: {} },
                        { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
                        { key: 'skills', displayName: 'Skills', componentName: 'SkillsSection', isList: false, defaultItemContent: {} },
                        { key: 'projects', displayName: 'Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} }
                      ]}
                      className="h-full"
                    />
                  </div>
                </div>
                </div>

                {/* Controls */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Template Controls</h3>
                    
                    {/* Tier Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template Tier
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (selectedTemplate) {
                              const updated = { ...selectedTemplate, tier: 'free' as const };
                              setSelectedTemplate(updated);
                              handleUpdateTemplate(updated);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            selectedTemplate?.tier === 'free'
                              ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Brain size={16} />
                          Free
                        </button>
                        <button
                          onClick={() => {
                            if (selectedTemplate) {
                              const updated = { ...selectedTemplate, tier: 'premium' as const };
                              setSelectedTemplate(updated);
                              handleUpdateTemplate(updated);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            selectedTemplate?.tier === 'premium'
                              ? 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-400 dark:text-yellow-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Crown size={16} />
                          Premium
                        </button>
                      </div>
                    </div>

                    {/* Template Status */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template Status
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTemplate?.isActive}
                            onChange={(e) => {
                              if (selectedTemplate) {
                                const updated = { ...selectedTemplate, isActive: e.target.checked };
                                setSelectedTemplate(updated);
                                handleUpdateTemplate(updated);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTemplate?.isDefault}
                            onChange={(e) => {
                              if (selectedTemplate) {
                                const updated = { ...selectedTemplate, isDefault: e.target.checked };
                                setSelectedTemplate(updated);
                                handleUpdateTemplate(updated);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Default Template</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTemplate?.isPublished}
                            onChange={(e) => {
                              if (selectedTemplate) {
                                const updated = { ...selectedTemplate, isPublished: e.target.checked };
                                setSelectedTemplate(updated);
                                handleUpdateTemplate(updated);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Published</span>
                        </label>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={selectedTemplate?.name || ''}
                          onChange={(e) => {
                            if (selectedTemplate) {
                              const updated = { ...selectedTemplate, name: e.target.value };
                              setSelectedTemplate(updated);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={selectedTemplate?.description || ''}
                          onChange={(e) => {
                            if (selectedTemplate) {
                              const updated = { ...selectedTemplate, description: e.target.value };
                              setSelectedTemplate(updated);
                            }
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          if (selectedTemplate) {
                            handleUpdateTemplate(selectedTemplate);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                      >
                        <Save size={16} />
                        Save Changes
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplate!.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Default Data Modal */}
      {showDefaultDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Default Data for All Templates</h2>
                <button
                  onClick={() => {
                    setShowDefaultDataModal(false);
                    setDefaultDataJson('');
                    setDefaultDataError('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Default Template Data (JSON)
                    </label>
                    <button
                      onClick={loadSampleDefaultData}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Load Sample Data
                    </button>
                  </div>
                  <textarea
                    value={defaultDataJson}
                    onChange={handleDefaultDataChange}
                    rows={25}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none"
                    placeholder="Paste your default template data JSON here..."
                  />
                  {defaultDataError && (
                    <p className="text-red-600 text-sm mt-1">{defaultDataError}</p>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    <AlertCircle size={16} className="inline mr-2" />
                    Important Note
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This will update the <strong>templateData</strong> field for <strong>all existing templates</strong> in the system. 
                    This data will be used for previewing templates in the admin dashboard. 
                    Make sure your JSON contains the required fields: <code>personalInfo</code>, <code>experience</code>, <code>education</code>, <code>skills</code>, and <code>projects</code>.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowDefaultDataModal(false);
                      setDefaultDataJson('');
                      setDefaultDataError('');
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateAllTemplatesWithDefaultData}
                    disabled={!!defaultDataError || !defaultDataJson.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    Update All Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager; 