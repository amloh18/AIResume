'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getSecureFileUrl } from '@/lib/utils/s3-utils';

interface S3ImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: string;
  priority?: boolean;
  onError?: () => void;
}

/**
 * S3Image Component
 * Automatically handles S3 URLs by fetching presigned URLs when needed
 * Falls back gracefully if the URL is not an S3 URL or if fetching fails
 */
const S3Image: React.FC<S3ImageProps> = ({
  src,
  alt,
  width = 128,
  height = 128,
  className = '',
  fallback,
  priority = false,
  onError,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(src || null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!src) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if it's an S3 URL and get presigned URL if needed
        const secureUrl = await getSecureFileUrl(src);
        setImageUrl(secureUrl);
      } catch (error) {
        console.error('Error loading S3 image:', error);
        // Fallback to original URL
        setImageUrl(src);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (fallback) {
      setImageUrl(fallback);
    }
    if (onError) {
      onError();
    }
  };

  if (!imageUrl && !fallback) {
    return null;
  }

  return (
    <Image
      src={imageUrl || fallback || ''}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={handleError}
      style={{
        opacity: isLoading ? 0.5 : 1,
        transition: 'opacity 0.3s',
      }}
    />
  );
};

export default S3Image;

