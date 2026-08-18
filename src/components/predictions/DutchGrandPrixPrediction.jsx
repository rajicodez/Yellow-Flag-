import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import PredictionCountdown from './PredictionCountdown';
import PredictionProgress from './PredictionProgress';
import PredictionQuestionCard from './PredictionQuestionCard';
import PredictionReview from './PredictionReview';
import PredictionSuccess from './PredictionSuccess';
import BackgroundEffects from '../ui/BackgroundEffects';
import { getAuthorizedHostProfile, signInWithGoogle, supabase } from '../../lib/supabase';

const PODIUM_QUESTION_IDS = [2, 3, 4];
const shortTitles = {
  pole_position: 'POLE POSITION',
  race_winner: 'RACE WINNER',
  p2_finisher: 'SECOND PLACE',
  p3_finisher: 'THIRD PLACE',
  driver_of_the_day: 'DRIVER OF THE DAY',
  top_constructor: 'BEST-PERFORMING CONSTRUCTOR',
  worst_constructor: 'WORST-PERFORMING TEAM',
};

const questionCategories = {
  pole_position: 'Qualifying',
  race_winner: 'Race Result',
  p2_finisher: 'Race Result',
  p3_finisher: 'Race Result',
  driver_of_the_day: 'Race Awards',
  top_constructor: 'Team Performance',
  worst_constructor: 'Team Performance',
};

