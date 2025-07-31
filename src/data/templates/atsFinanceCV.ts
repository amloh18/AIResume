import { ITemplate } from '@/models/Template';

export const atsFinanceCVTemplate: Partial<ITemplate> = {
  name: "ATS Friendly Finance CV",
  category: ["ATS-Friendly", "Finance", "Professional"],
  description: "Optimized for Applicant Tracking Systems with clean, structured layout perfect for finance professionals.",
  thumbnail: "/api/placeholder/300/400",
  isDefault: false,
  isPremium: false,
  display: {
    layout: "single-column",
    padding: "96px", // 1-inch margins (96px = 1 inch at 96 DPI)
    fontFamily: "Arial, sans-serif",
    sectionSpacing: "24px"
  },
  sections: [
    {
      id: "personal_info",
      type: "header",
      content: {
        name: "LE HOANG NHI",
        contact: [
          "(44) 77 026 9598",
          "nhilhto@gmail.com",
          "www.linkedin.com/in/hoangnhile141000/"
        ],
        summary: "Ambitious MSc Finance graduate from the University of Edinburgh, with previous internships in financial services, fluent in English, French & Vietnamese. Strong skills in leveraging data analytics, performing statistical analysis and using AI to perform deep-dive research. Demonstrated excellent written, verbal skills through passion projects outside of academic & corporate experience. Seeking an entry-level opportunity in Finance."
      },
      styleSnippetId: "snippet_header_atsfinance"
    },
    {
      id: "education",
      type: "section",
      title: "EDUCATION",
      entries: [
        {
          degree: "Master of Science in Finance (Merit)",
          institution: "The University of Edinburgh",
          duration: "Sep 2022 – Nov 2023",
          details: [
            "Dissertation (Grade: Distinction): \"Unpacking ESG-Financial Performance Relationship: A Banking-Sector Study\".",
            "Relevant Modules: Financial Markets and Investment, Corporate Finance, Sustainable Finance, Blockchain Governance and Policy, Financial Statement Analysis."
          ]
        },
        {
          degree: "BSc in Law, Economics and Management (2.1)",
          institution: "University of Lyon",
          duration: "Sep 2018 – June 2022",
          details: [
            "Relevant Modules: Macroeconomics, Mathematics for Quantitative Economics, Financial Analysis, Probability and Statistics.",
            "Extra-curricular activities: Student Representative of the Faculty of Economics and Management."
          ]
        },
        {
          degree: "Bachelor of Business (International Business)",
          institution: "RMIT University",
          duration: "Oct 2020 – Apr 2022",
          details: [
            "Relevant Modules: International Trade, Commercial Law, Business Statistics, Political Economy for International Business."
          ]
        }
      ],
      styleSnippetId: "snippet_section_education"
    },
    {
      id: "experience",
      type: "section",
      title: "RELEVANT WORK EXPERIENCE",
      entries: [
        {
          title: "Global Trade and Customs Consultant Intern",
          company: "Ernst & Young",
          duration: "May 2024 – Aug 2024",
          details: [
            "Provided strategic advisory services such as customs valuation optimisation, classification analysis for imported/exported goods, risk assessment and mitigation, to over 10 multinational clients.",
            "Enhanced client response accuracy by conducting in-depth research on customs laws, regulations, and precedent cases.",
            "Contributed to successful engagements for clients like Samsung Electronics and Louis Vuitton."
          ]
        },
        {
          title: "Insight Days",
          company: "Bank of America",
          duration: "May 2023",
          details: [
            "Attended a 3-day summit hosted by BoA, presenting on the state of AI and ESG in the Banking & Finance industry.",
            "Received good feedback from BoA senior management."
          ]
        },
        {
          title: "Transfer Pricing Intern",
          company: "Ernst & Young",
          duration: "May 2020 – Aug 2020",
          details: [
            "Compiled financial reports and devised key metrics like profitability and solvency ratios.",
            "Benchmarked pricing analysis for ~15 companies, calculating arm's length prices."
          ]
        }
      ],
      styleSnippetId: "snippet_section_experience"
    },
    {
      id: "leadership",
      type: "section",
      title: "POSITION OF RESPONSIBILITY",
      entries: [
        {
          title: "Social Media Manager",
          organization: "Account with 210K followers (210K on TikTok, 12.5K on Instagram)",
          duration: "May 2020 – Present",
          details: [
            "Achieved 30M+ total views by creating content targeting students in UK, France & Scotland.",
            "Used Advanced Analytics to review metrics and adapt strategy.",
            "Conducted research across industries: fashion, beauty, F&B, education, directed videos, and achieved 100% deliverable success."
          ]
        },
        {
          title: "Executive Secretary",
          organization: "Association of Vietnamese Students in Lyon",
          duration: "Oct 2019 – Oct 2020",
          details: [
            "Organised major cultural and academic workshops.",
            "Delivered 15%+ cost savings managing ~€5000 in budget."
          ]
        }
      ],
      styleSnippetId: "snippet_section_leadership"
    },
    {
      id: "project",
      type: "section",
      title: "PROJECT EXPERIENCE",
      entries: [
        {
          title: "Kellogg's Company Analysis using top-down approach / Equity Valuation",
          company: "University of Edinburgh",
          duration: "Feb 2023 – Apr 2023",
          details: [
            "Conducted a comprehensive equity valuation using DCF and P/E ratios.",
            "Used Refinitiv & Damodaran data to forecast cash flows, WACC, and terminal value."
          ]
        }
      ],
      styleSnippetId: "snippet_section_project"
    },
    {
      id: "skills",
      type: "section",
      title: "SKILLS & QUALIFICATIONS",
      entries: [
        {
          title: "Languages",
          details: [
            "Fluent in English, French, Vietnamese; proficient in Mandarin Chinese."
          ]
        },
        {
          title: "IT Skills",
          details: [
            "Microsoft Office Suite (Excel, Word, PowerPoint, Visio)",
            "Statistical analysis software (STATA17)"
          ]
        },
        {
          title: "Certificates",
          company: "Various Institutions",
          details: [
            "Finance Accelerator Simulator Experience (AmplifyME)",
            "Stock Valuation with Comparable Company Analysis (Coursera)",
            "Analysing Company Performance using Ratios (Coursera)"
          ]
        }
      ],
      styleSnippetId: "snippet_section_skills"
    }
  ],
  snippetStyles: [
    {
      id: "snippet_header_atsfinance",
      category: "Header",
      style: {
        fontWeight: "bold",
        fontSize: "20px", // 18-22pt for name (20pt = 18pt at 96 DPI)
        color: "#1a1a1a",
        marginBottom: "12px",
        lineHeight: "1.0" // 1.0 line spacing
      }
    },
    {
      id: "snippet_section_education",
      category: "Education",
      style: {
        titleFontSize: "15px", // 14-16pt for section headings (15pt = 14pt at 96 DPI)
        entrySpacing: "10px",
        bulletIndent: "16px",
        fontSize: "11px", // 10-12pt body text (11pt = 10pt at 96 DPI)
        lineHeight: "1.0" // 1.0 line spacing
      }
    },
    {
      id: "snippet_section_experience",
      category: "Experience",
      style: {
        titleFontSize: "15px", // 14-16pt for section headings
        fontSize: "11px", // 10-12pt body text
        entryBorderLeft: "2px solid #512c90",
        paddingLeft: "12px",
        lineHeight: "1.0", // 1.0 line spacing
        lineSpacing: "1.0"
      }
    },
    {
      id: "snippet_section_leadership",
      category: "Leadership",
      style: {
        titleFontSize: "15px", // 14-16pt for section headings
        fontSize: "11px", // 10-12pt body text
        entryHighlightColor: "#f8f8f8",
        titleFontWeight: "bold",
        lineHeight: "1.0" // 1.0 line spacing
      }
    },
    {
      id: "snippet_section_project",
      category: "Projects",
      style: {
        titleFontSize: "15px", // 14-16pt for section headings
        fontSize: "11px", // 10-12pt body text
        lineHeight: "1.0" // 1.0 line spacing
      }
    },
    {
      id: "snippet_section_skills",
      category: "Skills",
      style: {
        titleFontSize: "15px", // 14-16pt for section headings
        fontSize: "11px", // 10-12pt body text
        columns: 1,
        lineHeight: "1.0" // 1.0 line spacing
      }
    }
  ],
  sectionTitles: {
    personal_info: "Contact Information",
    education: "EDUCATION",
    experience: "RELEVANT WORK EXPERIENCE",
    leadership: "POSITION OF RESPONSIBILITY",
    project: "PROJECT EXPERIENCE",
    skills: "SKILLS & QUALIFICATIONS"
  },
  metadata: {
    usageCount: 0,
    rating: 4.8,
    tags: ["ATS-Friendly", "Finance", "Professional", "Single-Column"],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}; 