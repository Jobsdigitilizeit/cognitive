import React, { useState, useEffect, useRef } from 'react';
import { User, LearningModule, Question, LearningSession, QuestionResponse, CognitiveMetrics } from '../types';
import {
  getUserSessions,
  saveSession,
  logInteractionEvent,
  getModules,
} from '../services/storage';
import { evaluateCognitiveLoad, aggregateSessionMetrics } from '../services/adaptiveEngine';
import {
  BookOpen,
  Activity,
  Clock,
  HelpCircle,
  TrendingUp,
  Brain,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Compass
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  
  // Active learning session state
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  // Real-time telemetry tracking variables for current question
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hesitationCount, setHesitationCount] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(1);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showScaffoldHint, setShowScaffoldHint] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
    responseTimeMs: number;
    cliScore: number;
    adaptationAction?: string;
  } | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Timer ref for real-time sub-second reaction timing
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load real data for current user
  useEffect(() => {
    setModules(getModules());
    refreshUserSessions();
  }, [user.id]);

  const refreshUserSessions = () => {
    const userSessions = getUserSessions(user.id);
    setSessions(userSessions);
  };

  // Live timer for question response latency
  useEffect(() => {
    if (activeSession && !submittedFeedback && !sessionFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - questionStartTime) / 1000));
      }, 500);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession, submittedFeedback, sessionFinished, questionStartTime]);

  // Start a new adaptive module
  const handleStartModule = (mod: LearningModule) => {
    const newSessionId = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSession: LearningSession = {
      id: newSessionId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      moduleId: mod.id,
      moduleTitle: mod.title,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      currentQuestionIndex: 0,
      activeDifficulty: 'introductory',
      totalDwellTimeMs: 0,
      responses: [],
      adaptationHistory: []
    };

    setActiveModule(mod);
    setActiveSession(newSession);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setHesitationCount(0);
    setAttemptsCount(1);
    setShowScaffoldHint(false);
    setSubmittedFeedback(null);
    setSessionFinished(false);
    setQuestionStartTime(Date.now());
    setElapsedSeconds(0);

    // Telemetry event log
    logInteractionEvent({
      id: `evt-${Date.now()}`,
      userId: user.id,
      sessionId: newSessionId,
      moduleId: mod.id,
      eventType: 'session_start',
      details: `Student commenced adaptive module: ${mod.title}`,
      timeSpentMs: 0,
      timestamp: new Date().toISOString()
    });

    saveSession(newSession);
  };

  // Option selection with hesitation detection (CLT telemetry)
  const handleSelectOption = (idx: number) => {
    if (submittedFeedback) return; // Locked once submitted

    if (selectedOption !== null && selectedOption !== idx) {
      // Choice was altered! Log hesitation
      const newHesitation = hesitationCount + 1;
      setHesitationCount(newHesitation);

      logInteractionEvent({
        id: `evt-${Date.now()}`,
        userId: user.id,
        sessionId: activeSession!.id,
        moduleId: activeModule!.id,
        questionId: currentQuestion?.id,
        eventType: 'choice_changed',
        details: `Altered answer from Option ${selectedOption + 1} to Option ${idx + 1} (Hesitation count: ${newHesitation})`,
        timeSpentMs: Date.now() - questionStartTime,
        timestamp: new Date().toISOString()
      });

      // If student hesitates repeatedly, suggest scaffold hint automatically
      if (newHesitation >= 2 && !showScaffoldHint) {
        setShowScaffoldHint(true);
      }
    } else if (selectedOption === null) {
      logInteractionEvent({
        id: `evt-${Date.now()}`,
        userId: user.id,
        sessionId: activeSession!.id,
        moduleId: activeModule!.id,
        questionId: currentQuestion?.id,
        eventType: 'choice_selected',
        details: `Selected Option ${idx + 1}`,
        timeSpentMs: Date.now() - questionStartTime,
        timestamp: new Date().toISOString()
      });
    }

    setSelectedOption(idx);
  };

  const handleRequestHint = () => {
    setShowScaffoldHint(true);
    if (activeSession && currentQuestion) {
      logInteractionEvent({
        id: `evt-${Date.now()}`,
        userId: user.id,
        sessionId: activeSession.id,
        moduleId: activeModule!.id,
        questionId: currentQuestion.id,
        eventType: 'hint_requested',
        details: 'Student manually accessed constructivist scaffolding hint.',
        timeSpentMs: Date.now() - questionStartTime,
        timestamp: new Date().toISOString()
      });
    }
  };

  const currentQuestion: Question | undefined = activeModule?.questions[currentQuestionIdx];

  // Submit answer and invoke Cognitive-Behavioural Adaptive Engine
  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQuestion || !activeSession) return;

    const responseTimeMs = Date.now() - questionStartTime;
    const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;

    // Run Real-time Cognitive Evaluation
    const assessment = evaluateCognitiveLoad({
      question: currentQuestion,
      responseTimeMs,
      hesitationCount,
      attemptsCount,
      isCorrect,
      previousResponses: activeSession.responses
    });

    const newResponse: QuestionResponse = {
      questionId: currentQuestion.id,
      selectedOptionIndex: selectedOption,
      isCorrect,
      responseTimeMs,
      hesitationCount,
      attemptsCount,
      hintUsed: showScaffoldHint,
      cognitiveLoadScore: assessment.cognitiveLoadIndex,
      adaptationAction: assessment.suggestedAction
    };

    const updatedResponses = [...activeSession.responses, newResponse];

    // Log adaptation if triggered
    const updatedAdaptationHistory = [...activeSession.adaptationHistory];
    if (assessment.isScaffoldRequired || assessment.stepUpDifficulty) {
      updatedAdaptationHistory.push({
        timestamp: new Date().toISOString(),
        trigger: assessment.triggerReason,
        actionTaken: assessment.suggestedAction,
        previousLevel: activeSession.activeDifficulty,
        newLevel: assessment.stepUpDifficulty ? 'advanced' : 'introductory'
      });
    }

    const updatedSession: LearningSession = {
      ...activeSession,
      responses: updatedResponses,
      adaptationHistory: updatedAdaptationHistory,
      totalDwellTimeMs: activeSession.totalDwellTimeMs + responseTimeMs
    };

    setActiveSession(updatedSession);
    saveSession(updatedSession);

    // Telemetry log
    logInteractionEvent({
      id: `evt-${Date.now()}`,
      userId: user.id,
      sessionId: activeSession.id,
      moduleId: activeModule!.id,
      questionId: currentQuestion.id,
      eventType: 'answer_submitted',
      details: `Answered ${isCorrect ? 'CORRECTLY' : 'INCORRECTLY'}. CLI: ${assessment.cognitiveLoadIndex}/100, Latency: ${(responseTimeMs / 1000).toFixed(1)}s`,
      timeSpentMs: responseTimeMs,
      cognitiveLoadEstimate: assessment.cognitiveLoadIndex,
      timestamp: new Date().toISOString()
    });

    setSubmittedFeedback({
      isCorrect,
      explanation: currentQuestion.explanation,
      responseTimeMs,
      cliScore: assessment.cognitiveLoadIndex,
      adaptationAction: assessment.suggestedAction
    });
  };

  // Move to next question or complete session
  const handleNextQuestion = () => {
    if (!activeModule || !activeSession) return;

    if (currentQuestionIdx + 1 < activeModule.questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setHesitationCount(0);
      setAttemptsCount(1);
      setShowScaffoldHint(false);
      setSubmittedFeedback(null);
      setQuestionStartTime(Date.now());
      setElapsedSeconds(0);
    } else {
      // Finalize Session
      const finalMetrics = aggregateSessionMetrics(activeSession.responses);
      const finalizedSession: LearningSession = {
        ...activeSession,
        status: 'completed',
        completedAt: new Date().toISOString(),
        finalMetrics
      };

      saveSession(finalizedSession);
      setActiveSession(finalizedSession);
      setSessionFinished(true);
      refreshUserSessions();

      logInteractionEvent({
        id: `evt-${Date.now()}`,
        userId: user.id,
        sessionId: activeSession.id,
        moduleId: activeModule.id,
        eventType: 'session_completed',
        details: `Adaptive session concluded. Overall CLI: ${finalMetrics.cognitiveLoadIndex}, Accuracy: ${((activeSession.responses.filter(r => r.isCorrect).length / activeSession.responses.length) * 100).toFixed(0)}%`,
        timeSpentMs: finalizedSession.totalDwellTimeMs,
        cognitiveLoadEstimate: finalMetrics.cognitiveLoadIndex,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Calculate real student cumulative stats (ZERO demo data)
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const allResponses = completedSessions.flatMap(s => s.responses);
  const totalCompleted = completedSessions.length;
  const totalCorrect = allResponses.filter(r => r.isCorrect).length;
  const overallAccuracy = allResponses.length > 0 ? Math.round((totalCorrect / allResponses.length) * 100) : 0;
  const avgLatencySec = allResponses.length > 0
    ? (allResponses.reduce((acc, r) => acc + r.responseTimeMs, 0) / allResponses.length / 1000).toFixed(1)
    : '0.0';
  const avgCli = allResponses.length > 0
    ? Math.round(allResponses.reduce((acc, r) => acc + r.cognitiveLoadScore, 0) / allResponses.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* If Active Session is running, render the Interactive Cognitive HUD & Assessment */}
      {activeSession && activeModule && !sessionFinished ? (
        <div className="space-y-6">
          {/* Top Session Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
                  {activeModule.code}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{activeModule.academicDiscipline}</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{activeModule.title}</h2>
            </div>

            {/* Real-time Cognitive Telemetry HUD */}
            <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-700" title="Millisecond reaction timer">
                <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>Elapsed: <strong className="text-slate-900 font-bold">{elapsedSeconds}s</strong></span>
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-1.5 text-slate-700" title="Detected option changes & hesitation count">
                <Activity className="w-4 h-4 text-amber-600" />
                <span>Hesitations: <strong className="text-slate-900 font-bold">{hesitationCount}</strong></span>
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-1.5 text-slate-700">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Q {currentQuestionIdx + 1}/{activeModule.questions.length}</span>
              </div>
            </div>
          </div>

          {/* Active Question Card */}
          {currentQuestion && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Concept: {currentQuestion.targetConcept}
                  </span>
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Target Baseline: {currentQuestion.baselineExpectedSeconds}s
                </span>
              </div>

              {/* Question Text */}
              <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
                {currentQuestion.text}
              </p>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isSubmitted = submittedFeedback !== null;
                  const isCorrectAnswer = idx === currentQuestion.correctAnswerIndex;

                  let borderClass = 'border-slate-200 hover:border-slate-300 bg-white';
                  if (isSelected) {
                    borderClass = 'border-blue-600 bg-blue-50/40 text-blue-900 ring-1 ring-blue-600';
                  }

                  if (isSubmitted) {
                    if (isCorrectAnswer) {
                      borderClass = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrectAnswer) {
                      borderClass = 'border-rose-500 bg-rose-50/60 text-rose-950 ring-1 ring-rose-500';
                    } else {
                      borderClass = 'opacity-60 border-slate-200 bg-slate-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isSubmitted}
                      className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${borderClass}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-normal">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Constructivist Scaffolding Hint (Triggered dynamically when hesitation/load is high) */}
              {showScaffoldHint && (
                <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-sm space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                    <span>Dynamic Cognitive Scaffold Hint</span>
                  </div>
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                    {currentQuestion.scaffoldHint}
                  </p>
                </div>
              )}

              {/* Feedback Alert After Submission */}
              {submittedFeedback && (
                <div className={`p-5 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
                  submittedFeedback.isCorrect
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-base">
                      {submittedFeedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Constructivist Mastery Confirmed</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-600" />
                          <span>Conceptual Misconception Identified</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span>Latency: {(submittedFeedback.responseTimeMs / 1000).toFixed(1)}s</span>
                      <span>CLI Score: {submittedFeedback.cliScore}/100</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {submittedFeedback.explanation}
                  </p>

                  {submittedFeedback.adaptationAction && (
                    <div className="pt-2 border-t border-slate-200/60 text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>Adaptive Heuristic: {submittedFeedback.adaptationAction}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {!showScaffoldHint && !submittedFeedback ? (
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Need Guidance? (Request Scaffolding Hint)</span>
                  </button>
                ) : <div />}

                {!submittedFeedback ? (
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Submit Answer</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>
                      {currentQuestionIdx + 1 < activeModule.questions.length
                        ? 'Proceed to Next Concept'
                        : 'Conclude & Compute Cognitive Analytics'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : sessionFinished && activeSession ? (
        /* Completed Session Cognitive Analytics Report */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Session Concluded</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Cognitive Interaction Diagnostics: {activeSession.moduleTitle}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">Accuracy</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {Math.round(
                  (activeSession.responses.filter(r => r.isCorrect).length /
                    activeSession.responses.length) *
                    100
                )}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">Mean Latency</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {((activeSession.finalMetrics?.averageResponseTimeMs || 0) / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">Cognitive Load</span>
              <span className="text-2xl font-extrabold text-blue-600 mt-1 block">
                {activeSession.finalMetrics?.cognitiveLoadIndex || 0}/100
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">Cognitive State</span>
              <span className="text-sm font-extrabold text-indigo-700 uppercase mt-2 block">
                {(activeSession.finalMetrics?.predictedState || 'flow').replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Adaptation history log */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Dynamic Adaptation Interventions</h3>
            {activeSession.adaptationHistory.length > 0 ? (
              <div className="space-y-2">
                {activeSession.adaptationHistory.map((adp, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-mono">
                      <span>Trigger: {adp.trigger}</span>
                      <span>Level: {adp.newLevel}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{adp.actionTaken}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50">
                Cognitive flow maintained without needing severe difficulty step-downs.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                setActiveSession(null);
                setActiveModule(null);
                setSessionFinished(false);
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Return to Curriculum Dashboard
            </button>
          </div>
        </div>
      ) : (
        /* Regular Student Workspace / Dashboard */
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-blue-600">Higher Education Student Portal</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Institution: <span className="font-semibold text-slate-700">{user.institution || 'University Academy'}</span> | ID: <span className="font-mono text-slate-700">{user.studentId || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Cumulative Real Cognitive Telemetry Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Sessions</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900">{totalCompleted}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Live recorded sessions</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Mean Response Latency</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900">{avgLatencySec}s</span>
              <span className="text-[11px] text-slate-400 block mt-1">Time per conceptual question</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Cognitive Load Index</span>
                <Brain className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900">{avgCli}/100</span>
              <span className="text-[11px] text-slate-400 block mt-1">Sweller CLT score</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Overall Accuracy</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900">{overallAccuracy}%</span>
              <span className="text-[11px] text-slate-400 block mt-1">Mastery rate across modules</span>
            </div>
          </div>

          {/* Curriculum Modules for Adaptive Learning */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Available Adaptive Curriculum Modules</h3>
                <p className="text-xs text-slate-500">
                  Select a module to commence active cognitive tracking and real-time scaffolding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map(mod => {
                const userSessionForMod = sessions.find(s => s.moduleId === mod.id && s.status === 'completed');

                return (
                  <div
                    key={mod.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                          {mod.code}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">~{mod.estimatedMinutes} mins</span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">{mod.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{mod.description}</p>

                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Core Concepts
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.questions.map((q, qIdx) => (
                            <span key={qIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {q.targetConcept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                      {userSessionForMod ? (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed ({Math.round((userSessionForMod.responses.filter(r => r.isCorrect).length / userSessionForMod.responses.length) * 100)}%)</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Ready to begin</span>
                      )}

                      <button
                        onClick={() => handleStartModule(mod)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{userSessionForMod ? 'Retake Session' : 'Start Adaptive Module'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real Learning Sessions History Table (Zero Demo Data Guarantee) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Your Cognitive Session History</h3>

            {completedSessions.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No study sessions recorded yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  As per system specifications, no demo data is pre-populated. Launch any curriculum module above to initiate your live behavioural tracking.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Module</th>
                      <th className="py-3 px-4">Concluded</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4">Avg Latency</th>
                      <th className="py-3 px-4">Cognitive Load</th>
                      <th className="py-3 px-4">Predicted State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedSessions.map(ses => {
                      const totalQ = ses.responses.length;
                      const correctQ = ses.responses.filter(r => r.isCorrect).length;
                      const pct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
                      return (
                        <tr key={ses.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-semibold text-slate-800">{ses.moduleTitle}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {ses.completedAt ? new Date(ses.completedAt).toLocaleDateString() : 'In progress'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{pct}%</td>
                          <td className="py-3 px-4 text-slate-600">
                            {((ses.finalMetrics?.averageResponseTimeMs || 0) / 1000).toFixed(1)}s
                          </td>
                          <td className="py-3 px-4 font-semibold text-blue-600">
                            {ses.finalMetrics?.cognitiveLoadIndex || 0}/100
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {(ses.finalMetrics?.predictedState || 'flow').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
