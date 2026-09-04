import React, { useState } from 'react';
import { Logo } from './Logo';
import { HumanVerification } from './HumanVerification';
import { User, UserRole } from '../types';
import { getUsers, saveUser, setCurrentUser } from '../services/storage';
import { X, Lock, Mail, User as UserIcon, Building, GraduationCap, AlertCircle, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [studentId, setStudentId] = useState('');
  const [institution, setInstitution] = useState('Higher Education Academy');
  const [humanVerified, setHumanVerified] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuickAdminFill = () => {
    setEmail('admin@university.edu');
    setPassword('AdminPass2026!');
    setMode('login');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!humanVerified) {
      setError('Please complete the security check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const users = getUsers();

      if (mode === 'login') {
        const found = users.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (!found || found.passwordHash !== password) {
          setError('Invalid email or password. Please verify your credentials.');
          setIsSubmitting(false);
          return;
        }

        setCurrentUser(found);
        onSuccess(found);
      } else {
        // Sign up
        if (!name.trim()) {
          setError('Please enter your full legal name.');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters in length.');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }

        const existing = users.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (existing) {
          setError('An account with this email already exists. Please log in.');
          setIsSubmitting(false);
          return;
        }

        const newUser: User = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: password,
          role,
          studentId: role === 'student' ? (studentId.trim() || `STU-${Math.floor(100000 + Math.random() * 900000)}`) : undefined,
          institution: institution.trim() || 'University Higher Education',
          department: role === 'admin' ? 'Academic Administration & Research' : 'Cognitive Science & Computer Science',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        saveUser(newUser);
        setCurrentUser(newUser);
        onSuccess(newUser);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className={`relative w-full ${mode === 'signup' ? 'max-w-lg' : 'max-w-sm'} max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
        {/* Compact Header */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <Logo size="sm" showSubtitle={false} />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body with Reduced Spacing */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 overflow-y-auto flex-1">
          {/* Compact Tab Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'signup' ? (
              <>
                {/* Account Role Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-1 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'student'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-1 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin / Faculty</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid: Full Legal Name & Student ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Full Legal Name</label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Alex Henderson"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {role === 'student' ? 'Student ID Number' : 'Faculty / Staff ID'}
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      placeholder={role === 'student' ? 'e.g. STU-89210' : 'e.g. FAC-1004'}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 2-Column Grid: Institution & Academic Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Higher Education Institution</label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={institution}
                        onChange={e => setInstitution(e.target.value)}
                        placeholder="e.g. Higher Education Academy"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Academic Email</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Column Grid: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Login Mode Inputs */
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Academic Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Compact Human Verification */}
            <div className="pt-0.5">
              <HumanVerification
                verified={humanVerified}
                onVerifyChange={setHumanVerified}
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {mode === 'login' ? 'Authenticate & Enter' : 'Create Academic Account'}
            </button>
          </form>

          {/* Compact Admin Autofill Footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Evaluating as Administrator?</span>
            <button
              type="button"
              onClick={handleQuickAdminFill}
              className="font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Autofill Admin Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
