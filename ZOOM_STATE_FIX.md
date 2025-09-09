# Zoom State Variable Fix

## Problem
Runtime error: `zoom is not defined` at CVStudio component line 1180.

```
ReferenceError: zoom is not defined
at CVStudio (src/components/studio/CVStudio.tsx:1180:19)
```

## Root Cause
When fixing the React Hooks order issue, I accidentally removed the original `zoom` and `paperSize` state declarations while removing duplicates. The PreviewPanel component was still expecting these props, but they were no longer defined.

## Solution
Added back the missing state declarations:

```typescript
// Preview settings state
const [zoom, setZoom] = useState(1);
const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
```

## Fixed Issues
✅ **zoom state** - Added back `useState(1)` declaration
✅ **paperSize state** - Added back `useState<'A4' | 'Letter'>('A4')` declaration  
✅ **State order** - Maintained proper hook order by placing at top of component
✅ **PreviewPanel props** - All required props now properly defined

## Verification
- `zoom` and `setZoom` are now available for PreviewPanel
- `paperSize` and `setPaperSize` are now available for PreviewPanel
- All state declarations remain at the top of the component
- No duplicate state declarations

The Studio should now load without the "zoom is not defined" error.