import { User, LearningModule, LearningSession, InteractionEvent, SystemSettings } from '../types';
import { syncUserToSupabase, syncSessionToSupabase, syncInteractionToSupabase, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './supabase';

const USERS_KEY = 'cogadapt_users';
const CURRENT_USER_KEY = 'cogadapt_current_user';
const SESSIONS_KEY = 'cogadapt_sessions';
const EVENTS_KEY = 'cogadapt_events';
const MODULES_KEY = 'cogadapt_modules';
const SETTINGS_KEY = 'cogadapt_settings';

// Real university-level academic modules for higher education students to engage with
const INITIAL_CURRICULUM_MODULES: LearningModule[] = [
  {
    id: 'mod-cog-101',
    code: 'CS-408',
    title: 'Cognitive Computing & Dynamic Scaffolding',
    academicDiscipline: 'Artificial Intelligence & Cognitive Science',
    description: 'Explores real-time cognitive load detection, working memory limitations (Sweller CLT), and algorithmic scaffolding in adaptive pedagogical environments.',
    estimatedMinutes: 15,
    prerequisites: ['Foundations of AI', 'Human-Computer Interaction'],
    learningOutcomes: [
      'Differentiate between intrinsic, extraneous, and germane cognitive load',
      'Analyze how response latency and hesitation patterns indicate schema acquisition',
      'Design rule-based intervention heuristics for real-time instructional adaptation'
    ],
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q-cog-1',
        text: 'According to Cognitive Load Theory (CLT), which instructional adaptation is most effective when a student exhibits high extraneous cognitive load due to complex multi-step problem syntax?',
        targetConcept: 'Cognitive Load Reduction Heuristics',
        difficulty: 'introductory',
        options: [
          'Increase the number of choices to foster exploratory constructivist discovery',
          'Provide worked examples and step-by-step sub-goal scaffolding to minimize split-attention effect',
          'Accelerate the pacing timer to incentivize automaticity and working memory speed',
          'Remove explanatory diagrams and rely purely on formal abstract mathematical notation'
        ],
        correctAnswerIndex: 1,
        explanation: 'Worked examples and sub-goal scaffolding directly mitigate extraneous cognitive load by reducing unguided search in working memory (Sweller et al., 2011).',
        scaffoldHint: 'Consider how working memory has limited capacity: eliminating unguided problem searching frees mental bandwidth.',
        baselineExpectedSeconds: 22
      },
      {
        id: 'q-cog-2',
        text: 'A student reading an interactive data structures proof spends 72 seconds on a single node traversal step with 4 choice modifications before finalizing. What does this behavioral pattern primarily signify?',
        targetConcept: 'Behavioral Hesitation & Working Memory Saturation',
        difficulty: 'intermediate',
        options: [
          'Careless guessing due to disengagement and rapid skimming',
          'Elevated cognitive conflict and hesitation caused by schema ambiguity or mental model friction',
          'Fluent mastery of the conceptual domain requiring immediate difficulty escalation',
          'System networking latency rather than student behavioral dynamics'
        ],
        correctAnswerIndex: 1,
        explanation: 'Prolonged dwell time coupled with multiple choice toggles indicates cognitive hesitation and working memory conflict as the learner actively attempts to reconcile conflicting mental models (Frontiers in Psychology, 2022).',
        scaffoldHint: 'Multiple choice changes combined with long reaction time indicate the student is uncertain between two or more competing options.',
        baselineExpectedSeconds: 25
      },
      {
        id: 'q-cog-3',
        text: 'In an adaptive intelligent tutoring system, how should the model distinguish between a "slip" (execution lapse) and a "misconception" (systemic conceptual error)?',
        targetConcept: 'Error Pattern Discrimination',
        difficulty: 'advanced',
        options: [
          'By assuming all errors are random variance and ignoring consecutive mistake histories',
          'By analyzing latency and error recurrence: slips are typically fast with immediate self-correction, whereas misconceptions repeat consistently across related distractors with high hesitation',
          'By penalizing both equally and forcing the student to restart the entire semester syllabus',
          'By evaluating only final test percentages at the end of the semester rather than real-time telemetry'
        ],
        correctAnswerIndex: 1,
        explanation: 'Slips are characterized by rapid response latency followed by swift self-repair, whereas misconceptions trigger repeated selections of conceptually aligned distractors accompanied by cognitive friction.',
        scaffoldHint: 'Look at both the speed of the error and whether the student selects the same flawed conceptual pattern across retries.',
        baselineExpectedSeconds: 30
      }
    ]
  },
  {
    id: 'mod-algo-202',
    code: 'CS-302',
    title: 'Algorithmic Complexity & Graph Optimization',
    academicDiscipline: 'Computer Science & Engineering',
    description: 'Analysis of asymptotic graph traversal bounds, priority queue relaxation invariants, and dynamic programming state transitions.',
    estimatedMinutes: 20,
    prerequisites: ['Discrete Mathematics', 'Data Structures'],
    learningOutcomes: [
      'Evaluate asymptotic upper bounds for shortest path algorithms',
      'Identify edge relaxation properties in directed acyclic graphs',
      'Optimize memory spatial locality in sparse adjacency structures'
    ],
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q-algo-1',
        text: 'In Dijkstra\'s algorithm implemented with a binary min-heap for a graph with |V| vertices and |E| edges, what is the tight asymptotic upper bound of the decrease-key operations throughout the execution?',
        targetConcept: 'Asymptotic Min-Heap Analysis',
        difficulty: 'introductory',
        options: [
          'O(|V| log |V|)',
          'O(|E| log |V|)',
          'O(|E| + |V|)',
          'O(|V|^2)'
        ],
        correctAnswerIndex: 1,
        explanation: 'Each edge can trigger at most one decrease-key operation in the priority queue. In a binary min-heap, each decrease-key takes O(log |V|), yielding a total of O(|E| log |V|) across all edges.',
        scaffoldHint: 'Each of the |E| edges can potentially trigger an update in the binary heap of size |V|.',
        baselineExpectedSeconds: 20
      },
      {
        id: 'q-algo-2',
        text: 'Why does Bellman-Ford require |V| - 1 relaxation iterations across all edges to guarantee shortest paths in graphs with arbitrary edge weights (assuming no negative-weight cycles)?',
        targetConcept: 'Shortest Path Invariants & Relaxations',
        difficulty: 'intermediate',
        options: [
          'Because any simple shortest path in a graph with |V| vertices contains at most |V| - 1 edges',
          'Because graph adjacency matrices have dimensions |V| × (|V| - 1)',
          'Because vertices must be sorted topologically prior to relaxation',
          'Because Dijkstra handles remaining vertices in constant time'
        ],
        correctAnswerIndex: 0,
        explanation: 'A simple shortest path without cycles passes through at most |V| vertices, which contains at most |V| - 1 edges. Each complete relaxation pass guarantees distance propagation by at least one edge along any optimal path.',
        scaffoldHint: 'How many edges can the longest non-repeating path between two vertices contain?',
        baselineExpectedSeconds: 26
      },
      {
        id: 'q-algo-3',
        text: 'Consider Floyd-Warshall dynamic programming algorithm: D[i][j] = min(D[i][j], D[i][k] + D[k][j]). What critical dependency order requires the intermediate vertex loop k to be the outermost loop?',
        targetConcept: 'Optimal Substructure State Transitions',
        difficulty: 'advanced',
        options: [
          'To optimize CPU cache L1 spatial prefetching on standard DRAM architecture',
          'To ensure all shortest paths utilizing intermediate vertices from the subset {1, ..., k-1} are fully finalized before introducing vertex k into candidate paths',
          'Because the inner loops must execute in reverse order for negative edges',
          'Because memory indices i and j cannot be evaluated simultaneously'
        ],
        correctAnswerIndex: 1,
        explanation: 'The inductive invariant of Floyd-Warshall states that at step k, D[i][j] stores the shortest path using only intermediate vertices from {1, 2, ..., k}. For this state transition to hold, all paths using {1, ..., k-1} must be settled first.',
        scaffoldHint: 'Think of the dynamic programming definition: step k builds upon intermediate nodes {1 ... k-1}.',
        baselineExpectedSeconds: 32
      }
    ]
  }
];

