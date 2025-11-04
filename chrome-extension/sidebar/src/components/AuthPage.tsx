import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useExtensionAuth } from '../hooks/useExtensionAuth';
import { authService } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'code'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          <span className="text-lime-500">CV</span>
          <span className="text-gray-900 dark:text-white">CIRCLE</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to save jobs to your dashboard
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {mode === 'signin' ? (
        <div className="space-y-4">
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-dark-bg text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={handleSendCode}
            disabled={isLoading || !email}
            className="w-full py-2 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign in with 4-digit code
          </button>
        </div>
      ) : (
        <form onSubmit={handleCodeLogin} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Enter 4-digit code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500 text-center text-2xl tracking-widest"
              placeholder="0000"
              maxLength={4}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 4}
            className="w-full py-2 bg-lime-500 hover:bg-lime-400 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
          >
            Back to email/password
          </button>
        </form>
      )}
    </div>
  );
};

export default AuthPage;

