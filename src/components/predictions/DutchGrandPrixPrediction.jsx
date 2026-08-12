import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import PredictionCountdown from './PredictionCountdown';
import PredictionProgress from './PredictionProgress';
import PredictionQuestionCard from './PredictionQuestionCard';
import PredictionReview from './PredictionReview';
import PredictionSuccess from './PredictionSuccess';
import BackgroundEffects from '../ui/BackgroundEffects';
import { dutchGPQuestions } from '../../data/dutchGPQuestions';
import { driversData } from '../../data/drivers';
import { f1Teams2026 } from '../../data/teams';
import { getAuthorizedHostProfile, signInWithGoogle, supabase } from '../../lib/supabase';

const RACE_SLUG = '2026-dutch-grand-prix';
const LEGACY_PREDICTION_KEY = 'yellowFlagPrediction_dutchGP';
const PODIUM_QUESTION_IDS = [2, 3, 4];
const driverNames = new Set(driversData.map(driver => driver.name));
const teamNames = new Set(f1Teams2026.map(team => team.name));

const sanitizeAnswers = (savedAnswers) => {
  if (!savedAnswers || typeof savedAnswers !== 'object' || Array.isArray(savedAnswers)) {
    return {};
  }

  const sanitized = {};

  dutchGPQuestions.forEach(question => {
    const answer = savedAnswers[question.id];
    const isValidDriver = question.type === 'driver' && driverNames.has(answer);
    const isValidTeam = question.type === 'team' && teamNames.has(answer);

    if (isValidDriver || isValidTeam) {
      sanitized[question.id] = answer;
    }
  });

  // Keep the first saved podium position and discard later duplicates.
  const usedPodiumDrivers = new Set();
  PODIUM_QUESTION_IDS.forEach(questionId => {
    const driver = sanitized[questionId];
    if (!driver) return;

    if (usedPodiumDrivers.has(driver)) {
      delete sanitized[questionId];
    } else {
      usedPodiumDrivers.add(driver);
    }
  });

  return sanitized;
};

const databaseQuestionByKey = new Map(
  dutchGPQuestions.map(question => [question.databaseKey, question])
);

function getDatabaseQuestionKey(questionRow) {
  return questionRow.question_key
    ?? questionRow.database_key
    ?? questionRow.key
    ?? null;
}

function getPredictionAnswerValue(answerRow) {
  return answerRow.answer
    ?? answerRow.answer_value
    ?? answerRow.answer_text
    ?? answerRow.value
    ?? null;
}

function getRaceWindowState(race) {
  if (!race) return 'unavailable';

  const now = Date.now();
  const opensAt = Date.parse(race.opens_at);
  const closesAt = Date.parse(race.closes_at);
  const status = String(race.status ?? '').toLowerCase();

  if (!Number.isFinite(closesAt)) return 'unavailable';
  if (status === 'closed' || now >= closesAt) return 'closed';
  if (status !== 'open' || (Number.isFinite(opensAt) && now < opensAt)) return 'upcoming';
  return 'open';
}

async function fetchEntryAnswers(entryId) {
  const entryColumns = ['entry_id', 'prediction_entry_id'];
  let lastError = null;

  for (const entryColumn of entryColumns) {
    const { data, error } = await supabase
      .from('prediction_answers')
      .select('*')
      .eq(entryColumn, entryId);

    if (!error) return data ?? [];

    lastError = error;
    const isMissingColumn =
      error.code === '42703'
      || error.code === 'PGRST204'
      || /column.*does not exist|could not find.*column/i.test(error.message ?? '');

    if (!isMissingColumn) break;
  }

  throw lastError ?? new Error('Unable to load saved prediction answers.');
}

const findDuplicatePodiumSelection = (candidateAnswers) => {
  for (const questionId of PODIUM_QUESTION_IDS) {
    const answer = candidateAnswers[questionId];
    if (!answer) continue;

    const duplicateQuestionId = PODIUM_QUESTION_IDS.find(
      otherQuestionId => otherQuestionId !== questionId && candidateAnswers[otherQuestionId] === answer
    );

    if (duplicateQuestionId) {
      return { questionId, duplicateQuestionId, answer };
    }
  }

  return null;
};

function PredictionAuthShell({ children }) {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <BackgroundEffects />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.08),transparent_65%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}

