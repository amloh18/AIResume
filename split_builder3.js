const fs = require('fs');
const path = require('path');

const srcFile = 'src/components/cv-canvas/CVCanvasBuilder.tsx';
const destDir = 'src/components/cv-builder-pro';

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

// Create Engine
const engineProps = getBlock('// PROPS AND REF INTERFACE', '// MAIN CANVAS BUILDER COMPONENT');
const engine = getBlock('// MAIN CANVAS BUILDER COMPONENT', null);
fs.writeFileSync(path.join(destDir, 'CVCanvasEngine.tsx'), `
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { GripVertical, Download, Plus, LayoutTemplate, Save, RefreshCw, Layers, Check, Search, Filter, Briefcase, PlusCircle, Trash2, ChevronUp, ChevronDown, ImageIcon, ArrowRight, Loader2, PlayCircle, Eye, MousePointer2, Wand2, Quote } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS, TITLE_STYLES } from './registry';
import { EditableField, CanvasSnippet, CanvasZone, StaticLayoutRenderer } from './components/CoreUI';
import ListEntry from './components/ListEntry';

${engineProps}

${engine.replace('const CVCanvasBuilder =', 'const CVCanvasEngine =').replace('export default CVCanvasBuilder;', 'export default CVCanvasEngine;')}
`);

console.log('Split 3 completed');
