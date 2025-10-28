// Utility function to add page break CSS to templates
export const addPageBreakCSS = (existingCSS: string = '') => {
  const pageBreakCSS = `
    /* Page break rules for multi-page CVs */
    .header,
    .profile-picture,
    .profile-photo,
    .name-section,
    .contact-section,
    .sidebar {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Hide headers on pages after the first */
    @page {
      margin: 0.5in;
    }
    
    @page :first {
      margin-top: 0.5in;
    }
    
    @page :not(:first) {
      margin-top: 0.5in;
    }
    
    /* Ensure headers only appear on first page */
    .header {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* Prevent orphaned headers */
    .section-title {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* Keep related content together */
    .experience-item,
    .education-item,
    .project-item,
    .award-item {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Print optimizations */
    @media print {
      .header {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      /* Hide headers on subsequent pages */
      @page :not(:first) {
        .header {
          display: none !important;
        }
      }
    }
  `;
  
  return existingCSS + pageBreakCSS;
};

// Utility function to get profile picture with fallback
export const getProfilePicture = (basics: any, fallbackText: string = 'Photo') => {
  if (basics?.image) {
    return (
      <img 
        src={basics.image} 
        alt={basics.name || 'Profile'} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      />
    );
  }
  return fallbackText;
};

// Utility function to get profile picture element for templates
export const getProfilePictureElement = (basics: any, className: string = '', fallbackText: string = 'Photo') => {
  if (basics?.image) {
    return (
      <div className={className}>
        <img 
          src={basics.image} 
          alt={basics.name || 'Profile'} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </div>
    );
  }
  return (
    <div className={className}>
      {fallbackText}
    </div>
  );
};
