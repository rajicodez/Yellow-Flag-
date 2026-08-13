import { useCallback, useMemo, useState } from 'react';
import { dutchGrandPrixQuestions, sprintGrandPrixQuestions } from './data';

const cloneQuestions = (questions) => questions.map((question) => ({ ...question }));

export default function useSprintWeekend() {
  const [isSprintWeekend, setIsSprintWeekend] = useState(false);
  const [grandPrixQuestions, setGrandPrixQuestions] = useState(() => cloneQuestions(dutchGrandPrixQuestions));
  const [sprintQuestions, setSprintQuestions] = useState(() => cloneQuestions(sprintGrandPrixQuestions));
  const [sprintQuestionsEdited, setSprintQuestionsEdited] = useState(false);

  const questions = useMemo(
    () => isSprintWeekend ? [...grandPrixQuestions, ...sprintQuestions] : grandPrixQuestions,
    [grandPrixQuestions, isSprintWeekend, sprintQuestions]
  );

  const updateQuestion = useCallback((id, updates) => {
    const isSprintQuestion = sprintGrandPrixQuestions.some((question) => question.id === id);
    const updateQuestions = (current) => current.map(
      (question) => question.id === id ? { ...question, ...updates } : question
    );

    if (isSprintQuestion) {
      setSprintQuestions(updateQuestions);
      setSprintQuestionsEdited(true);
      return;
    }

    setGrandPrixQuestions(updateQuestions);
  }, []);

  const enableSprintWeekend = useCallback(() => {
    setIsSprintWeekend(true);
  }, []);

  const disableSprintWeekend = useCallback(() => {
    setIsSprintWeekend(false);
    setSprintQuestions(cloneQuestions(sprintGrandPrixQuestions));
    setSprintQuestionsEdited(false);
  }, []);

  const totalQuestions = questions.length;
  const maximumPoints = questions.reduce((total, question) => total + question.points, 0);
  const activeQuestions = questions.filter((question) => question.active).length;

  return {
    activeQuestions,
    disableSprintWeekend,
    enableSprintWeekend,
    isSprintWeekend,
    maximumPoints,
    questions,
    sprintQuestionsEdited,
    totalQuestions,
    updateQuestion,
  };
}
