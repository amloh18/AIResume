'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  withBanner?: boolean;
}

const CardNav = ({
  logo,
  links,
  className = '',
  onCtaClick,
  withBanner = false,
}: CardNavProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile menu is open to eliminate background touch lag
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle scroll behavior with rAF throttling - no listener recreation or unnecessary re-renders
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const prevScrollY = lastScrollYRef.current;

          // Don't hide navbar in the hero section (top 100px)
          if (currentScrollY < 100) {
            setIsVisible(true);
          } else if (Math.abs(currentScrollY - prevScrollY) >= 8) {
            if (currentScrollY > prevScrollY) {
              // Scrolling down - hide navbar
              setIsVisible(false);
            } else {
              // Scrolling up - show navbar
              setIsVisible(true);
            }
          }

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine if any submenu is currently open
  const isAnySubmenuOpen = hoveredLink !== null;

  const handleCtaClick = () => {
    setIsMobileMenuOpen(false);
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
        if (href.startsWith('/')) {
          router.push(href);
        } else {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
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
    <>
      <div className={`card-nav-container ${className} ${withBanner ? 'with-banner' : ''} ${isAnySubmenuOpen ? 'submenu-open' : ''} ${hoveredLink ? `submenu-${hoveredLink.toLowerCase().replace(/\s+/g, '-')}` : ''} ${!isVisible && !isMobileMenuOpen ? 'nav-hidden' : ''}`}>
      <nav ref={navRef} className="card-nav">
        <div className="card-nav-content">
           <button 
            className="logo-container"
            onClick={handleLogoClick}
            aria-label="Go to top"
            type="button"
          >
            <div className="logo-image-wrapper relative">
              <Logo size="xs" />
            </div>
          </button>

          <div className="nav-links" onMouseLeave={() => setHoveredLink(null)}>
            {links.map((link, index) => {
              const hasSubmenu = link.submenu && link.submenu.length > 0;
              const isHovered = hoveredLink === link.label;
              
              return (
                <div
                  key={`${link.label}-${index}`}
                  className={`nav-link-wrapper ${hasSubmenu ? 'has-submenu' : ''} ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => hasSubmenu && setHoveredLink(link.label)}
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
    </div>

    {/* Fullscreen Mobile Menu Portal - escaped from transformed container */}
    {mounted && isMobileMenuOpen && createPortal(
      <div className="mobile-menu-dropdown" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
        <div className="mobile-menu-header">
          <button
            className="logo-container"
            onClick={handleLogoClick}
            aria-label="Go to top"
            type="button"
          >
            <div className="logo-image-wrapper relative">
              <Logo size="xs" />
            </div>
          </button>
          <button
            type="button"
            className="mobile-menu-close-button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close mobile menu"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mobile-menu-content">
          {links.map((link, index) => (
            <button
              key={`mobile-${link.label}-${index}`}
              className="mobile-nav-link"
              onClick={() => scrollToSection(link.href, link.isExternal)}
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
      </div>,
      document.body
    )}
  </>
  );
};

export default CardNav;
