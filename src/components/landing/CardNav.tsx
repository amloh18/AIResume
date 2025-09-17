'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import './CardNav.css';

interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface CardNavProps {
  logo: string;
  links: NavLink[];
  className?: string;
  onCtaClick?: () => void;
}

const CardNav = ({
  logo,
  links,
  className = '',
  onCtaClick
}: CardNavProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      // Default action - redirect to sign-in
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
    }
  };

  const scrollToSection = (href: string) => {
    if (typeof window === 'undefined') return;
    
    // Close mobile menu when clicking a link
    setIsMobileMenuOpen(false);
    
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav className="card-nav">
        <div className="card-nav-content">
          <div className="logo-container">
            <span className="logo-text">
              <span className="text-lime-400">CV</span>Circle
            </span>
          </div>

          <div className="nav-links">
            {links.map((link, index) => (
              <button
                key={`${link.label}-${index}`}
                className="nav-link"
                onClick={() => scrollToSection(link.href)}
                aria-label={link.ariaLabel}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="card-nav-cta-button"
              onClick={handleCtaClick}
            >
              Login
            </button>
            
            {/* Mobile Menu Button */}
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-dropdown">
          <div className="mobile-menu-content">
            {links.map((link, index) => (
              <button
                key={`mobile-${link.label}-${index}`}
                className="mobile-nav-link"
                onClick={() => scrollToSection(link.href)}
                aria-label={link.ariaLabel}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              className="mobile-cta-button"
              onClick={handleCtaClick}
            >
              Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardNav;
