'use client';

import React, { useState, useRef, useContext } from 'react';
import { Upload } from 'lucide-react';
import { CanvasContext } from './CoreUI';

export const AvatarEditable = ({ data, sizeClass, shapeClass, borderClass, readOnly }: { data: any; sizeClass: string; shapeClass: string; borderClass?: string; readOnly?: boolean }) => {
  const ctx = useContext(CanvasContext);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const avatarSrc = data?.basics?.avatar || '';
  const posX = data?.basics?.avatarPositionX ?? 50;
  const posY = data?.basics?.avatarPositionY ?? 50;
  const zoom = data?.basics?.avatarZoom ?? 100;

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('cv-avatar-upload-request'));
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: posX, py: posY };
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current || !ctx?.handleDataChange) return;
    const dx = (e.clientX - dragStart.current.x) * 0.5;
    const dy = (e.clientY - dragStart.current.y) * 0.5;
    const newX = Math.max(0, Math.min(100, dragStart.current.px + dx));
    const newY = Math.max(0, Math.min(100, dragStart.current.py + dy));
    ctx.handleDataChange('basics.avatarPositionX', Math.round(newX));
    ctx.handleDataChange('basics.avatarPositionY', Math.round(newY));
  };

  const handleDragEnd = () => setIsDragging(false);

  if (readOnly) {
    if (!avatarSrc) return null;
    return (
      <img
        src={avatarSrc}
        alt="Avatar"
        className={`object-cover shrink-0 ${sizeClass} ${shapeClass} ${borderClass || ''}`}
        style={{ objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom / 100})` }}
      />
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden group/avatar ${sizeClass} ${shapeClass} ${borderClass || ''} cursor-move`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { setShowControls(false); setIsDragging(false); }}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseMoveCapture={handleDragMove}
      onMouseUp={handleDragEnd}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt="Avatar"
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{
            objectPosition: `${posX}% ${posY}%`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: `${posX}% ${posY}%`,
          }}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Upload size={20} className="text-gray-400" />
        </div>
      )}
      {showControls && (
        <div
          className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1.5 no-print"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleUpload}
            className="flex items-center gap-1 px-2 py-1 bg-white/90 hover:bg-white text-gray-800 text-[10px] font-bold rounded-lg transition-all hover:scale-105"
          >
            <Upload size={10} /> Upload
          </button>
          {avatarSrc && ctx?.handleDataChange && (
            <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded-lg" onMouseDown={(e) => e.stopPropagation()}>
              <span className="text-white text-[9px] font-bold">Zoom</span>
              <input
                type="range" min="80" max="200" step="5" value={zoom}
                onChange={(e) => ctx.handleDataChange('basics.avatarZoom', parseInt(e.target.value))}
                className="w-14 accent-emerald-400 h-1 cursor-pointer"
              />
            </div>
          )}
          {avatarSrc && (
            <p className="text-white/70 text-[8px] mt-0.5">Drag to reposition</p>
          )}
        </div>
      )}
    </div>
  );
};
