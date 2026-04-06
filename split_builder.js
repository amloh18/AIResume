const fs = require('fs');
const path = require('path');

const srcFile = 'src/components/cv-canvas/CVCanvasBuilder.tsx';
const destDir = 'src/components/cv-builder-pro';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const content = fs.readFileSync(srcFile, 'utf-8');
const lines = content.split('\n');

function getBlock(startMarker, endMarker) {
  const startIdx = lines.findIndex(line => line.includes(startMarker));
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  if (endMarker) {
    const relativeEndIdx = lines.slice(startIdx + 1).findIndex(line => line.includes(endMarker));
    if (relativeEndIdx !== -1) {
      endIdx = startIdx + 1 + relativeEndIdx;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n');
}

// Extract Registry
const typography = getBlock('// UNIFIED TYPOGRAPHY SYSTEM', '// TITLE STYLES REGISTRY');
const titleStyles = getBlock('// TITLE STYLES REGISTRY', '// REUSABLE ENTRY WRAPPER');
const listEntry = getBlock('// REUSABLE ENTRY WRAPPER', '// 70+ PREMIUM SNIPPET REGISTRY');
const snippets = getBlock('// 70+ PREMIUM SNIPPET REGISTRY', '// 15+ PRO TEMPLATES REGISTRY');
const templates = getBlock('// 15+ PRO TEMPLATES REGISTRY', '// CORE UI COMPONENTS');

const registryContent = `
import React from 'react';
import { Quote } from 'lucide-react';

${typography}
${titleStyles}
${snippets}
${templates}
`;
fs.writeFileSync(path.join(destDir, 'registry.tsx'), registryContent);

// Extract ListEntry to components
fs.mkdirSync(path.join(destDir, 'components'), { recursive: true });
fs.writeFileSync(path.join(destDir, 'components', 'ListEntry.tsx'), `
import React from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

${listEntry}
export default ListEntry;
`);

// Extract Core UI Components
const coreUi = getBlock('// CORE UI COMPONENTS', '// PROPS AND REF INTERFACE');
fs.writeFileSync(path.join(destDir, 'components', 'CoreUI.tsx'), `
import React, { useRef, useEffect } from 'react';
import { ImageIcon, Plus, RefreshCw, ChevronUp, ChevronDown, Trash2, GripVertical, PlusCircle } from 'lucide-react';
import { SNIPPETS, TITLE_STYLES } from '../registry';

${coreUi}
`);

// Create Engine
const engine = getBlock('// MAIN CANVAS BUILDER COMPONENT', null);
fs.writeFileSync(path.join(destDir, 'CVCanvasEngine.tsx'), `
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { GripVertical, Download, Plus, LayoutTemplate, Save, RefreshCw, Layers, Check, Search, Filter, Briefcase, PlusCircle, Trash2, ChevronUp, ChevronDown, ImageIcon, ArrowRight, Loader2, PlayCircle, Eye, MousePointer2, Wand2 } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS, TITLE_STYLES } from './registry';
import { EditableField, CanvasSnippet, CanvasZone, StaticLayoutRenderer } from './components/CoreUI';
import ListEntry from './components/ListEntry';

${engine}
`);

console.log('Split completed');
