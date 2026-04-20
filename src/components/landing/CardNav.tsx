'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import './CardNav.css';

interface SubmenuItem {
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
  snapshot?: string;
  ariaLabel?: string;
  isExternal?: boolean;
}

interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
  isExternal?: boolean;
  submenu?: SubmenuItem[];
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
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [isAtHero, setIsAtHero] = useState(true);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // Determine if any submenu is currently open
  const isAnySubmenuOpen = hoveredLink !== null;

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      // Default action - route to sign in page
      router.push('/sign-in');
    }
  };


  const scrollToSection = (href: string, isExternal?: boolean) => {
    if (typeof window === 'undefined') return;
    
    // Close mobile menu when clicking a link
    setIsMobileMenuOpen(false);
    
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      if (isExternal) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }
    }
  };

  const handleLogoClick = () => {
    if (typeof window === 'undefined') return;
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  // Track which section is currently in view
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroSection = document.getElementById('hero');
      const heroHeight = heroSection?.offsetHeight || 0;
      
      // Check if we're at the hero section (within first 100px of scroll or within hero height)
      if (scrollY < heroHeight * 0.5) {
        setIsAtHero(true);
        setCurrentSection(null);
        return;
      }

      setIsAtHero(false);

      // Find which section is currently in view
      const sections = links
        .filter(link => link.href.startsWith('#'))
        .map(link => {
          const id = link.href.substring(1);
          const element = document.getElementById(id);
          if (!element) return null;
          
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Section is in view if it's in the viewport (with some threshold)
          const isInView = rect.top < viewportHeight * 0.5 && rect.bottom > viewportHeight * 0.3;
          
          return isInView ? { id, top: rect.top } : null;
        })
        .filter(Boolean) as Array<{ id: string; top: number }>;

      if (sections.length > 0) {
        // Get the section closest to the top of the viewport
        const closestSection = sections.reduce((prev, curr) => 
          Math.abs(curr.top) < Math.abs(prev.top) ? curr : prev
        );
        setCurrentSection(closestSection.id);
      } else {
        setCurrentSection(null);
      }
    };

    // Initial check
    handleScroll();

    // Throttle scroll events
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [links]);

  return (
    <div className={`card-nav-container ${className} ${isAnySubmenuOpen ? 'submenu-open' : ''}`}>
      <nav ref={navRef} className="card-nav">
        <div className="card-nav-content">
          <button 
            className="logo-container"
            onClick={handleLogoClick}
            aria-label="Go to top"
            type="button"
          >
            <div className="logo-image-wrapper">
              <Logo size="md" showText={false} />
            </div>
            <span className="logo-text" aria-label={logo}>
              <span className="logo-cv">CV</span>
              <span className="logo-circle">Circle</span>
            </span>
          </button>

          <div className="nav-links">
            {links.map((link, index) => {
              const sectionId = link.href.startsWith('#') ? link.href.substring(1) : null;
              const isCurrentSection = sectionId === currentSection;
              const shouldHide = !isAtHero && isCurrentSection;
              const hasSubmenu = link.submenu && link.submenu.length > 0;
              const isHovered = hoveredLink === link.label;
              
              return (
                <div
                  key={`${link.label}-${index}`}
                  className={`nav-link-wrapper ${hasSubmenu ? 'has-submenu' : ''} ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => hasSubmenu && setHoveredLink(link.label)}
                  onMouseLeave={() => hasSubmenu && setHoveredLink(null)}
                >
                  <button
                    className="nav-link"
                    onClick={() => scrollToSection(link.href, link.isExternal)}
                    aria-label={link.ariaLabel}
                    style={{
                      display: shouldHide ? 'none' : 'block'
                    }}
                  >
                    {link.label}
                  </button>
                  
                  {/* Submenu Dropdown */}
                  {hasSubmenu && (
                    <div className="submenu-dropdown">
                      {link.submenu!.map((subLink, subIndex) => (
                        <button
                          key={`sub-${link.label}-${subIndex}`}
                          className="submenu-link"
                          onClick={() => scrollToSection(subLink.href, subLink.isExternal)}
                          aria-label={subLink.ariaLabel}
                        >
                          {subLink.snapshot && subLink.icon && (
                            <div className={`submenu-link-icon border ${subLink.snapshot}`}>
                              {subLink.icon}
                            </div>
                          )}
                          {!subLink.snapshot && subLink.icon && (
                            <div className="submenu-link-icon bg-white/5 border border-white/10">
                              {subLink.icon}
                            </div>
                          )}
                          <div className="submenu-link-content">
                            <span className="submenu-link-title">{subLink.label}</span>
                            {subLink.description && (
                              <span className="submenu-link-desc">{subLink.description}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="nav-actions flex items-center h-full">
            <button
              type="button"
              className="card-nav-business-button hidden md:flex h-[40px]"
              onClick={() => scrollToSection('/business', true)}
            >
              Business
            </button>

            <button
              type="button"
              className="card-nav-cta-button h-[40px]"
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
            {links.map((link, index) => {
              const sectionId = link.href.startsWith('#') ? link.href.substring(1) : null;
              const isCurrentSection = sectionId === currentSection;
              const shouldHide = !isAtHero && isCurrentSection;
              
              return (
                <button
                  key={`mobile-${link.label}-${index}`}
                  className="mobile-nav-link"
                  onClick={() => scrollToSection(link.href, link.isExternal)}
                  aria-label={link.ariaLabel}
                  style={{
                    display: shouldHide ? 'none' : 'block'
                  }}
                >
                  {link.label}
                </button>
              );
            })}
            <button
              type="button"
              className="mobile-cta-button mb-4"
              onClick={() => scrollToSection('/business', true)}
            >
              Business
            </button>

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
