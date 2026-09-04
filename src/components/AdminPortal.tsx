import React, { useState, useEffect } from 'react';
import { User, LearningSession, InteractionEvent, SystemSettings, LearningModule } from '../types';
import {
  getUsers,
  updateUserPassword,
  deleteUser,
  getSessions,
  getInteractionEvents,
  getSystemSettings,
  saveSystemSettings,
  exportStudentPerformanceCsv,
  exportInteractionTelemetryCsv,
  exportResearchDataJson,
  getModules,
  bulkSyncToSupabase
} from '../services/storage';
import { testSupabaseConnection, checkSupabaseTablesStatus, SUPABASE_SQL_SCHEMA, SUPABASE_PROJECT_REF } from '../services/supabase';
import {
  Users,
  KeyRound,
  Trash2,
  Download,
  Database,
  Sliders,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
  Shield,
  GraduationCap,
  Copy,
  Check,
  Search,
  BookOpen,
  RefreshCw,
  Clock,
  Brain,
  ExternalLink,
  UploadCloud
} from 'lucide-react';

interface AdminPortalProps {
  currentUser: User;
  onSupabaseStatusChange?: (isConnected: boolean) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  onSupabaseStatusChange
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'telemetry' | 'system' | 'supabase'>('users');
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  const [modules, setModules] = useState<LearningModule[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');

  // Password editing modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  // User deletion confirm
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Supabase test connection state
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(settings.supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(settings.supabaseAnonKey || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Table status and bulk sync
  const [tableStatus, setTableStatus] = useState<{
    connected: boolean;
    usersTable: boolean;
    sessionsTable: boolean;
    eventsTable: boolean;
    message: string;
  } | null>(null);
  const [checkingTables, setCheckingTables] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  const handleCheckTables = async () => {
    setCheckingTables(true);
    const res = await checkSupabaseTablesStatus();
    setTableStatus(res);
    setCheckingTables(false);
  };

  const handleBulkSync = async () => {
    setSyncing(true);
    setSyncSummary(null);
    try {
      const res = await bulkSyncToSupabase();
      setSyncSummary(`Synchronized ${res.syncedUsers} users, ${res.syncedSessions} sessions, and ${res.syncedEvents} telemetry events to Supabase.`);
      await handleCheckTables();
    } catch {
      setSyncSummary('Sync failed. Please ensure the SQL schema has been executed in the Supabase SQL editor.');
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (activeTab === 'supabase') {
      handleCheckTables();
    }
  }, [activeTab]);

  // Reload all real data
  const loadData = () => {
    setUsers(getUsers());
    setSessions(getSessions());
    setEvents(getInteractionEvents());
    setSettings(getSystemSettings());
    setModules(getModules());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle password update
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !newPassword.trim()) return;

    const ok = updateUserPassword(editingUser.id, newPassword.trim());
    if (ok) {
      setPasswordSuccessMessage(`Password updated successfully for ${editingUser.name}.`);
      loadData();
      setTimeout(() => {
        setEditingUser(null);
        setNewPassword('');
        setPasswordSuccessMessage(null);
      }, 1200);
    }
  };

  // Handle user deletion
  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert('You cannot delete the currently authenticated administrator account.');
      return;
    }

    const ok = deleteUser(userId);
    if (ok) {
      setDeletingUserId(null);
      loadData();
    }
  };

  // Test Supabase connection
  const handleTestSupabase = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    const result = await testSupabaseConnection(supabaseUrlInput.trim(), supabaseKeyInput.trim());
    setConnectionResult(result);
    setTestingConnection(false);

