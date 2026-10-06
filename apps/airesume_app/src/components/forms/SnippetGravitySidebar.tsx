import React from 'react';
import { Sparkles } from 'lucide-react';

interface SnippetGravitySidebarProps {
  header: string; // The job title or project name
  onSelectSnippet: (snippet: string) => void;
}

const COMMON_SNIPPETS: Record<string, string[]> = {
  'software': ['AWS', 'Kubernetes', 'Microservices', 'React', 'Node.js', 'TypeScript', 'Docker', 'CI/CD', 'REST APIs', 'GraphQL', 'System Architecture'],
  'developer': ['AWS', 'Kubernetes', 'Microservices', 'React', 'Node.js', 'TypeScript', 'Docker', 'CI/CD', 'REST APIs', 'GraphQL', 'System Architecture'],
  'product manager': ['Agile', 'Scrum', 'Jira', 'Product Roadmap', 'A/B Testing', 'User Research', 'Go-to-Market', 'Data Analysis', 'Stakeholder Management', 'Cross-functional Leadership'],
  'data': ['Python', 'SQL', 'Tableau', 'Machine Learning', 'Data Modeling', 'ETL', 'Spark', 'Snowflake', 'Statistical Analysis', 'A/B Testing'],
  'designer': ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'User Research', 'Design Systems', 'Adobe Creative Suite', 'Interaction Design'],
  'marketing': ['SEO', 'Content Strategy', 'Social Media', 'Email Campaigns', 'Google Analytics', 'Brand Management', 'Market Research', 'Copywriting'],
  'sales': ['B2B Sales', 'CRM', 'Lead Generation', 'Account Management', 'Sales Strategy', 'Negotiation', 'Cold Calling', 'Salesforce'],
  'default': ['Leadership', 'Project Management', 'Problem Solving', 'Communication', 'Strategic Planning', 'Data Analysis', 'Team Collaboration', 'Process Improvement', 'Cross-functional Teamwork']
};

export const SnippetGravitySidebar: React.FC<SnippetGravitySidebarProps> = ({ header, onSelectSnippet }) => {
  const normalizedHeader = (header || '').toLowerCase();
  let snippets = COMMON_SNIPPETS['default'];
  
  for (const [key, value] of Object.entries(COMMON_SNIPPETS)) {
    if (key !== 'default' && normalizedHeader.includes(key)) {
      snippets = value;
      break;
    }
  }

  return (
    <div className="hidden xl:block w-64 border-l border-white/10 pl-6 shrink-0">
      <div className="flex items-center gap-2 mb-4 text-[#013f2e]">
        <Sparkles size={16} />
        <h4 className="text-sm font-semibold uppercase tracking-wider">Recommended for you</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {snippets.map((snippet) => (
          <button
            key={snippet}
            type="button"
            onClick={() => onSelectSnippet(snippet)}
            className="px-3 py-1.5 bg-white/5 hover:bg-[#013f2e]/20 border border-white/10 hover:border-[#013f2e]/50 rounded-full text-xs text-white/80 hover:text-[#013f2e] transition-all transform hover:scale-[1.01]"
            title={`Add "${snippet}" to description`}
          >
            + {snippet}
          </button>
        ))}
      </div>
    </div>
  );
};
