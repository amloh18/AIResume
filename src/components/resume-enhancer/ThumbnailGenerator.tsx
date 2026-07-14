import React, { useState, useEffect, useRef, useCallback } from 'react';
import CVPreviewThumbnail from '@/components/dashboard/CVPreviewThumbnail';
import { Button } from '@/components/ui/button';
import { RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ThumbnailGeneratorProps {
  cvData: any;
  template: any;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
  className?: string;
}

/**
 * Client-side Thumbnail Generator Component
 * Generates thumbnails using multiple strategies for reliability
 */
export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  cvData,
  template,
  onThumbnailGenerated,
  className = ''
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStrategy, setGenerationStrategy] = useState<'canvas' | 'svg' | 'dom'>('canvas');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Strategy 1: Canvas-based thumbnail generation (most reliable)
   */
  const generateCanvasThumbnail = useCallback(async (): Promise<string | null> => {
    if (!cvData || !template || !canvasRef.current) {
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Set canvas dimensions (thumbnail size)
      const thumbWidth = 300;
      const thumbHeight = 400;
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, thumbWidth, thumbHeight);

      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, thumbWidth, thumbHeight);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, thumbWidth, thumbHeight);

      // Extract CV data
      const basics = cvData.basics || {};
      const work = cvData.work || cvData.experience || [];
      const education = cvData.education || [];
      const skills = cvData.skills || [];

      // Set up text styles
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Draw name
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(basics.name || 'Your Name', 20, 20);

      // Draw title
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(basics.label || basics.title || 'Professional Title', 20, 45);

      // Draw contact info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial, sans-serif';
      let contactY = 70;
      if (basics.email) {
        ctx.fillText(basics.email, 20, contactY);
        contactY += 18;
      }
      if (basics.phone) {
        ctx.fillText(basics.phone, 20, contactY);
        contactY += 18;
      }

      // Draw sections
      let sectionY = contactY + 20;

      // Work Experience
      if (work.length > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText('Experience', 20, sectionY);
        sectionY += 20;

        ctx.fillStyle = '#475569';
        ctx.font = '11px Arial, sans-serif';
        work.slice(0, 2).forEach((job: any) => {
          const position = job.position || job.title || 'Position';
          const company = job.name || job.company || 'Company';
          const date = job.startDate || 'Start';
          
          ctx.fillText(position, 20, sectionY);
          sectionY += 16;
          ctx.fillStyle = '#64748b';
          ctx.fillText(`${company} | ${date}`, 20, sectionY);
          sectionY += 20;
          ctx.fillStyle = '#475569';
        });
      }

      // Education
      if (education.length > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText('Education', 20, sectionY);
        sectionY += 20;

        ctx.fillStyle = '#475569';
        ctx.font = '11px Arial, sans-serif';
        education.slice(0, 2).forEach((edu: any) => {
          const institution = edu.institution || 'Institution';
          const area = edu.area || 'Field';
          
          ctx.fillText(area, 20, sectionY);
          sectionY += 16;
          ctx.fillStyle = '#64748b';
          ctx.fillText(`${institution} | ${edu.startDate || 'Start'}`, 20, sectionY);
          sectionY += 20;
          ctx.fillStyle = '#475569';
        });
      }

      // Skills
      if (skills.length > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText('Skills', 20, sectionY);
        sectionY += 18;

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Arial, sans-serif';
        const skillText = skills
          .slice(0, 6)
          .map((s: any) => s.skillsText || s.name || s.category || s)
          .join(', ') || '';
        
        // Wrap text
        const maxWidth = thumbWidth - 40;
        const words = skillText.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, 20, sectionY);
            sectionY += 14;
            line = word + ' ';
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 20, sectionY);
      }

      // Draw footer
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CV Preview', thumbWidth / 2, thumbHeight - 15);

      // Convert to data URL
      return canvas.toDataURL('image/png', 0.9);
    } catch (err) {
      console.error('Canvas thumbnail generation failed:', err);
      return null;
    }
  }, [cvData, template]);

  /**
   * Strategy 2: SVG-based thumbnail generation
   */
  const generateSvgThumbnail = useCallback(async (): Promise<string | null> => {
    if (!cvData || !template) {
      return null;
    }

    try {
      const basics = cvData.basics || {};
      const work = cvData.work || cvData.experience || [];
      const education = cvData.education || [];
      const skills = cvData.skills || [];

      const width = 300;
      const height = 400;

      const escapeXml = (text: string): string => {
        if (!text) return '';
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#bg)" stroke="#e5e7eb" stroke-width="1"/>
          
          <!-- Name -->
          <text x="20" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">
            ${escapeXml(basics.name || 'Your Name')}
          </text>
          
          <!-- Title -->
          <text x="20" y="55" font-family="Arial, sans-serif" font-size="12" fill="#64748b">
            ${escapeXml(basics.label || basics.title || 'Professional Title')}
          </text>
          
          <!-- Contact -->
          <text x="20" y="75" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">
            ${basics.email || ''} ${basics.phone ? '| ' + basics.phone : ''}
          </text>
          
          <!-- Work Experience -->
          ${work.length > 0 ? `
            <text x="20" y="110" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">
              Experience
            </text>
            <line x1="20" y1="118" x2="${width - 20}" y2="118" stroke="#cbd5e1" stroke-width="1"/>
            ${work.slice(0, 2).map((job: any, i: number) => `
              <text x="20" y="${135 + i * 40}" font-family="Arial, sans-serif" font-size="10" fill="#475569">
                ${escapeXml(job.position || job.title || 'Position')}
              </text>
              <text x="20" y="${150 + i * 40}" font-family="Arial, sans-serif" font-size="9" fill="#64748b">
                ${escapeXml(job.name || job.company || 'Company')}
              </text>
            `).join('')}
          ` : ''}
          
          <!-- Education -->
          ${education.length > 0 ? `
            <text x="20" y="${200 + work.length * 40}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">
              Education
            </text>
            <line x1="20" y1="${208 + work.length * 40}" x2="${width - 20}" y2="${208 + work.length * 40}" stroke="#cbd5e1" stroke-width="1"/>
            ${education.slice(0, 2).map((edu: any, i: number) => `
              <text x="20" y="${225 + work.length * 40 + i * 30}" font-family="Arial, sans-serif" font-size="10" fill="#475569">
                ${escapeXml(edu.institution || 'Institution')}
              </text>
            `).join('')}
          ` : ''}
          
          <!-- Footer -->
          <text x="${width / 2}" y="${height - 10}" font-family="Arial, sans-serif" font-size="8" fill="#cbd5e1" text-anchor="middle">
            CV Preview
          </text>
        </svg>
      `;

      return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    } catch (err) {
      console.error('SVG thumbnail generation failed:', err);
      return null;
    }
  }, [cvData, template]);

  /**
   * Strategy 3: DOM-based thumbnail generation using html2canvas
   */
  const generateDomThumbnail = useCallback(async (): Promise<string | null> => {
    if (!cvData || !template) {
      return null;
    }

    try {
      // Dynamically import html2canvas to reduce bundle size
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      
      let tempElement: HTMLDivElement | null = null;
      try {
        // Create a temporary element for rendering
        tempElement = document.createElement('div');
        tempElement.style.position = 'fixed';
        tempElement.style.left = '-9999px';
        tempElement.style.top = '0';
        tempElement.style.width = '300px';
        tempElement.style.height = '400px';
        tempElement.style.background = 'white';
        tempElement.style.transform = 'scale(0.3)';
        tempElement.style.transformOrigin = 'top left';
        document.body.appendChild(tempElement);

        // Use CVPreviewThumbnail component for rendering
        const thumbnail = await html2canvas(tempElement, {
          width: 300,
          height: 400,
          backgroundColor: '#ffffff',
          scale: 1,
          useCORS: true,
          allowTaint: true,
        });

        return thumbnail.toDataURL('image/png', 0.9);
      } finally {
        if (tempElement && document.body.contains(tempElement)) {
          document.body.removeChild(tempElement);
        }
      }
    } catch (err) {
      console.error('DOM thumbnail generation failed:', err);
      return null;
    }
  }, [cvData, template]);

  /**
   * Main thumbnail generation function with fallback strategies
   */
  const generateThumbnail = useCallback(async (): Promise<string | null> => {
    if (!cvData || !template) {
      return null;
    }

    const strategies = [
      { name: 'canvas', fn: generateCanvasThumbnail },
      { name: 'svg', fn: generateSvgThumbnail },
      { name: 'dom', fn: generateDomThumbnail },
    ];

    for (const strategy of strategies) {
      try {
        setGenerationStrategy(strategy.name as any);
        const result = await strategy.fn();
        if (result) {
          setError(null);
          return result;
        }
      } catch (err) {
        console.warn(`Strategy ${strategy.name} failed:`, err);
        continue;
      }
    }

    setError('Failed to generate thumbnail using all strategies');
    return null;
  }, [cvData, template, generateCanvasThumbnail, generateSvgThumbnail, generateDomThumbnail]);

  /**
   * Handle thumbnail generation
   */
  const handleGenerate = useCallback(async () => {
    if (!cvData || !template) {
      toast.error('CV data or template is missing');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateThumbnail();
      if (result) {
        setThumbnailUrl(result);
        onThumbnailGenerated?.(result);
        toast.success('Thumbnail generated successfully');
      } else {
        toast.error('Failed to generate thumbnail');
      }
    } catch (err) {
      console.error('Thumbnail generation error:', err);
      toast.error('Failed to generate thumbnail');
    } finally {
      setIsGenerating(false);
    }
  }, [cvData, template, generateThumbnail, onThumbnailGenerated]);

  /**
   * Auto-generate thumbnail when CV data or template changes
   */
  useEffect(() => {
    if (!cvData || !template) {
      return;
    }

    // Debounce auto-generation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      generateThumbnail().then(result => {
        if (result) {
          setThumbnailUrl(result);
          onThumbnailGenerated?.(result);
        }
      });
    }, 500); // 500ms debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [cvData, template, generateThumbnail, onThumbnailGenerated]);

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!cvData || !template) {
    return (
      <div className={`flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 ${className}`}>
        <div className="text-center text-gray-500">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No CV data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden canvas for canvas-based generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Thumbnail Preview */}
      <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="CV Thumbnail"
            className="w-full h-auto aspect-[3/4] object-contain bg-gray-50"
          />
        ) : (
          <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No thumbnail generated</p>
            </div>
          </div>
        )}

        {/* Generation Status */}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-50 border border-red-200 rounded-md p-2">
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !cvData || !template}
          className="flex-1"
          variant="outline"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 text-center">
          Strategy: {generationStrategy}
        </div>
      )}
    </div>
  );
};

export default ThumbnailGenerator;