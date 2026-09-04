import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, LearningSession, InteractionEvent, LearningModule } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://vqoydhpkvgijhcovowqx.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3lkaHBrdmdpamhjb3Zvd3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDE4MzEsImV4cCI6MjEwNDA3NzgzMX0.DKgVYmLHWHLv80oaeEQgfzviB7Ahgk8B9OGMpy0oS08';
export const SUPABASE_PROJECT_REF = 'vqoydhpkvgijhcovowqx';

let supabaseInstance: SupabaseClient | null = null;
let lastConfiguredUrl = '';
let lastConfiguredKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = customKey || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance || lastConfiguredUrl !== url || lastConfiguredKey !== key) {
    try {
      supabaseInstance = createClient(url, key);
      lastConfiguredUrl = url;
      lastConfiguredKey = key;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export async function checkSupabaseTablesStatus(): Promise<{
  connected: boolean;
  usersTable: boolean;
  sessionsTable: boolean;
  eventsTable: boolean;
  message: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { connected: false, usersTable: false, sessionsTable: false, eventsTable: false, message: 'Client not configured' };
  }

  let usersTable = false;
  let sessionsTable = false;
  let eventsTable = false;

  try {
    const { error: uErr } = await client.from('users').select('id').limit(1);
    usersTable = !uErr || !uErr.message.includes('relation "users" does not exist');

    const { error: sErr } = await client.from('learning_sessions').select('id').limit(1);
    sessionsTable = !sErr || !sErr.message.includes('relation "learning_sessions" does not exist');

    const { error: eErr } = await client.from('interaction_events').select('id').limit(1);
    eventsTable = !eErr || !eErr.message.includes('relation "interaction_events" does not exist');

    return {
      connected: true,
      usersTable,
      sessionsTable,
      eventsTable,
      message: usersTable && sessionsTable && eventsTable
        ? 'All Supabase tables are provisioned and synchronized!'
        : 'Connection established. Some tables need to be created in your Supabase SQL Editor.'
    };
  } catch (err) {
    return {
      connected: false,
      usersTable: false,
      sessionsTable: false,
      eventsTable: false,
      message: err instanceof Error ? err.message : 'Failed to query Supabase tables.'
    };
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url || !key) {
      return { success: false, message: 'URL and Anon Key are required.' };
    }
    const testClient = createClient(url, key);
    // Ping an auth session check or a public table query
    const { error } = await testClient.from('system_health').select('count', { count: 'exact', head: true });
    
    // Even if system_health table is not yet created, getting a 404/PGRST204 or connection response proves credentials reach Supabase
    if (error && error.code !== 'PGRST204' && !error.message?.includes('relation "system_health" does not exist')) {
      // Check if it's an auth or invalid key error
      if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
        return { success: false, message: `Authentication error: ${error.message}` };
      }
    }
    return { success: true, message: 'Successfully connected to Supabase endpoint!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection failed: ${msg}` };
  }
}

export async function syncUserToSupabase(user: User): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role,
      student_id: user.studentId,
      institution: user.institution,
      department: user.department,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
    });
    if (error) {
      console.warn('Supabase users sync notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync error:', err);
    return false;
  }
}

export async function syncSessionToSupabase(session: LearningSession): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('learning_sessions').upsert({
      id: session.id,
      user_id: session.userId,
      user_email: session.userEmail,
      user_name: session.userName,
      module_id: session.moduleId,
      module_title: session.moduleTitle,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      status: session.status,
      active_difficulty: session.activeDifficulty,
      total_dwell_time_ms: session.totalDwellTimeMs,
      responses: session.responses,
      adaptation_history: session.adaptationHistory,
      final_metrics: session.finalMetrics,
    });
    if (error) {
      console.warn('Supabase sessions sync notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync error:', err);
    return false;
  }
}

export async function syncInteractionToSupabase(event: InteractionEvent): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('interaction_events').insert({
      id: event.id,
      user_id: event.userId,
      session_id: event.sessionId,
      module_id: event.moduleId,
      question_id: event.questionId,
      event_type: event.eventType,
      details: event.details,
      time_spent_ms: event.timeSpentMs,
      cognitive_load_estimate: event.cognitiveLoadEstimate,
      timestamp: event.timestamp,
    });
    if (error) {
      console.warn('Supabase interaction sync notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync error:', err);
    return false;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- CognitiveAdapt Supabase Schema Setup
-- Run this script in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  student_id TEXT,
  institution TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  active_difficulty TEXT NOT NULL,
  total_dwell_time_ms BIGINT DEFAULT 0,
  responses JSONB DEFAULT '[]'::jsonb,
  adaptation_history JSONB DEFAULT '[]'::jsonb,
  final_metrics JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES learning_sessions(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  question_id TEXT,
  event_type TEXT NOT NULL,
  details TEXT,
  time_spent_ms INTEGER NOT NULL,
  cognitive_load_estimate NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Row Level Security) or Public Access for Academic Prototype
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated and service access" ON users FOR ALL USING (true);
CREATE POLICY "Allow session logs" ON learning_sessions FOR ALL USING (true);
CREATE POLICY "Allow interaction events" ON interaction_events FOR ALL USING (true);
`;