// Initial default system settings configured with project credentials
const DEFAULT_SETTINGS: SystemSettings = {
  supabaseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL,
  supabaseAnonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY,
  isSupabaseConfigured: true,
  responseTimeHesitationThresholdMs: 15000,
  highErrorThresholdCount: 2,
  autoScaffoldEnabled: true,
  adaptiveDifficultyScaling: true,
  minDwellTimeAlertSec: 3
};

// Initial admin account so the administrator can immediately access the linked admin portal
const INITIAL_ADMIN: User = {
  id: 'usr-admin-01',
  name: 'System Administrator',
  email: 'admin@university.edu',
  passwordHash: 'AdminPass2026!',
  role: 'admin',
  department: 'Academic Computing & Educational Research',
  institution: 'Higher Education Academy',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
};

/**
 * Initializes local storage without demo data.
 * Real student data accumulates as students interact with the platform.
 */
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  // Initialize Modules if not present
  if (!localStorage.getItem(MODULES_KEY)) {
    localStorage.setItem(MODULES_KEY, JSON.stringify(INITIAL_CURRICULUM_MODULES));
  }

  // Initialize Users: ONLY seed the master administrative account so the administrator can manage the system;
  // NO demo students or fake student logs ("no demo data should be on this system all data must be real form as users start using this applcation")
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([INITIAL_ADMIN]));
  }

  // Sessions and Events start completely empty
  if (!localStorage.getItem(SESSIONS_KEY)) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
  }

  if (!localStorage.getItem(EVENTS_KEY)) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify([]));
  }

  const existingSettings = localStorage.getItem(SETTINGS_KEY);
  if (!existingSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } else {
    try {
      const parsed = JSON.parse(existingSettings);
      if (!parsed.supabaseUrl || !parsed.supabaseAnonKey) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, ...DEFAULT_SETTINGS }));
      }
    } catch {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
  }
}

