# Event Object Error Fix

## Problem

Runtime error: `[object Event]` - This error occurs when an Event object is being passed where a string or primitive value is expected.

## Root Cause Analysis

The `[object Event]` error typically happens when:

1. **Event handlers pass the entire event object instead of extracted values**
2. **Form inputs receive Event objects instead of string values**
3. **State setters receive Event objects instead of primitive values**
4. **Function parameters expect strings but receive Event objects**

## Common Patterns That Cause This Error

### ❌ Incorrect Event Handling
```javascript
// BAD - Passing entire event object
onChange={(event) => setValue(event)}

// BAD - Not extracting value from event
onChange={(event) => handleChange(event)}
```

### ✅ Correct Event Handling
```javascript
// GOOD - Extracting value from event
onChange={(event) => setValue(event.target.value)}

// GOOD - Proper event handling
onChange={(event) => handleChange(event.target.value)}
```

## Potential Fixes

### 1. Form Input Validation
Add validation to ensure event handlers extract values properly:

```typescript
const safeEventHandler = (event: React.ChangeEvent<HTMLInputElement>, callback: (value: string) => void) => {
  if (event && event.target && typeof event.target.value === 'string') {
    callback(event.target.value);
  } else {
    console.error('Invalid event object received:', event);
  }
};
```

### 2. Event Handler Wrapper
Create a wrapper for event handlers to prevent Event objects from being passed:

```typescript
const createSafeEventHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event?.target?.value;
    if (typeof value === 'string') {
      callback(value);
    } else {
      console.error('Invalid value extracted from event:', value);
    }
  };
};
```

### 3. State Setter Protection
Add protection to state setters to handle Event objects:

```typescript
const safeSetState = (setter: (value: string) => void) => {
  return (value: string | Event) => {
    if (typeof value === 'string') {
      setter(value);
    } else if (value && typeof value === 'object' && 'target' in value) {
      const extractedValue = (value as any).target?.value;
      if (typeof extractedValue === 'string') {
        setter(extractedValue);
      } else {
        console.error('Could not extract string value from event:', value);
      }
    } else {
      console.error('Invalid value type received:', typeof value, value);
    }
  };
};
```

## Debugging Steps

### 1. Add Console Logging
Add logging to identify where Event objects are being passed:

```typescript
const debugEventHandler = (event: any, context: string) => {
  console.log(`${context} - Event type:`, typeof event);
  console.log(`${context} - Event object:`, event);
  if (event?.target) {
    console.log(`${context} - Target value:`, event.target.value);
  }
};
```

### 2. Type Checking
Add runtime type checking for event handlers:

```typescript
const validateEventValue = (value: any, fieldName: string): string => {
  if (typeof value === 'string') {
    return value;
  }
  
  if (value && typeof value === 'object' && 'target' in value) {
    const extractedValue = value.target?.value;
    if (typeof extractedValue === 'string') {
      console.warn(`Event object passed to ${fieldName}, extracted value:`, extractedValue);
      return extractedValue;
    }
  }
  
  console.error(`Invalid value for ${fieldName}:`, value);
  return '';
};
```

## Implementation

### 1. Create Event Handler Utilities
Create a utility file for safe event handling:

```typescript
// src/lib/utils/eventHandlers.ts
export const createSafeInputHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event?.target?.value || '';
    callback(value);
  };
};

export const createSafeTextareaHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event?.target?.value || '';
    callback(value);
  };
};

export const createSafeSelectHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event?.target?.value || '';
    callback(value);
  };
};
```

### 2. Update Form Components
Update form components to use safe event handlers:

```typescript
// Before
<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// After
<input
  value={value}
  onChange={createSafeInputHandler(setValue)}
/>
```

### 3. Add Error Boundaries
Add error boundaries to catch and handle Event object errors:

```typescript
const EventErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('[object Event]')) {
        console.error('Event object error caught:', event);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <div>An error occurred with event handling. Please refresh the page.</div>;
  }

  return <>{children}</>;
};
```

## Testing

### 1. Add Event Object Detection
Add detection for Event objects in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.some(arg => String(arg).includes('[object Event]'))) {
      console.warn('Event object error detected:', args);
      // Add breakpoint or additional logging here
    }
    originalConsoleError.apply(console, args);
  };
}
```

### 2. Runtime Validation
Add runtime validation for form inputs:

```typescript
const validateFormInput = (value: any, fieldName: string) => {
  if (value && typeof value === 'object' && 'target' in value) {
    console.error(`Event object passed to ${fieldName} instead of string value`);
    return value.target?.value || '';
  }
  return value;
};
```

## Prevention

### 1. TypeScript Strict Mode
Enable strict mode in TypeScript to catch type errors:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. ESLint Rules
Add ESLint rules to prevent Event object errors:

```json
{
  "rules": {
    "react/jsx-no-bind": "error",
    "react/jsx-no-constructed-context-values": "error"
  }
}
```

### 3. Code Review Checklist
- ✅ Event handlers extract values from `event.target.value`
- ✅ State setters receive primitive values, not Event objects
- ✅ Form inputs use proper event handling patterns
- ✅ Custom hooks handle events correctly

## Files to Check

Based on the error, check these files for potential issues:

1. **Form Components**: `src/components/studio/forms/*`
2. **Input Handlers**: Any component with `onChange` handlers
3. **State Management**: Components that set state from events
4. **Custom Hooks**: Hooks that handle events

## Quick Fix

If you need an immediate fix, add this to your main App component:

```typescript
useEffect(() => {
  const handleError = (event: ErrorEvent) => {
    if (event.message.includes('[object Event]')) {
      console.error('Event object error:', event);
      // Prevent the error from crashing the app
      event.preventDefault();
    }
  };

  window.addEventListener('error', handleError);
  return () => window.removeEventListener('error', handleError);
}, []);
```

This will catch and log Event object errors without crashing the application.
