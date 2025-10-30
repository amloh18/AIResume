'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useConsoleLoggerContext } from '@/contexts/ConsoleLoggerProvider';
import InlineMessages from '@/components/auth/InlineMessages';

interface FormField {
  name: string;
  type: 'text' | 'email' | 'password';
  label: string;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  icon?: React.ReactNode;
  validation?: (value: string) => string | null;
  showPasswordToggle?: boolean;
  onBlur?: (value: string) => void;
}

interface UnifiedAuthFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submitText: string;
  isLoading: boolean;
  error: string;
  success: string;
  socialButtons?: React.ReactNode;
  footer?: React.ReactNode;
  autoFocus?: boolean;
  onInputChange?: (name: string, value: string, formData: Record<string, string>) => void;
}

export default function UnifiedAuthForm({
  fields,
  onSubmit,
  submitText,
  isLoading,
  error,
  success,
  socialButtons,
  footer,
  autoFocus = true,
  onInputChange
}: UnifiedAuthFormProps) {
  const { messages, clearMessages } = useConsoleLoggerContext();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [autoFocus]);

  // Initialize form data only once
  useEffect(() => {
    if (!initializedRef.current) {
      const initialData: Record<string, string> = {};
      fields.forEach(field => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
      initializedRef.current = true;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(newFormData);

    // Call parent's onInputChange if provided
    if (onInputChange) {
      onInputChange(name, value, newFormData);
    }

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time validation
    const field = fields.find(f => f.name === name);
    if (field?.validation) {
      // For confirmPassword, pass the current password value
      let error;
      if (name === 'confirmPassword') {
        const passwordField = fields.find(f => f.name === 'password');
        const passwordValue = passwordField ? newFormData[passwordField.name] || '' : '';
        error = field.validation(value, passwordValue);
      } else {
        error = field.validation(value);
      }
      
      setFieldErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    }

    // Also validate confirmPassword when password changes
    if (name === 'password') {
      const confirmPasswordField = fields.find(f => f.name === 'confirmPassword');
      if (confirmPasswordField && newFormData.confirmPassword) {
        const error = confirmPasswordField.validation(newFormData.confirmPassword, value);
        setFieldErrors(prev => ({
          ...prev,
          confirmPassword: error || ''
        }));
      }
    }
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const newFieldErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.name] || '';
      
      if (field.required && !value.trim()) {
        newFieldErrors[field.name] = `${field.label} is required`;
        isValid = false;
      } else if (field.validation) {
        const error = field.validation(value);
        if (error) {
          newFieldErrors[field.name] = error;
          isValid = false;
        }
      }
    });

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: FormField, index: number) => {
    const fieldError = fieldErrors[field.name];
    const isPasswordField = field.type === 'password';
    const showPassword = showPasswords[field.name] || false;
    const isFirstField = index === 0;

    return (
      <div key={field.name}>
        <div className="flex items-center gap-4">
          <label htmlFor={field.name} className="text-sm font-medium text-white/80 w-24 flex-shrink-0">
            {field.label}
          </label>
          <div className="relative flex-1">
            {field.icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4">
                {field.icon}
              </div>
            )}
            <input
              ref={isFirstField ? firstInputRef : undefined}
              type={isPasswordField && !showPassword ? 'password' : 'text'}
              id={field.name}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              onBlur={() => field.onBlur?.(formData[field.name] || '')}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              required={field.required}
              className={`w-full ${field.icon ? 'pl-10' : 'pl-4'} ${
                isPasswordField ? 'pr-12' : 'pr-4'
              } py-3 bg-[#232f1c] border text-white placeholder-white/50 focus:ring-2 transition-all duration-200 rounded-xl ${
                fieldError 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:border-[#80FF00] focus:ring-[#80FF00]'
              }`}
            />
            {isPasswordField && field.showPasswordToggle && (
              <button
                type="button"
                onClick={() => togglePasswordVisibility(field.name)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {isValidating[field.name] && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-lime-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        {fieldError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{fieldError}</span>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Social Buttons */}
      {socialButtons && (
        <div className="space-y-3">
          {socialButtons}
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#222B22] text-white/60">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field, index) => renderField(field, index))}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </motion.div>
        )}

        {/* Inline Messages from Console Logs */}
        <InlineMessages 
          messages={messages} 
          onClear={clearMessages}
          className="mt-4"
        />

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#80FF00] hover:bg-[#70e600] text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {submitText}...
            </>
          ) : (
            <>
              {submitText}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </form>

      {/* Footer */}
      {footer && (
        <div className="text-center mt-6">
          {footer}
        </div>
      )}
    </div>
  );
}

// Validation helpers
export const emailValidation = (value: string): string | null => {
  if (!value.trim()) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
  return null;
};

export const passwordValidation = (value: string): string | null => {
  if (!value.trim()) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) return 'Password must contain at least one special character';
  return null;
};

export const nameValidation = (value: string): string | null => {
  if (!value.trim()) return 'This field is required';
  if (value.trim().length < 2) return 'Must be at least 2 characters long';
  return null;
};

export const confirmPasswordValidation = (value: string, password: string): string | null => {
  if (!value.trim()) return 'Please confirm your password';
  if (password && value !== password) return 'Passwords do not match';
  return null;
};