// ==================== USER MANAGEMENT ====================

export function getUsers(): User[] {
  if (typeof window === 'undefined') return [INITIAL_ADMIN];
  const data = localStorage.getItem(USERS_KEY);
  if (!data) return [INITIAL_ADMIN];
  try {
    return JSON.parse(data);
  } catch {
    return [INITIAL_ADMIN];
  }
}

export function saveUser(user: User): void {
  const users = getUsers();
  const existingIdx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Sync to Supabase in background
  syncUserToSupabase(user).catch(() => {});
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  users[idx].passwordHash = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  syncUserToSupabase(users[idx]).catch(() => {});
  return true;
}

export function deleteUser(userId: string): boolean {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  if (filtered.length === users.length) return false;
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  
  // Also clean up current user if deleted
  const current = getCurrentUser();
  if (current && current.id === userId) {
    logoutUser();
  }
  return true;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
  } else {
    user.lastLoginAt = new Date().toISOString();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    saveUser(user);
  }
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ==================== LEARNING SESSIONS ====================

export function getSessions(): LearningSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(SESSIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveSession(session: LearningSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  syncSessionToSupabase(session).catch(() => {});
}

export function getUserSessions(userId: string): LearningSession[] {
  return getSessions().filter(s => s.userId === userId);
}

// ==================== INTERACTION EVENTS ====================

export function getInteractionEvents(): InteractionEvent[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(EVENTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function logInteractionEvent(event: InteractionEvent): void {
  const events = getInteractionEvents();
  events.push(event);
  // Keep last 2000 events locally to maintain swift performance
  if (events.length > 2000) {
    events.shift();
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  syncInteractionToSupabase(event).catch(() => {});
}

// ==================== CURRICULUM MODULES ====================

export function getModules(): LearningModule[] {
  if (typeof window === 'undefined') return INITIAL_CURRICULUM_MODULES;
  const data = localStorage.getItem(MODULES_KEY);
  if (!data) return INITIAL_CURRICULUM_MODULES;
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_CURRICULUM_MODULES;
  }
}

export function saveModule(module: LearningModule): void {
  const modules = getModules();
  const idx = modules.findIndex(m => m.id === module.id);
  if (idx >= 0) {
    modules[idx] = module;
  } else {
    modules.push(module);
  }
  localStorage.setItem(MODULES_KEY, JSON.stringify(modules));
}

export function deleteModule(moduleId: string): boolean {
  const modules = getModules();
  const filtered = modules.filter(m => m.id !== moduleId);
  if (filtered.length === modules.length) return false;
  localStorage.setItem(MODULES_KEY, JSON.stringify(filtered));
  return true;
}

// ==================== SYSTEM SETTINGS ====================

export function getSystemSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== REPORT DOWNLOADS ====================

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportStudentPerformanceCsv(): void {
  const sessions = getSessions();
  const users = getUsers();
  const userMap = new Map(users.map(u => [u.id, u]));

  const headers = [
    'Session_ID',
    'Student_ID',
    'Student_Name',
    'Student_Email',
    'Institution',
    'Module_Code',
    'Module_Title',
    'Status',
    'Started_At',
    'Completed_At',
    'Total_Dwell_Seconds',
    'Questions_Answered',
    'Correct_Answers',
    'Accuracy_Percentage',
    'Avg_Response_Time_Ms',
    'Total_Hesitations',
    'Cognitive_Load_Index',
    'Predicted_Cognitive_State',
    'Adaptations_Triggered_Count'
  ];

  const rows = sessions.map(s => {
    const student = userMap.get(s.userId);
    const totalQ = s.responses.length;
    const correctQ = s.responses.filter(r => r.isCorrect).length;
    const accuracy = totalQ > 0 ? ((correctQ / totalQ) * 100).toFixed(1) : '0';
    const metrics = s.finalMetrics;

    return [
      `"${s.id}"`,
      `"${student?.studentId || 'N/A'}"`,
      `"${s.userName.replace(/"/g, '""')}"`,
      `"${s.userEmail}"`,
      `"${student?.institution || 'N/A'}"`,
      `"${s.moduleId}"`,
      `"${s.moduleTitle.replace(/"/g, '""')}"`,
      `"${s.status}"`,
      `"${s.startedAt}"`,
      `"${s.completedAt || ''}"`,
      (s.totalDwellTimeMs / 1000).toFixed(1),
      totalQ,
      correctQ,
      `${accuracy}%`,
      metrics?.averageResponseTimeMs || 0,
      metrics?.totalHesitations || 0,
      metrics?.cognitiveLoadIndex || 0,
      `"${metrics?.predictedState || 'N/A'}"`,
      s.adaptationHistory.length
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(`CognitiveAdapt_Student_Performance_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

export function exportInteractionTelemetryCsv(): void {
  const events = getInteractionEvents();
  const users = getUsers();
  const userMap = new Map(users.map(u => [u.id, u]));

  const headers = [
    'Event_ID',
    'Timestamp',
    'User_ID',
    'User_Name',
    'User_Email',
    'Session_ID',
    'Module_ID',
    'Question_ID',
    'Event_Type',
    'Time_Spent_Ms',
    'Cognitive_Load_Estimate',
    'Event_Details'
  ];

  const rows = events.map(e => {
    const student = userMap.get(e.userId);
    return [
      `"${e.id}"`,
      `"${e.timestamp}"`,
      `"${e.userId}"`,
      `"${(student?.name || 'User').replace(/"/g, '""')}"`,
      `"${student?.email || ''}"`,
      `"${e.sessionId}"`,
      `"${e.moduleId}"`,
      `"${e.questionId || 'N/A'}"`,
      `"${e.eventType}"`,
      e.timeSpentMs,
      e.cognitiveLoadEstimate ?? 'N/A',
      `"${(e.details || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(`CognitiveAdapt_Telemetry_Events_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

export function exportResearchDataJson(): void {
  const users = getUsers();
  const sessions = getSessions();
  const events = getInteractionEvents();
  const modules = getModules();
  const settings = getSystemSettings();

  const fullPayload = {
    exportedAt: new Date().toISOString(),
    system: 'CognitiveAdapt Intelligent Educational System',
    researchScope: 'Behavioural and Cognitive Interaction Analytics in Higher Education',
    dataset: {
      registeredStudentsCount: users.filter(u => u.role === 'student').length,
      administratorsCount: users.filter(u => u.role === 'admin').length,
      users: users.map(u => ({ ...u, passwordHash: '[PROTECTED]' })),
      sessions,
      events,
      curriculumModules: modules,
      systemThresholds: settings
    }
  };

  const jsonContent = JSON.stringify(fullPayload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(`CognitiveAdapt_Research_Dataset_${dateStr}.json`, jsonContent, 'application/json');
}

export async function bulkSyncToSupabase(): Promise<{ syncedUsers: number; syncedSessions: number; syncedEvents: number }> {
  const users = getUsers();
  const sessions = getSessions();
  const events = getInteractionEvents();

  let syncedUsers = 0;
  for (const u of users) {
    const ok = await syncUserToSupabase(u);
    if (ok) syncedUsers++;
  }

  let syncedSessions = 0;
  for (const s of sessions) {
    const ok = await syncSessionToSupabase(s);
    if (ok) syncedSessions++;
  }

  let syncedEvents = 0;
  for (const e of events) {
    const ok = await syncInteractionToSupabase(e);
    if (ok) syncedEvents++;
  }

  return { syncedUsers, syncedSessions, syncedEvents };
}

