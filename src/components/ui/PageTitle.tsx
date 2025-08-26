'use client';

import { useEffect } from 'react';

interface PageTitleProps {
  title?: string;
  showBranding?: boolean;
}

const PageTitle: React.FC<PageTitleProps> = ({ 
  title, 
  showBranding = true 
}) => {
  useEffect(() => {
    const originalTitle = document.title;
    
    if (showBranding) {
      if (title) {
        document.title = `${title} | CVCircle.io`;
      } else {
        document.title = 'CVCircle.io';
      }
    } else if (title) {
      document.title = title;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [title, showBranding]);

  return null;
};

export default PageTitle;
