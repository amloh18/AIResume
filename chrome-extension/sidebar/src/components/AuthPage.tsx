import React, { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useExtensionAuth } from '../hooks/useExtensionAuth';
import { authService } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import Footer from './Footer';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'code'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useExtensionAuth();
  const navigate = useNavigate();

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.loginWithPassword(email, password);
      if (result.success && result.user && result.token) {
        await login(result.user, result.token);
        setSuccess('Login successful!');
        setTimeout(() => {
          navigate('/extension/dashboard');
        }, 500);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.sendCode(email);
      if (result.success) {
        setSuccess('Code sent to your email!');
        setMode('code');
      } else {
        setError(result.error || 'Failed to send code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.loginWithCode(email, code);
      if (result.success && result.user && result.token) {
        await login(result.user, result.token);
        setSuccess('Login successful!');
        setTimeout(() => {
          navigate('/extension/dashboard');
        }, 500);
      } else {
        setError(result.error || 'Invalid code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="flex-1 p-6 space-y-6">
        <div className="text-center">
          <div className="mb-6">
            <Logo size="lg" className="justify-center" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
            <p className="text-white/70 text-sm">
              Welcome back! Please enter your credentials to access your account.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-bg text-white/70">Or continue with email</span>
            </div>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleEmailPasswordLogin} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="email" className="block text-sm font-medium text-white">
                    Email Address
                  </label>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-lime-500 rounded-lg bg-dark-card text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
                    placeholder="amlowwh@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-white">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-white/10 rounded-lg bg-dark-card text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading || !email}
                className="w-full py-2.5 bg-dark-tertiary hover:bg-dark-tertiary/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  <>
                    Send me a code
                  </>
                )}
              </button>

              <div className="text-center space-y-2">
                <p className="text-sm text-white/70">
                  Forgot Password?{' '}
                  <a 
                    href="https://cvcircle.io/signin" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-lime-500 hover:text-lime-400 transition-colors"
                  >
                    Reset Password
                  </a>
                </p>
                <p className="text-sm text-white/70">
                  Don't have an account?{' '}
                  <a 
                    href="https://cvcircle.io/sign-up" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-lime-500 hover:text-lime-400 transition-colors"
                  >
                    Sign Up
                  </a>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCodeLogin} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-2 text-white">
                  Enter 4-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-2 border border-white/10 rounded-lg bg-dark-card text-white focus:outline-none focus:ring-2 focus:ring-lime-500 text-center text-2xl tracking-widest"
                  placeholder="0000"
                  maxLength={4}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 4}
                className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setCode('');
                  setError('');
                }}
                className="w-full py-2 text-white/70 hover:text-white text-sm"
              >
                Back to email/password
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;

