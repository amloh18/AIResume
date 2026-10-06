import React from 'react';

/**
 * Utility functions for safe event handling to prevent [object Event] errors
 */

/**
 * Creates a safe input change handler that extracts the value from the event
 */
export const createSafeInputHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = event?.target?.value || '';
      if (typeof value === 'string') {
        callback(value);
      } else {
        console.error('Invalid value type from input event:', typeof value, value);
      }
    } catch (error) {
      console.error('Error in safe input handler:', error);
    }
  };
};

/**
 * Creates a safe textarea change handler that extracts the value from the event
 */
export const createSafeTextareaHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const value = event?.target?.value || '';
      if (typeof value === 'string') {
        callback(value);
      } else {
        console.error('Invalid value type from textarea event:', typeof value, value);
      }
    } catch (error) {
      console.error('Error in safe textarea handler:', error);
    }
  };
};

/**
 * Creates a safe select change handler that extracts the value from the event
 */
export const createSafeSelectHandler = (callback: (value: string) => void) => {
  return (event: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      const value = event?.target?.value || '';
      if (typeof value === 'string') {
        callback(value);
      } else {
        console.error('Invalid value type from select event:', typeof value, value);
      }
    } catch (error) {
      console.error('Error in safe select handler:', error);
    }
  };
};

/**
 * Validates and extracts a string value from an event or direct value
 */
export const extractStringValue = (value: any, fieldName: string = 'field'): string => {
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's an event object, extract the value
  if (value && typeof value === 'object' && 'target' in value) {
    const extractedValue = value.target?.value;
    if (typeof extractedValue === 'string') {
      console.warn(`Event object passed to ${fieldName}, extracted value:`, extractedValue);
      return extractedValue;
    }
  }
  
  // If it's null or undefined, return empty string
  if (value === null || value === undefined) {
    return '';
  }
  
  // Try to convert to string
  try {
    const stringValue = String(value);
    console.warn(`Non-string value converted to string for ${fieldName}:`, stringValue);
    return stringValue;
  } catch (error) {
    console.error(`Could not extract string value for ${fieldName}:`, value, error);
    return '';
  }
};

/**
 * Creates a safe state setter that handles both direct values and event objects
 */
export const createSafeStateSetter = <T extends string>(
  setter: (value: T) => void,
  fieldName: string = 'field'
) => {
  return (value: T | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    try {
      const stringValue = extractStringValue(value, fieldName) as T;
      setter(stringValue);
    } catch (error) {
      console.error(`Error in safe state setter for ${fieldName}:`, error);
    }
  };
};

/**
 * Validates that a value is a string and not an Event object
 */
export const validateStringValue = (value: any, fieldName: string = 'field'): string => {
  if (typeof value === 'string') {
    return value;
  }
  
  if (value && typeof value === 'object' && 'target' in value) {
    console.error(`Event object passed to ${fieldName} instead of string value`);
    return value.target?.value || '';
  }
  
  console.error(`Invalid value type for ${fieldName}:`, typeof value, value);
  return '';
};

/**
 * Debug helper to log event information
 */
export const debugEvent = (event: any, context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${context} - Event type:`, typeof event);
    console.log(`${context} - Event object:`, event);
    if (event?.target) {
      console.log(`${context} - Target value:`, event.target.value);
    }
  }
};

/**
 * Safe event handler that logs and handles errors gracefully
 */
export const createSafeEventHandler = <T extends string>(
  callback: (value: T) => void,
  fieldName: string = 'field'
) => {
  return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    try {
      debugEvent(event, fieldName);
      const value = event?.target?.value;
      if (typeof value === 'string') {
        callback(value as T);
      } else {
        console.error(`Invalid value type from ${fieldName} event:`, typeof value, value);
      }
    } catch (error) {
      console.error(`Error in safe event handler for ${fieldName}:`, error);
    }
  };
};

/**
 * Hook to prevent Event object errors in forms
 */
export const useSafeFormHandlers = () => {
  const createInputHandler = <T extends string>(
    callback: (value: T) => void,
    fieldName: string = 'field'
  ) => createSafeEventHandler(callback, fieldName);
  
  const createTextareaHandler = <T extends string>(
    callback: (value: T) => void,
    fieldName: string = 'field'
  ) => createSafeEventHandler(callback, fieldName);
  
  const createSelectHandler = <T extends string>(
    callback: (value: T) => void,
    fieldName: string = 'field'
  ) => createSafeEventHandler(callback, fieldName);
  
  return {
    createInputHandler,
    createTextareaHandler,
    createSelectHandler,
    extractStringValue,
    validateStringValue
  };
};
