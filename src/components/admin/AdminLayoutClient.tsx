'use client';

import React from 'react';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export default function AdminLayoutClient({
  children,
}: AdminLayoutClientProps) {
  return <>{children}</>;
}
