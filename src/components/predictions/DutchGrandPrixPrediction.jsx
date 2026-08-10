import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import PredictionCountdown from './PredictionCountdown';
import PredictionProgress from './PredictionProgress';
import PredictionQuestionCard from './PredictionQuestionCard';
import PredictionReview from './PredictionReview';
import PredictionSuccess from './PredictionSuccess';
import BackgroundEffects from '../ui/BackgroundEffects';
import { dutchGPQuestions } from '../../data/dutchGPQuestions';
import { driversData } from '../../data/drivers';
import { f1Teams2026 } from '../../data/teams';
import { getAuthorizedHostProfile, supabase } from '../../lib/supabase';

const PREDICTION_KEY = 'yellowFlagPrediction_dutchGP';
const QUESTION_SET_VERSION = 2;
const PODIUM_QUESTION_IDS = [2, 3, 4];
const LEGACY_REMOVED_QUESTION_IDS = [8, 9, 10];
const LEGACY_UNCHANGED_QUESTION_IDS = new Set([1, 2, 3, 4, 6]);
const driverNames = new Set(driversData.map(driver => driver.name));
const teamNames = new Set(f1Teams2026.map(team => team.name));
// Set closing date to a future date for the prototype
const predictionCloseTime = new Date('2026-08-25T15:00:00Z').toISOString();

const hasLegacyQuestionStructure = (savedAnswers) =>
  savedAnswers
  && typeof savedAnswers === 'object'
  && LEGACY_REMOVED_QUESTION_IDS.some(id => Object.hasOwn(savedAnswers, id));

const sanitizeAnswers = (savedAnswers) => {
  if (!savedAnswers || typeof savedAnswers !== 'object' || Array.isArray(savedAnswers)) {
    return {};
  }

  const isLegacy = hasLegacyQuestionStructure(savedAnswers);
  const sanitized = {};

  dutchGPQuestions.forEach(question => {
    // Questions 5 and 7 replaced different legacy questions, so their old
    // answers must not be carried into the new question set.
    if (isLegacy && !LEGACY_UNCHANGED_QUESTION_IDS.has(question.id)) {
      return;
    }

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

export default function DutchGrandPrixPrediction() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stage, setStage] = useState('questions'); // 'questions', 'review', 'success'
  const [validationError, setValidationError] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Load existing predictions from localStorage on mount
  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const saved = localStorage.getItem(PREDICTION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitizedAnswers = sanitizeAnswers(parsed?.answers);
        const isComplete = dutchGPQuestions.every(question => sanitizedAnswers[question.id]);
        const normalizedStatus = parsed?.status === 'submitted' && isComplete ? 'submitted' : 'draft';
        const normalizedData = {
          ...parsed,
          answers: sanitizedAnswers,
          status: normalizedStatus,
          questionSetVersion: QUESTION_SET_VERSION
        };

        setAnswers(sanitizedAnswers);
        localStorage.setItem(PREDICTION_KEY, JSON.stringify(normalizedData));

        if (normalizedStatus === 'submitted') {
          setSubmissionData(normalizedData);

          // If it's already submitted and closed, show read-only
          if (new Date() > new Date(normalizedData.closeTime || predictionCloseTime)) {
            setIsClosed(true);
            setStage('review');
          } else {
            // Still open, let them edit or see success
            setStage('success');
          }
        }
      } catch {
        // Ignore malformed legacy data and start with a clean prediction.
        localStorage.removeItem(PREDICTION_KEY);
      }
    }

    const loadHostPrediction = async () => {
      if (!supabase) return;

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) return;

        const profile = await getAuthorizedHostProfile(authData.user.id);
        if (!profile || !isMounted) return;

        const { data: hostPrediction, error: predictionError } = await supabase
          .from('host_predictions')
          .select('race_id, answers, status, question_set_version, submitted_at')
          .eq('host_id', profile.user_id)
          .eq('race_id', 'dutchGP')
          .maybeSingle();

        if (predictionError) throw predictionError;
        if (!isMounted) return;

        setHostProfile(profile);
        setSubmissionError('');

        if (!hostPrediction) {
          setAnswers({});
          setSubmissionData(null);
          setCurrentQuestionIndex(0);
          setStage('questions');
          return;
        }

        const sanitizedAnswers = sanitizeAnswers(hostPrediction.answers);
        const isComplete = dutchGPQuestions.every(question => sanitizedAnswers[question.id]);
        const normalizedData = {
          raceId: hostPrediction.race_id,
          submittedAt: hostPrediction.submitted_at,
          closeTime: predictionCloseTime,
          answers: sanitizedAnswers,
          status: hostPrediction.status === 'submitted' && isComplete ? 'submitted' : 'draft',
          questionSetVersion: hostPrediction.question_set_version
        };

        setAnswers(sanitizedAnswers);
        setSubmissionData(normalizedData.status === 'submitted' ? normalizedData : null);

        if (normalizedData.status === 'submitted') {
          if (new Date() > new Date(predictionCloseTime)) {
            setIsClosed(true);
            setStage('review');
          } else {
            setStage('success');
          }
        } else {
          setStage('questions');
        }
      } catch {
        if (isMounted) {
          setSubmissionError('Unable to load the saved host prediction. Please try again.');
        }
      }
    };

    loadHostPrediction();

    return () => {
      isMounted = false;
    };
  }, []);

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

    let submitData = {
      raceId: 'dutchGP',
      submittedAt: new Date().toISOString(),
      closeTime: predictionCloseTime,
      answers: sanitizedAnswers,
      status: 'submitted',
      questionSetVersion: QUESTION_SET_VERSION
    };

    setIsSubmitting(true);

    try {
      if (hostProfile && supabase) {
        const { data, error } = await supabase
          .from('host_predictions')
          .upsert({
            host_id: hostProfile.user_id,
            race_id: 'dutchGP',
            answers: sanitizedAnswers,
            status: 'submitted',
            question_set_version: QUESTION_SET_VERSION
          }, { onConflict: 'host_id,race_id' })
          .select('submitted_at')
          .single();

        if (error) throw error;
        submitData = { ...submitData, submittedAt: data.submitted_at };
      } else {
        localStorage.setItem(PREDICTION_KEY, JSON.stringify(submitData));
      }

      setAnswers(sanitizedAnswers);
      setSubmissionData(submitData);
      setStage('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmissionError('Unable to submit the host prediction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCountdownComplete = () => {
    setIsClosed(true);
    // If they haven't submitted, maybe we lock it or show review
  };

  const answeredQuestionNumbers = dutchGPQuestions.reduce((questionNumbers, question, index) => {
    if (answers[question.id]) {
      questionNumbers.push(index + 1);
    }
    return questionNumbers;
  }, []);
  const answeredQuestions = answeredQuestionNumbers.length;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <BackgroundEffects />
      
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        
        {/* Top Navigation */}
        <button 
          onClick={() => navigate('/')}
          className="group mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </button>

        {/* Page Header */}
        <header className="mb-12 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
            <BarChart2 className="h-4 w-4" strokeWidth={3} />
            Race Predictions Are Open
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
                  <p className="text-zinc-400 mb-8">The deadline for submitting predictions has passed.</p>
                  
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
              closeTime={predictionCloseTime} 
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
                  <div className="font-display text-2xl font-black text-white">25</div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