const sanitizeAnswers = (savedAnswers, questions) => {
  if (!savedAnswers || typeof savedAnswers !== 'object' || Array.isArray(savedAnswers)) {
    return {};
  }

  const sanitized = {};

  questions.forEach(question => {
    const answer = savedAnswers[question.id];
    const allowedValues = new Set((question.options ?? []).map((option) => option.value));
    if (typeof answer === 'string' && allowedValues.has(answer)) {
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
  if (['locked', 'scored', 'published'].includes(status) || now >= closesAt) return 'closed';
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

function getSubmissionErrorMessage(error) {
  const message = String(error?.message ?? error ?? '');

  if (message.includes('PREDICTION_LOCKED')) {
    return 'Predictions are locked because FP1 has started.';
  }
  if (message.includes('PREDICTIONS_NOT_OPEN')) {
    return 'Predictions are not open for submission right now.';
  }
  if (message.includes('DUPLICATE_GROUP_ANSWER')) {
    return 'Choose three different drivers for the podium positions.';
  }
  if (message.includes('INVALID_ANSWER_OPTION')) {
    return 'One answer is no longer available. Please review all seven selections.';
  }
  if (message.includes('HOST_COMPETITION_FORBIDDEN')) {
    return 'This account is not authorized for the host competition.';
  }
  if (message.includes('EXACTLY_SEVEN_ANSWERS_REQUIRED')) {
    return 'All seven answers are required.';
  }

  return 'Unable to submit your prediction. Please try again.';
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
  const { raceSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedCompetition = searchParams.get('competition') === 'host' ? 'host' : 'user';
  const isHostMode = requestedCompetition === 'host';
  const [answers, setAnswers] = useState({});
  const [raceQuestions, setRaceQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stage, setStage] = useState('questions'); // 'questions', 'review', 'success'
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [reviewEditSnapshot, setReviewEditSnapshot] = useState(null);
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
    setRaceQuestions([]);
    setRaceWindowState('unavailable');
    setIsClosed(true);
    setIsPredictionLoading(true);
    setPredictionLoadError('');
    setSubmissionError('');

    const loadRaceAndPrediction = async () => {
      try {
        const normalizedRaceSlug = raceSlug === 'dutch-grand-prix'
          ? '2026-dutch-grand-prix'
          : raceSlug;
        const { data: race, error: raceError } = await supabase
          .from('races')
          .select('id, slug, race_name, circuit_name, country_code, opens_at, closes_at, race_starts_at, status')
          .eq('slug', normalizedRaceSlug)
          .maybeSingle();

        if (raceError) throw raceError;
        if (!race || !Number.isFinite(Date.parse(race.closes_at))) {
          throw new Error('Race configuration is unavailable.');
        }

        const { data: raceQuestions, error: questionsError } = await supabase
          .from('race_questions')
          .select('id, question_number, question_key, question_text, answer_type, points, is_active')
          .eq('race_id', race.id)
          .eq('is_active', true)
          .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;

        const questionIds = (raceQuestions ?? []).map((question) => question.id);
        const { data: optionRows, error: optionsError } = await supabase
          .from('race_question_options')
          .select('question_id, option_value, option_label, sort_order')
          .in('question_id', questionIds)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (optionsError) throw optionsError;

        const optionsByQuestionId = new Map();
        for (const option of optionRows ?? []) {
          if (!optionsByQuestionId.has(option.question_id)) optionsByQuestionId.set(option.question_id, []);
          optionsByQuestionId.get(option.question_id).push({
            value: option.option_value,
            label: option.option_label,
          });
        }

        const uiQuestions = (raceQuestions ?? []).map((question) => ({
          id: question.question_number,
          databaseId: question.id,
          databaseKey: question.question_key,
          title: question.question_text,
          shortTitle: shortTitles[question.question_key] ?? `QUESTION ${question.question_number}`,
          category: questionCategories[question.question_key] ?? 'Race Prediction',
          instruction: question.answer_type === 'constructor' ? 'Select one team' : 'Select one driver',
          type: question.answer_type === 'constructor' ? 'team' : 'driver',
          points: question.points,
          options: optionsByQuestionId.get(question.id) ?? [],
        }));

        if (uiQuestions.length !== 7 || uiQuestions.some((question) => !question.options.length)) {
          throw new Error('The race question configuration is incomplete.');
        }

        const databaseQuestionByKey = new Map(
          uiQuestions.map((question) => [question.databaseKey, question])
        );

        const questionKeyById = new Map();
        for (const questionRow of raceQuestions ?? []) {
          const databaseKey = getDatabaseQuestionKey(questionRow);
          if (databaseQuestionByKey.has(databaseKey)) {
            questionKeyById.set(questionRow.id, databaseKey);
          }
        }

        const hasAllQuestions = uiQuestions.every(question =>
          [...questionKeyById.values()].includes(question.databaseKey)
        );
        if (!hasAllQuestions || questionKeyById.size !== uiQuestions.length) {
          throw new Error('The race question configuration is incomplete.');
        }

        const profile = isHostMode
          ? await getAuthorizedHostProfile(authenticatedUserId)
          : null;
        if (!isMounted) return;
        if (isHostMode && !profile) {
          throw new Error('HOST_ACCESS_REQUIRED');
        }
        const competition = requestedCompetition;

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
        setRaceQuestions(uiQuestions);
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

        const sanitizedAnswers = sanitizeAnswers(restoredAnswers, uiQuestions);
        const isComplete = uiQuestions.every(question => sanitizedAnswers[question.id]);
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
      } catch (loadError) {
        if (isMounted) {
          setRaceConfig(null);
          setRaceWindowState('unavailable');
          setIsClosed(true);
          setPredictionLoadError(
            String(loadError?.message ?? '').includes('HOST_ACCESS_REQUIRED')
              ? 'This Google account is not authorized for Host predictions. Continue with Lakindu or Kasun\'s approved account.'
              : 'Unable to load the race configuration or your saved prediction. Please try again.'
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
  }, [authenticatedUserId, isAuthLoading, isHostMode, raceSlug, requestedCompetition]);

  const handleAnswer = (questionId, answer) => {
    if (PODIUM_QUESTION_IDS.includes(questionId)) {
      const duplicateQuestionId = PODIUM_QUESTION_IDS.find(
        otherQuestionId => otherQuestionId !== questionId && answers[otherQuestionId] === answer
      );

      if (duplicateQuestionId) {
        const duplicateQuestion = raceQuestions.find(question => question.id === duplicateQuestionId);
        const currentQuestion = raceQuestions.find(question => question.id === questionId);
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
    const currentQ = raceQuestions[currentQuestionIndex];
    if (!answers[currentQ.id]) {
      setValidationError('Please select an answer to continue.');
      return;
    }

    if (!validatePodium()) {
      return;
    }

    setValidationError('');

    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setReviewEditSnapshot(null);
      setStage('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (currentQuestionIndex < raceQuestions.length - 1) {
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

  const handleCancelReviewEdit = () => {
    if (reviewEditSnapshot) {
      setAnswers((previousAnswers) => ({
        ...previousAnswers,
        [reviewEditSnapshot.questionId]: reviewEditSnapshot.answer,
      }));
    }
    setValidationError('');
    setIsEditingFromReview(false);
    setReviewEditSnapshot(null);
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditQuestion = (num) => {
    const question = raceQuestions[num - 1];
    if (!question) return;

    setValidationError('');
    setReviewEditSnapshot({
      questionId: question.id,
      answer: answers[question.id],
    });
    setCurrentQuestionIndex(num - 1);
    setIsEditingFromReview(true);
    setStage('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToQuestions = () => {
    setValidationError('');
    setCurrentQuestionIndex(raceQuestions.length - 1);
    setIsEditingFromReview(false);
    setReviewEditSnapshot(null);
    setStage('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateQuestion = (num) => {
    if (!answers[raceQuestions[currentQuestionIndex].id]) {
       // if navigating away from current, ensure it's answered if required? 
       // For this prototype, we'll let them navigate to already answered ones.
    }
    setValidationError('');
    setCurrentQuestionIndex(num - 1);
    setStage('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const sanitizedAnswers = sanitizeAnswers(answers, raceQuestions);
    setSubmissionError('');

    if (!supabase || !raceConfig || getRaceWindowState(raceConfig) !== 'open') {
      setSubmissionError('Predictions are not open for submission right now.');
      return;
    }

    // Final check
    const isComplete = raceQuestions.every(q => sanitizedAnswers[q.id]);
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
      raceQuestions.map(question => [
        question.databaseKey,
        sanitizedAnswers[question.id],
      ])
    );
    const competition = requestedCompetition;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_prediction', {
        p_race_slug: raceConfig.slug,
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

      setAnswers(sanitizedAnswers);
      setSubmissionData(submitData);
      setStage('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const friendlyError = getSubmissionErrorMessage(error);
      setSubmissionError(friendlyError);
      if (String(error?.message ?? '').includes('PREDICTION_LOCKED')) {
        setRaceWindowState('closed');
        setIsClosed(true);
      }
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
      await signInWithGoogle(`/predictions/${raceSlug}${isHostMode ? '?competition=host' : ''}`);
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
            {isHostMode ? 'Authorized Host Access' : 'Authentication Required'}
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight text-white sm:text-4xl">
            Sign in to make your {isHostMode ? 'Host ' : ''}prediction
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            {isHostMode
              ? 'Continue with Lakindu or Kasun\'s approved Google account. This entry is kept separate from fan predictions.'
              : 'Continue with your Google account to submit predictions and track your season points.'}
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
            {isHostMode ? 'Host access unavailable' : 'Race data could not be loaded'}
          </h1>
          <p role="alert" className="mt-4 text-sm leading-6 text-zinc-400">
            {predictionLoadError || 'This prediction event is not available right now.'}
          </p>
          <div className="mt-7 space-y-3">
            {isHostMode && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSignInLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-display font-black uppercase tracking-wider text-black transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70"
              >
                <FcGoogle className="h-5 w-5" aria-hidden="true" />
                {isGoogleSignInLoading ? 'Connecting...' : 'Use Approved Google Account'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/#prediction')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </button>
          </div>
        </div>
      </PredictionAuthShell>
    );
  }

  const answeredQuestionNumbers = raceQuestions.reduce((questionNumbers, question, index) => {
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
    ? `${isHostMode ? 'Host ' : ''}Race Predictions Are Open`
    : raceWindowState === 'closed'
      ? `${isHostMode ? 'Host ' : ''}Race Predictions Are Closed`
      : `${isHostMode ? 'Host ' : ''}Race Predictions Are Not Open`;
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
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">{isHostMode ? `${hostProfile?.host_name ?? 'Host'} Prediction` : 'Fan Prediction'}</p>
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
            {raceConfig.race_name}<br />
            <span className="text-yellow-400">Prediction</span>
          </h1>

          <div className="mt-4 flex items-center justify-center lg:justify-start gap-3 font-display text-lg font-bold uppercase tracking-widest text-zinc-400">
            {raceConfig.circuit_name}
            <img 
              src={`https://flagcdn.com/w40/${raceConfig.country_code.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/w80/${raceConfig.country_code.toLowerCase()}.png 2x`}
              width="24" 
              height="16" 
              alt={`${raceConfig.country_code} flag`}
              className="rounded-sm shadow-sm"
            />
          </div>

          <p className="mt-4 max-w-md text-sm text-zinc-500 font-medium">
            Predictions lock when Free Practice 1 begins. Make sure to submit before the countdown ends.
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
                    question={raceQuestions[currentQuestionIndex]}
                    currentAnswer={answers[raceQuestions[currentQuestionIndex].id]}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    isFirst={currentQuestionIndex === 0}
                    isLast={currentQuestionIndex === raceQuestions.length - 1}
                    validationError={validationError}
                    isReviewEdit={isEditingFromReview}
                    onCancelEdit={handleCancelReviewEdit}
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
                    questions={raceQuestions}
                    onSubmit={handleSubmit}
                    onEdit={handleEditQuestion}
                    onBackToQuestions={handleBackToQuestions}
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
                    raceName={raceConfig.race_name}
                    submissionTime={submissionData?.submittedAt}
                    onBackToQuestions={() => {
                      setIsEditingFromReview(false);
                      setReviewEditSnapshot(null);
                      setStage('review');
                    }}
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
                        questions={raceQuestions}
                        onSubmit={() => {}}
                        onEdit={() => {}}
                        onBackToQuestions={() => {}}
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
            
            {stage === 'questions' && !isClosed && !isEditingFromReview && (
              <div className="bg-[#121212]/80 rounded-xl border border-white/10 p-5 shadow-lg backdrop-blur-md">
                <PredictionProgress 
                  currentQuestion={currentQuestionIndex + 1}
                  totalQuestions={raceQuestions.length}
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
