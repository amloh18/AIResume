'use client';

import React from 'react';
import { Certification } from '@/lib/stores/cvStore';

interface CertificationsSectionProps {
  data: Certification[];
  template: any;
}

const CertificationsSection: React.FC<CertificationsSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Certifications
      </h2>
      
      <div className="space-y-3">
        {data.map((cert) => (
          <div key={cert.id} className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{cert.name}</h3>
              <p className="text-gray-600">{cert.issuer}</p>
              {cert.url && (
                <a href={cert.url} target="_blank" rel="noopener noreferrer" 
                   className="text-sm text-blue-600 hover:underline">
                  Verify Certificate
                </a>
              )}
            </div>
            <div className="text-right text-sm text-gray-600">
              {cert.date && (
                <div>
                  <span>Issued: {new Date(cert.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  {cert.expiryDate && (
                    <div>
                      <span>Expires: {new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificationsSection; 