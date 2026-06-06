'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { Menu, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
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

interface FeaturedItem {
  title: string;
  description: string;
  href: string;
  image?: string;
  badge?: string;
  actionText?: string;
}

interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
  isExternal?: boolean;
  submenu?: SubmenuItem[];
  featured?: FeaturedItem;
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
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isBusinessRoute = pathname === '/business';

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Don't hide navbar in the hero section (top 100px)
      if (currentScrollY < 100) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Add a small threshold (e.g., 5px) to avoid flickering on tiny scrolls
      const scrollThreshold = 5;
      
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
        return;
      }

      if (currentScrollY > lastScrollY) {
        // Scrolling down - hide navbar
        setIsVisible(false);
      } else {
        // Scrolling up - show navbar
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Determine if any submenu is currently open
  const isAnySubmenuOpen = hoveredLink !== null;

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else if (isBusinessRoute) {
      router.push('/b2b/login?callbackUrl=%2Fb2b%2Fdashboard');
    } else {
      // Default action - route to sign in page
      router.push('/sign-in');
    }
  };


  const scrollToSection = (href: string, isExternal?: boolean) => {
    if (typeof window === 'undefined') return;
    
    // Close mobile menu when clicking a link
    setIsMobileMenuOpen(false);
    setHoveredLink(null);
    
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Element doesn't exist on this page, navigate to homepage + hash
        router.push(`/${href}`);
      }
    } else {
      if (isExternal) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(href);
      }
    }
  };

  const handleLogoClick = () => {
    if (typeof window === 'undefined') return;
    if (pathname === '/') {
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Go to homepage
      router.push('/');
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`card-nav-container ${className} ${isAnySubmenuOpen ? 'submenu-open' : ''} ${!isVisible && !isMobileMenuOpen ? 'nav-hidden' : ''}`}>
      <nav ref={navRef} className="card-nav">
        <div className="card-nav-content">
           <button 
            className="logo-container"
            onClick={handleLogoClick}
            aria-label="Go to top"
            type="button"
          >
            <div className="logo-image-wrapper relative">
              <Logo size="lg" />
              {isBusinessRoute && (
                <sup className="absolute -top-2 -right-4 text-[10px] font-bold text-[#80FF00]">HR</sup>
              )}
            </div>
          </button>

          <div className="nav-links">
            {links.map((link, index) => {
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
                  >
                    {link.label}
                  </button>
                  
                  {/* Mega Menu Dropdown */}
                  {hasSubmenu && (
                    <div className="submenu-dropdown">
                      <div className="submenu-main">
                        <div className="submenu-grid">
                          {link.submenu!.map((subLink, subIndex) => (
                            <button
                              key={`sub-${link.label}-${subIndex}`}
                              className="submenu-link"
                              onClick={() => scrollToSection(subLink.href, subLink.isExternal)}
                              aria-label={subLink.ariaLabel}
                            >
                              {subLink.icon && (
                                <div className={`submenu-link-icon ${subLink.snapshot || 'bg-white/5 border border-white/10'}`}>
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
                      </div>

                      {/* Featured Section */}
                      {link.featured && (
                        <div className="submenu-featured">
                          <div className="featured-card">
                            {link.featured.image && (
                              <div className="featured-image">
                                <Image 
                                  src={link.featured.image} 
                                  alt={link.featured.title}
                                  fill
                                  className="object-cover"
                                />
                                {link.featured.badge && (
                                  <span className="featured-badge">{link.featured.badge}</span>
                                )}
                              </div>
                            )}
                            <div className="featured-content">
                              <h4 className="featured-title">{link.featured.title}</h4>
                              <p className="featured-desc">{link.featured.description}</p>
                              <button 
                                className="featured-action"
                                onClick={() => scrollToSection(link.featured!.href)}
                              >
                                {link.featured.actionText || 'Learn More'}
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="nav-actions flex items-center h-full">
            {!isBusinessRoute && (
              <button
                type="button"
                className="card-nav-business-button hidden md:flex"
                onClick={() => scrollToSection('/business', true)}
              >
                Business
              </button>
            )}

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
            {links.map((link, index) => {
              // @ts-ignore
              const sectionId = link.href.startsWith('#') ? link.href.substring(1) : null;
              // @ts-ignore
              const isCurrentSection = typeof currentSection !== 'undefined' && sectionId === currentSection;
              // @ts-ignore
              const shouldHide = typeof isAtHero !== 'undefined' && !isAtHero && isCurrentSection;
              
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
            
            {!isBusinessRoute && (
              <button
                type="button"
                className="mobile-cta-button mb-4"
                onClick={() => scrollToSection('/business', true)}
              >
                Business
              </button>
            )}

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
