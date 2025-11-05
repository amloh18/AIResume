import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto pt-8 pb-6 text-center">
      <div className="text-white text-sm mb-2">
        © CVCircle.io
      </div>
      <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
        <a 
          href="https://cvcircle.io/privacy-policy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-lime-500 transition-colors"
        >
          Privacy Policy
        </a>
        <span>•</span>
        <a 
          href="https://cvcircle.io/cookie-policy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-lime-500 transition-colors"
        >
          Cookie Policy
        </a>
        <span>•</span>
        <a 
          href="https://cvcircle.io/terms" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-lime-500 transition-colors"
        >
          Terms & Conditions
        </a>
      </div>
    </footer>
  );
};

export default Footer;

