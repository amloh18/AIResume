'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  Users,
  BookOpen,
  Zap,
  Crown,
  Star,
  CheckCircle,
  ArrowRight,
  Calendar,
  Lightbulb,
  Award
} from 'lucide-react';
import Canvas from '@/components/dashboard/Canvas';
import Pipeline from '@/components/dashboard/Pipeline';
import InkPad from '@/components/dashboard/InkPad';
import Analytics from '@/components/dashboard/Analytics';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import RouteGuard from '@/components/auth/RouteGuard';


interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('pulse');

  const [user, setUser] = useState({
    name: 'Amarjot',
    email: 'amarjot@example.com',
    progress: 60,
    cvsCreated: 3,
    jobsApplied: 2,
    coverLetters: 1,
    subscription: {
      planName: 'Free Plan',
      status: 'active',
      credits: 20
    }
  });

  // Fetch user subscription data
  useEffect(() => {
    const fetchUserSubscription = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        const data = await response.json();
        if (data.success) {
          setUser(prev => ({
            ...prev,
            subscription: data.subscription
          }));
        }
      } catch (error) {
        console.error('Error fetching user subscription:', error);
      }
    };

    fetchUserSubscription();
  }, []);

  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  // Check authentication and handle onboarding flow
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      // If user is not authenticated, redirect to home page
      router.push('/');
      return;
    }

    // Handle welcome animation from registration or login
    const isFromRegistration = sessionStorage.getItem('fromRegistration');
    const isFromLogin = sessionStorage.getItem('fromLogin');
    
    if (isFromRegistration || isFromLogin) {
      setShowWelcomeAnimation(true);
      sessionStorage.removeItem('fromRegistration');
      sessionStorage.removeItem('fromLogin');
      
      // Hide welcome animation after 5 seconds
      setTimeout(() => {
        setShowWelcomeAnimation(false);
      }, 5000);
    }
  }, [status, router]);

  // Update user data from session
  useEffect(() => {
    if (session?.user) {
      setUser(prev => ({
        ...prev,
        name: session.user.firstName || session.user.name || 'User',
        email: session.user.email || prev.email
      }));
    }
  }, [session]);

  const [recentFiles, setRecentFiles] = useState([
    { id: 1, name: 'Senior UX Designer CV', type: 'cv', lastOpened: '2 hours ago' },
    { id: 2, name: 'Spotify Cover Letter', type: 'cover-letter', lastOpened: '1 day ago' },
    { id: 3, name: 'Product Manager CV', type: 'cv', lastOpened: '3 days ago' }
  ]);

  const [aiSuggestions, setAiSuggestions] = useState([
    'UX Researcher at Spotify',
    'Product Designer at Figma',
    'Design Lead at Airbnb'
  ]);

  const sections = [
    { id: 'pulse', name: 'Analytics', icon: BarChart3, description: 'Progress Tracking' },
    { id: 'pipeline', name: 'Job Tracker', icon: Briefcase, description: 'Track Applications' },
    { id: 'canvas', name: 'CV Studio', icon: FileText, description: 'Create & Edit CVs' },
    { id: 'inkpad', name: 'Cover Letters', icon: PenTool, description: 'Generate Letters' },
    { id: 'vault', name: 'Saved Forms', icon: Archive, description: 'Store Data' }
  ];

  const widgets = [
    {
      id: 'recent',
      title: 'Recently Opened',
      icon: Clock,
      content: recentFiles.slice(0, 3)
    },
    {
      id: 'suggestions',
      title: 'AI Job Suggestions',
      icon: Target,
      content: aiSuggestions
    },
    {
      id: 'tip',
      title: 'Daily Career Tip',
      icon: Lightbulb,
      content: 'Customize your CV summary for each job application to increase your chances by 40%.'
    },
    {
      id: 'progress',
      title: 'Progress Ring',
      icon: TrendingUp,
      content: user.progress
    },
    {
      id: 'inspiration',
      title: 'Top Community CVs',
      icon: Crown,
      content: ['UX Designer at Google', 'Product Manager at Meta', 'Design Lead at Apple']
    }
  ];

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Welcome Animation Overlay */}
      <AnimatePresence>
        {showWelcomeAnimation && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center backdrop-optimized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ willChange: 'opacity' }}
          >
            <motion.div
              className="text-center space-y-8 p-8"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{ willChange: 'transform' }}
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
              >
                <Sparkles size={48} className="text-black" />
              </motion.div>
              
              <motion.h1
                className="text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Welcome to Your Dashboard!
              </motion.h1>
              
              <motion.p
                className="text-xl text-white/60 max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Your CV toolkit is ready. Start building your career success!
              </motion.p>
              
              <motion.div
                className="flex items-center justify-center gap-2 text-lime-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <motion.aside 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{ willChange: 'transform, opacity' }}
        >
                  <DashboardNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onMembershipClick={() => {}}
          user={user}
        />
        </motion.aside>

        {/* Main Dashboard Area */}
                    <main className="flex-1 p-6 pt-8">
              <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {activeSection === 'canvas' && (
                <motion.div
                  key="canvas"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <Canvas />
                </motion.div>
              )}

              {activeSection === 'pipeline' && (
                <motion.div
                  key="pipeline"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Pipeline />
                </motion.div>
              )}

              {activeSection === 'inkpad' && (
                <motion.div
                  key="inkpad"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <InkPad />
                </motion.div>
              )}

              {activeSection === 'vault' && (
                <motion.div
                  key="vault"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Archive size={24} className="text-lime-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Saved Forms</h2>
                    <p className="text-white/60">Store and manage your saved forms and reusable data</p>
                    <p className="text-white/40 text-sm mt-4">Coming soon...</p>
                  </div>
                </motion.div>
              )}



              {activeSection === 'pulse' && (
                <motion.div
                  key="pulse"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Analytics />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Membership Sidebar */}
      
      </div>
    </RouteGuard>
  );
};

export default Dashboard; 