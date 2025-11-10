'use client';

import React, { useState, useRef } from 'react';
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
  const navRef = useRef<HTMLElement>(null);

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

  const handleLogoClick = () => {
    if (typeof window === 'undefined') return;
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className="card-nav">
        <div className="card-nav-content">
          <button 
            className="logo-container"
            onClick={handleLogoClick}
            aria-label="Go to top"
            type="button"
          >
            <div className="logo-image-wrapper">
              <img 
                src="/images/logo.png" 
                alt="CVCircle Logo" 
                width={32}
                height={32}
                className="logo-image"
                loading="eager"
                onError={(e) => {
                  // Fallback to a data URL or text if image fails
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback';
                      fallback.textContent = 'CV';
                      fallback.style.cssText = 'width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #80FF00; color: black; border-radius: 4px; font-weight: bold;';
                      parent.appendChild(fallback);
                    }
                  }
                }}
              />
            </div>
            <span className="logo-text">
              <span className="logo-cv">CV</span>
              <span className="logo-circle">Circle</span>
            </span>
          </button>

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