    if (result.success) {
      const updatedSettings = {
        ...settings,
        supabaseUrl: supabaseUrlInput.trim(),
        supabaseAnonKey: supabaseKeyInput.trim(),
        isSupabaseConfigured: true
      };
      setSettings(updatedSettings);
      saveSystemSettings(updatedSettings);
      if (onSupabaseStatusChange) {
        onSupabaseStatusChange(true);
      }
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings);
    alert('Cognitive adaptation thresholds and parameters updated.');
  };

  // Filtered users for table
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.studentId && u.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
              IES ADMIN ENGINE
            </span>
            <span className="text-xs text-slate-500 font-semibold">Institutional Governance Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            System Control & Research Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage real academic accounts, monitor live cognitive interaction telemetry, download analytical reports, and configure Supabase.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Real Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Telemetry Stream ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Adaptive Heuristic Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'supabase'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Supabase Database Hub</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Registered System Users</h3>
              <p className="text-xs text-slate-500">
                Direct authority to edit user credentials or purge accounts. Zero fake data present.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, email, ID..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Institution / ID</th>
                    <th className="py-3 px-4">Sessions</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const userSessionCount = sessions.filter(s => s.userId === u.id).length;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                              <span>{u.role}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-800">{u.institution || 'Higher Education'}</div>
                            <div className="text-slate-400 text-[11px]">{u.studentId || u.department || 'N/A'}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                            {userSessionCount}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setNewPassword(u.passwordHash || '');
                                  setPasswordSuccessMessage(null);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => setDeletingUserId(u.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PASSWORD MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Edit User Password</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Updating credentials for <strong className="text-slate-800">{editingUser.name}</strong> ({editingUser.email}).
            </p>

            {passwordSuccessMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Confirm Account Deletion</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently remove this user account? Their cognitive session logs and telemetry records will be unlinked.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUserId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deletingUserId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOWNLOAD REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Academic & Empirical Research Reports</h3>
            <p className="text-xs text-slate-500">
              Download real, un-synthesized datasets collected from student interactions for academic defense and institutional reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Performance CSV */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Student Performance & CLI Report</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export structured CSV containing session durations, question accuracy, mean response latency, hesitation counts, and Cognitive Load Theory indexes.
                </p>
              </div>

              <button
                onClick={exportStudentPerformanceCsv}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Performance CSV</span>
              </button>
            </div>

            {/* Raw Telemetry Events CSV */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Sub-Second Interaction Telemetry</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export granular interaction events (option clicks, choice changes, hesitation alerts, hint requests, response timing in ms).
                </p>
              </div>

              <button
                onClick={exportInteractionTelemetryCsv}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Telemetry CSV ({events.length} Events)</span>
              </button>
            </div>

            {/* Research Package JSON */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileJson className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Complete Research JSON Package</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export comprehensive hierarchical schema: full session trees, adaptation histories, user cohorts, and curriculum metadata for statistical software (R, SPSS, Python Pandas).
                </p>
              </div>

              <button
                onClick={exportResearchDataJson}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Full JSON Dataset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE TELEMETRY STREAM */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Cognitive Interaction Telemetry Stream</h3>
            <p className="text-xs text-slate-500">
              Real-time audit log of student behavioural micro-interactions.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No telemetry events logged yet. Once students begin solving curriculum problems, sub-second interaction logs will stream here.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Time Spent</th>
                      <th className="py-3 px-4">Cognitive Load</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {[...events].reverse().slice(0, 100).map(evt => (
                      <tr key={evt.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-semibold font-sans">
                          {users.find(u => u.id === evt.userId)?.name || evt.userId}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                            {evt.eventType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {(evt.timeSpentMs / 1000).toFixed(1)}s
                        </td>
                        <td className="py-2.5 px-4 text-blue-600 font-bold">
                          {evt.cognitiveLoadEstimate !== undefined ? `${evt.cognitiveLoadEstimate}/100` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-sans max-w-xs truncate" title={evt.details}>
                          {evt.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ADAPTIVE HEURISTIC CONTROLS */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6 max-w-3xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cognitive Load Heuristic Parameters</h3>
            <p className="text-xs text-slate-500">
              Configure the sensitivity thresholds that govern dynamic scaffolding and pacing in the learning engine.
            </p>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Response Latency Hesitation Alert Cutoff (Milliseconds)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5000"
                    max="45000"
                    step="1000"
                    value={settings.responseTimeHesitationThresholdMs}
                    onChange={e => setSettings({ ...settings, responseTimeHesitationThresholdMs: Number(e.target.value) })}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-900 w-16 text-right">
                    {(settings.responseTimeHesitationThresholdMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Threshold after which lingering on a question is classified as elevated cognitive conflict.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Consecutive Error Limit for Automatic Scaffolding
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.highErrorThresholdCount}
                  onChange={e => setSettings({ ...settings, highErrorThresholdCount: Number(e.target.value) })}
                  className="w-32 px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Number of incorrect choices before sub-goal scaffolding hints are forcibly presented.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Constructivist Dynamic Scaffolding</span>
                  <span className="text-[11px] text-slate-500">Automatically display step-by-step guidance on detected overload.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoScaffoldEnabled}
                  onChange={e => setSettings({ ...settings, autoScaffoldEnabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Adaptive Difficulty Scaling</span>
                  <span className="text-[11px] text-slate-500">Promote fluent students to stretch challenges automatically.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.adaptiveDifficultyScaling}
                  onChange={e => setSettings({ ...settings, adaptiveDifficultyScaling: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Save Threshold Parameters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: SUPABASE DATABASE HUB */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Supabase Database Integration Hub</h3>
              <p className="text-xs text-slate-500">
                Connected to project <span className="font-mono font-bold text-blue-600">{SUPABASE_PROJECT_REF}</span>. Real student signups and interaction telemetry synchronize automatically.
              </p>
            </div>

            <a
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
            >
              <span>Open Supabase SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* Database & Table Health Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">PostgreSQL Schema & Table Health</h4>
                  <p className="text-[11px] text-slate-500">
                    Real-time verification of Supabase relational tables.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckTables}
                  disabled={checkingTables}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${checkingTables ? 'animate-spin' : ''}`} />
                  <span>{checkingTables ? 'Checking...' : 'Check Status'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkSync}
                  disabled={syncing}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync All Data Now'}</span>
                </button>
              </div>
            </div>

            {/* Table Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">users Table</div>
                  <div className="text-[10px] text-slate-400">Accounts & roles</div>
                </div>
                {tableStatus?.usersTable ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Needs Schema
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">learning_sessions</div>
                  <div className="text-[10px] text-slate-400">Module session scores</div>
                </div>
                {tableStatus?.sessionsTable ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Needs Schema
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">interaction_events</div>
                  <div className="text-[10px] text-slate-400">Sub-second telemetry</div>
                </div>
                {tableStatus?.eventsTable ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Needs Schema
                  </span>
                )}
              </div>
            </div>

            {syncSummary && (
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{syncSummary}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Credentials */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Active Supabase Credentials</h4>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  settings.isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {settings.isSupabaseConfigured ? 'Active & Synced' : 'Unconfigured'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supabase Project URL</label>
                  <input
                    type="text"
                    value={supabaseUrlInput}
                    onChange={e => setSupabaseUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supabase Anon Public API Key</label>
                  <input
                    type="password"
                    value={supabaseKeyInput}
                    onChange={e => setSupabaseKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {connectionResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    connectionResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {connectionResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    )}
                    <span>{connectionResult.message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={testingConnection}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Testing Connection...' : 'Re-verify Supabase Connection'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SQL Table Schema Generator */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Supabase Database SQL Schema</h4>
                <button
                  onClick={handleCopySchema}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied to Clipboard' : 'Copy SQL'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                To create the database tables, open the <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Supabase SQL Editor</a>, paste the SQL below, and click <strong>Run</strong>:
              </p>

              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