export default function DutchGrandPrixPrediction() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stage, setStage] = useState('questions'); // 'questions', 'review', 'success'
  const [validationError, setValidationError] = useState('');
  const [isClosed, setIsClosed] = useState(true);
  const [submissionData, setSubmissionData] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [raceConfig, setRaceConfig] = useState(null);
  const [raceWindowState, setRaceWindowState] = useState('unavailable');
  const [isPredictionLoading, setIsPredictionLoading] = useState(true);
  const [predictionLoadError, setPredictionLoadError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isGoogleSignInLoading, setIsGoogleSignInLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authenticatedUserId = authUser?.id;

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) throw error;

        setAuthUser(data.session?.user ?? null);
      } catch {
        if (isMounted) {
          setAuthUser(null);
          setAuthError('Unable to restore your session. Please sign in again.');
        }
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setAuthUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) setAuthError('');
    });

    restoreSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    localStorage.removeItem(LEGACY_PREDICTION_KEY);
  }, []);

  useEffect(() => {
    if (isAuthLoading || !authenticatedUserId || !supabase) {
      if (!isAuthLoading && !authenticatedUserId) {
        setHostProfile(null);
        setRaceConfig(null);
        setRaceWindowState('unavailable');
        setIsPredictionLoading(false);
      }
      return undefined;
    }

    let isMounted = true;
    setHostProfile(null);
    setRaceConfig(null);
    setRaceWindowState('unavailable');
    setIsClosed(true);
    setIsPredictionLoading(true);
    setPredictionLoadError('');
    setSubmissionError('');

    const loadRaceAndPrediction = async () => {
      try {
        const { data: race, error: raceError } = await supabase
          .from('races')
          .select('id, opens_at, closes_at, status')
          .eq('slug', RACE_SLUG)
          .maybeSingle();

        if (raceError) throw raceError;
        if (!race || !Number.isFinite(Date.parse(race.closes_at))) {
          throw new Error('Race configuration is unavailable.');
        }

        const { data: raceQuestions, error: questionsError } = await supabase
          .from('race_questions')
          .select('*')
          .eq('race_id', race.id);

        if (questionsError) throw questionsError;

        const questionKeyById = new Map();
        for (const questionRow of raceQuestions ?? []) {
          const databaseKey = getDatabaseQuestionKey(questionRow);
          if (databaseQuestionByKey.has(databaseKey)) {
            questionKeyById.set(questionRow.id, databaseKey);
          }
        }

        const hasAllQuestions = dutchGPQuestions.every(question =>
          [...questionKeyById.values()].includes(question.databaseKey)
        );
        if (!hasAllQuestions || questionKeyById.size !== dutchGPQuestions.length) {
          throw new Error('The race question configuration is incomplete.');
        }

        const profile = await getAuthorizedHostProfile(authenticatedUserId);
        if (!isMounted) return;
        const competition = profile ? 'host' : 'user';

        const { data: predictionEntry, error: entryError } = await supabase
          .from('prediction_entries')
          .select('*')
          .eq('race_id', race.id)
          .eq('user_id', authenticatedUserId)
          .eq('competition', competition)
          .maybeSingle();

        if (entryError) throw entryError;
        if (!isMounted) return;

        setHostProfile(profile);
        setRaceConfig(race);
        const nextRaceWindowState = getRaceWindowState(race);
        setRaceWindowState(nextRaceWindowState);
        setIsClosed(nextRaceWindowState !== 'open');
        setSubmissionError('');

        if (!predictionEntry) {
          setAnswers({});
          setSubmissionData(null);
          setCurrentQuestionIndex(0);
          setStage('questions');
          return;
        }

        const databaseAnswers = await fetchEntryAnswers(predictionEntry.id);
        if (!isMounted) return;

        const restoredAnswers = {};
        for (const answerRow of databaseAnswers) {
          const databaseKey = questionKeyById.get(answerRow.question_id);
          const uiQuestion = databaseQuestionByKey.get(databaseKey);
          const answerValue = getPredictionAnswerValue(answerRow);

          if (uiQuestion && typeof answerValue === 'string') {
            restoredAnswers[uiQuestion.id] = answerValue;
          }
        }

        const sanitizedAnswers = sanitizeAnswers(restoredAnswers);
        const isComplete = dutchGPQuestions.every(question => sanitizedAnswers[question.id]);
        if (!isComplete) {
          throw new Error('The saved prediction is incomplete.');
        }

        const entryIsSubmitted =
          !predictionEntry.status
          || String(predictionEntry.status).toLowerCase() === 'submitted';
        const databaseSubmission = {
          raceId: race.id,
          entryId: predictionEntry.id,
          submittedAt:
            predictionEntry.submitted_at
            ?? predictionEntry.updated_at
            ?? predictionEntry.created_at
            ?? null,
          closeTime: race.closes_at,
          answers: sanitizedAnswers,
          status: entryIsSubmitted ? 'submitted' : 'draft',
          competition,
        };

        setAnswers(sanitizedAnswers);
        setSubmissionData(entryIsSubmitted ? databaseSubmission : null);

        if (entryIsSubmitted) {
          setStage(nextRaceWindowState === 'open' ? 'success' : 'review');
        } else {
          setStage('questions');
        }
      } catch {
        if (isMounted) {
          setRaceConfig(null);
          setRaceWindowState('unavailable');
          setIsClosed(true);
          setPredictionLoadError(
            'Unable to load the race configuration or your saved prediction. Please try again.'
          );
        }
      } finally {
        if (isMounted) setIsPredictionLoading(false);
      }
    };

    loadRaceAndPrediction();

    return () => {
      isMounted = false;
    };
  }, [authenticatedUserId, isAuthLoading]);

  const handleAnswer = (questionId, answer) => {
    if (PODIUM_QUESTION_IDS.includes(questionId)) {
      const duplicateQuestionId = PODIUM_QUESTION_IDS.find(
        otherQuestionId => otherQuestionId !== questionId && answers[otherQuestionId] === answer
      );

      if (duplicateQuestionId) {
        const duplicateQuestion = dutchGPQuestions.find(question => question.id === duplicateQuestionId);
        const currentQuestion = dutchGPQuestions.find(question => question.id === questionId);
        setValidationError(
          `${answer} is already selected for ${duplicateQuestion.shortTitle}. Choose a different driver for ${currentQuestion.shortTitle}.`
        );
        return;
      }
    }

    setValidationError('');
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const validatePodium = (candidateAnswers = answers) => {
    const duplicate = findDuplicatePodiumSelection(candidateAnswers);

    if (duplicate) {
      setValidationError('You cannot select the same driver for multiple podium positions.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    const currentQ = dutchGPQuestions[currentQuestionIndex];
    if (!answers[currentQ.id]) {
      setValidationError('Please select an answer to continue.');
      return;
    }

    if (!validatePodium()) {
      return;
    }

    setValidationError('');
    
    if (currentQuestionIndex < dutchGPQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStage('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setValidationError('');
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateQuestion = (num) => {
    if (!answers[dutchGPQuestions[currentQuestionIndex].id]) {
       // if navigating away from current, ensure it's answered if required? 
       // For this prototype, we'll let them navigate to already answered ones.
    }
    setValidationError('');
    setCurrentQuestionIndex(num - 1);
    setStage('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const sanitizedAnswers = sanitizeAnswers(answers);
    setSubmissionError('');

    if (!supabase || !raceConfig || getRaceWindowState(raceConfig) !== 'open') {
      setSubmissionError('Predictions are not open for submission right now.');
      return;
    }

    // Final check
    const isComplete = dutchGPQuestions.every(q => sanitizedAnswers[q.id]);
    if (!isComplete) {
      alert("Please answer all questions before submitting.");
      return;
    }

    if (!validatePodium(sanitizedAnswers)) {
      setStage('questions');
      setCurrentQuestionIndex(1);
      return;
    }

    const rpcAnswers = Object.fromEntries(
      dutchGPQuestions.map(question => [
        question.databaseKey,
        sanitizedAnswers[question.id],
      ])
    );
    const competition = hostProfile ? 'host' : 'user';

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_prediction', {
        p_race_slug: RACE_SLUG,
        p_competition: competition,
        p_answers: rpcAnswers,
      });

      if (error) throw error;

      const rpcResult = Array.isArray(data) ? data[0] : data;
      const submittedAt =
        (rpcResult && typeof rpcResult === 'object'
          ? rpcResult.submitted_at ?? rpcResult.submittedAt
          : null)
        ?? (typeof rpcResult === 'string' ? rpcResult : null)
        ?? new Date().toISOString();
      const submitData = {
        raceId: raceConfig.id,
        submittedAt,
        closeTime: raceConfig.closes_at,
        answers: sanitizedAnswers,
        status: 'submitted',
        competition,
      };

      localStorage.removeItem(LEGACY_PREDICTION_KEY);
      setAnswers(sanitizedAnswers);
      setSubmissionData(submitData);
      setStage('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmissionError('Unable to submit your prediction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCountdownComplete = () => {
    setRaceWindowState('closed');
    setIsClosed(true);
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsGoogleSignInLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to start Google sign-in. Please try again.'
      );
      setIsGoogleSignInLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) {
      setAuthError('Supabase authentication is not configured.');
      return;
    }

    setAuthError('');
    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      navigate('/#prediction', { replace: true });
    } catch {
      setAuthError('Unable to log out right now. Please try again.');
      setIsSigningOut(false);
    }
  };

  if (isAuthLoading) {
    return (
      <PredictionAuthShell>
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-md rounded-2xl border border-yellow-400/20 bg-[#121212]/95 p-8 text-center shadow-[0_0_50px_rgba(250,204,21,0.12)]"
        >
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-yellow-400" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            Yellow Flag Predictions
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase text-white">
            Restoring your session
          </h1>
        </div>
      </PredictionAuthShell>
    );
  }

  if (!authUser) {
    return (
      <PredictionAuthShell>
        <div className="w-full max-w-md rounded-2xl border border-yellow-400/20 bg-[#121212]/95 p-6 text-center shadow-[0_0_50px_rgba(250,204,21,0.12)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            Authentication Required
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight text-white sm:text-4xl">
            Sign in to make your prediction
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Continue with your Google account to submit predictions and track your season points.
          </p>

          {authError && (
            <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
              {authError}
            </p>
          )}

          <div className="mt-7 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSignInLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-display font-black uppercase tracking-wider text-black transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70"
            >
              <FcGoogle className="h-5 w-5" aria-hidden="true" />
              {isGoogleSignInLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/#prediction')}
              disabled={isGoogleSignInLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition hover:bg-white/5 disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </button>
          </div>
        </div>
      </PredictionAuthShell>
    );
  }

  if (isPredictionLoading) {
    return (
      <PredictionAuthShell>
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-md rounded-2xl border border-yellow-400/20 bg-[#121212]/95 p-8 text-center shadow-[0_0_50px_rgba(250,204,21,0.12)]"
        >
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-yellow-400" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            Yellow Flag Predictions
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase text-white">
            Loading race predictions
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Checking the race window and your saved entry.
          </p>
        </div>
      </PredictionAuthShell>
    );
  }

  if (predictionLoadError || !raceConfig) {
    return (
      <PredictionAuthShell>
        <div className="w-full max-w-md rounded-2xl border border-yellow-400/20 bg-[#121212]/95 p-6 text-center shadow-[0_0_50px_rgba(250,204,21,0.12)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            Predictions Unavailable
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight text-white sm:text-4xl">
            Race data could not be loaded
          </h1>
          <p role="alert" className="mt-4 text-sm leading-6 text-zinc-400">
            {predictionLoadError || 'This prediction event is not available right now.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/#prediction')}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </button>
        </div>
      </PredictionAuthShell>
    );
  }

  const answeredQuestionNumbers = dutchGPQuestions.reduce((questionNumbers, question, index) => {
    if (answers[question.id]) {
      questionNumbers.push(index + 1);
    }
    return questionNumbers;
  }, []);
  const answeredQuestions = answeredQuestionNumbers.length;
  const userDisplayName =
    authUser.user_metadata?.full_name
    || authUser.user_metadata?.name
    || authUser.email
    || 'Signed in user';
  const userAvatarUrl =
    authUser.user_metadata?.avatar_url
    || authUser.user_metadata?.picture
    || null;
  const raceStatusLabel = raceWindowState === 'open'
    ? 'Race Predictions Are Open'
    : raceWindowState === 'closed'
      ? 'Race Predictions Are Closed'
      : 'Race Predictions Are Not Open';
  const closedMessage = raceWindowState === 'upcoming'
    ? 'The prediction window has not opened yet.'
    : 'The deadline for submitting predictions has passed.';

  return (
    <div className="relative min-h-screen bg-black text-white">
      <BackgroundEffects />
      
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        
        {/* Top Navigation */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 self-start text-sm font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </button>

          <div className="flex max-w-full items-center gap-3 self-start rounded-xl border border-white/10 bg-[#121212]/80 px-3 py-2 backdrop-blur-md sm:self-auto">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 rounded-full border border-yellow-400/30 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 font-display text-sm font-black uppercase text-yellow-400">
                {userDisplayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="max-w-48 truncate text-sm font-semibold text-white">{userDisplayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">Signed In</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="ml-1 shrink-0 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? 'Logging Out...' : 'Log Out'}
            </button>
          </div>
        </div>

        {authError && (
          <p role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
            {authError}
          </p>
        )}

        {/* Page Header */}
        <header className="mb-12 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
            <BarChart2 className="h-4 w-4" strokeWidth={3} />
            {raceStatusLabel}
          </div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-black uppercase leading-none tracking-tight text-white lg:text-7xl">
            Dutch Grand Prix<br />
            <span className="text-yellow-400">Prediction</span>
          </h1>

          <div className="mt-4 flex items-center justify-center lg:justify-start gap-3 font-display text-lg font-bold uppercase tracking-widest text-zinc-400">
            Circuit Zandvoort
            <img 
              src="https://flagcdn.com/w40/nl.png" 
              srcSet="https://flagcdn.com/w80/nl.png 2x" 
              width="24" 
              height="16" 
              alt="Netherlands Flag" 
              className="rounded-sm shadow-sm"
            />
          </div>

          <p className="mt-4 max-w-md text-sm text-zinc-500 font-medium">
            Predictions close when Qualifying Q1 begins. Make sure to submit before the countdown ends.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            
            <AnimatePresence mode="wait">
              {stage === 'questions' && !isClosed && (
                <motion.div
                  key={`q-${currentQuestionIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PredictionQuestionCard
                    question={dutchGPQuestions[currentQuestionIndex]}
                    currentAnswer={answers[dutchGPQuestions[currentQuestionIndex].id]}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    isFirst={currentQuestionIndex === 0}
                    isLast={currentQuestionIndex === dutchGPQuestions.length - 1}
                    validationError={validationError}
                  />
                </motion.div>
              )}

              {stage === 'review' && !isClosed && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  {submissionError && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
                      {submissionError}
                    </p>
                  )}
                  <PredictionReview 
                    answers={answers}
                    onSubmit={handleSubmit}
                    onEdit={handleNavigateQuestion}
                    isSubmitting={isSubmitting}
                  />
                </motion.div>
              )}

              {stage === 'success' && !isClosed && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <PredictionSuccess 
                    submissionTime={submissionData?.submittedAt}
                    onBackToQuestions={() => setStage('review')}
                  />
                </motion.div>
              )}

              {isClosed && (
                <motion.div
                  key="closed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 bg-[#121212]/80 rounded-2xl border border-white/10"
                >
                  <h2 className="font-display text-4xl font-black uppercase text-white mb-4">Predictions Closed</h2>
                  <p className="text-zinc-400 mb-8">{closedMessage}</p>
                  
                  {submissionData ? (
                    <div className="w-full">
                      <h3 className="font-display text-2xl font-bold uppercase text-yellow-400 mb-6 text-center">Your Submitted Answers</h3>
                      <PredictionReview 
                        answers={submissionData.answers}
                        onSubmit={() => {}}
                        onEdit={() => {}}
                        isSubmitting={true} // disable buttons
                      />
                    </div>
                  ) : (
                    <p className="text-red-400 font-bold">You did not submit a prediction in time.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Right Sidebar (Countdown & Progress) */}
          <div className="lg:col-span-4 order-1 lg:order-2 space-y-6">
            <PredictionCountdown 
              closeTime={raceConfig.closes_at}
              onComplete={handleCountdownComplete} 
            />
            
            {stage === 'questions' && !isClosed && (
              <div className="bg-[#121212]/80 rounded-xl border border-white/10 p-5 shadow-lg backdrop-blur-md">
                <PredictionProgress 
                  currentQuestion={currentQuestionIndex + 1}
                  totalQuestions={dutchGPQuestions.length}
                  answeredQuestions={answeredQuestions}
                  answeredQuestionNumbers={answeredQuestionNumbers}
                  onNavigate={handleNavigateQuestion}
                />
                
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="text-sm font-bold uppercase tracking-wider text-zinc-400">Total Points</div>
                  <div className="font-display text-2xl font-black text-white">7</div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
