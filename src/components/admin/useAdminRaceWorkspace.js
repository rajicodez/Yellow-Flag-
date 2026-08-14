import { useCallback, useMemo, useState } from 'react';
import { defaultGrandPrixQuestions, demoRaces, sprintGrandPrixQuestions } from './data';

const cloneQuestions = (questions) => questions.map((question) => ({ ...question }));

export function getRaceStableId(race) {
  return race ? String(race.calendarId ?? race.id) : '';
}

export function createDefaultQuestionSet(race) {
  const standardQuestions = cloneQuestions(defaultGrandPrixQuestions);
  return race?.sprintWeekend
    ? [...standardQuestions, ...cloneQuestions(sprintGrandPrixQuestions)]
    : standardQuestions;
}

function syncSprintQuestions(questions, sprintWeekend) {
  const standardQuestions = cloneQuestions((questions ?? []).filter((question) => !question.sprint));
  if (!sprintWeekend) return standardQuestions;

  const existingSprintQuestions = (questions ?? []).filter((question) => question.sprint);
  return [
    ...standardQuestions,
    ...cloneQuestions(existingSprintQuestions.length ? existingSprintQuestions : sprintGrandPrixQuestions),
  ];
}

function createInitialQuestionsByRaceId(races) {
  return races.reduce((result, race) => {
    if (race.questions > 0) result[getRaceStableId(race)] = createDefaultQuestionSet(race);
    return result;
  }, {});
}

function getInitialSelectedRaceId(races, questionsByRaceId) {
  const activeRace = races.find((race) => race.status === 'Open');
  if (activeRace) return getRaceStableId(activeRace);

  const now = Date.now();
  const upcomingConfiguredRace = [...races]
    .filter((race) => questionsByRaceId[getRaceStableId(race)] && new Date(race.raceStart).getTime() >= now)
    .sort((first, second) => new Date(first.raceStart) - new Date(second.raceStart))[0];

  return getRaceStableId(upcomingConfiguredRace ?? races[0]);
}

function cloneQuestionsByRaceId(source) {
  return Object.fromEntries(
    Object.entries(source).map(([raceId, questions]) => [raceId, cloneQuestions(questions)])
  );
}

function hasCustomizedSprintQuestions(questions) {
  const sprintQuestions = (questions ?? []).filter((question) => question.sprint);
  if (!sprintQuestions.length) return false;

  return sprintQuestions.some((question) => {
    const defaultQuestion = sprintGrandPrixQuestions.find((candidate) => candidate.id === question.id);
    return !defaultQuestion || ['key', 'text', 'type', 'points', 'active'].some(
      (field) => question[field] !== defaultQuestion[field]
    );
  });
}

export default function useAdminRaceWorkspace() {
  const initialQuestions = useMemo(() => createInitialQuestionsByRaceId(demoRaces), []);
  const [races, setRaces] = useState(() => demoRaces.map((race) => ({ ...race })));
  const [selectedRaceId, setSelectedRaceId] = useState(
    () => getInitialSelectedRaceId(demoRaces, initialQuestions)
  );
  const [questionsByRaceId, setQuestionsByRaceId] = useState(
    () => cloneQuestionsByRaceId(initialQuestions)
  );
  const [savedQuestionsByRaceId, setSavedQuestionsByRaceId] = useState(
    () => cloneQuestionsByRaceId(initialQuestions)
  );
  const [dirtyRaceIds, setDirtyRaceIds] = useState(() => new Set());
  const [sprintCustomizedRaceIds, setSprintCustomizedRaceIds] = useState(() => new Set());

  const selectedRace = races.find((race) => getRaceStableId(race) === selectedRaceId) ?? null;
  const questions = questionsByRaceId[selectedRaceId] ?? [];

  const updateRaceQuestionMetadata = useCallback((raceId, questionSet, sprintWeekend) => {
    setRaces((currentRaces) => currentRaces.map((race) => (
      getRaceStableId(race) === raceId
        ? { ...race, questions: questionSet.length, sprintWeekend }
        : race
    )));
  }, []);

  const ensureQuestionsForRace = useCallback((race, { createIfMissing = true } = {}) => {
    const raceId = getRaceStableId(race);
    if (!raceId) return;

    setQuestionsByRaceId((current) => {
      if (!current[raceId]?.length && !createIfMissing) {
        updateRaceQuestionMetadata(raceId, [], race.sprintWeekend);
        return current;
      }
      const nextQuestions = current[raceId]?.length
        ? syncSprintQuestions(current[raceId], race.sprintWeekend)
        : createDefaultQuestionSet(race);

      setSavedQuestionsByRaceId((saved) => ({
        ...saved,
        [raceId]: cloneQuestions(nextQuestions),
      }));
      updateRaceQuestionMetadata(raceId, nextQuestions, race.sprintWeekend);
      return { ...current, [raceId]: nextQuestions };
    });

    setDirtyRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
  }, [updateRaceQuestionMetadata]);

  const createQuestionsForRace = useCallback((raceId) => {
    const race = races.find((candidate) => getRaceStableId(candidate) === raceId);
    if (!race) return;
    const nextQuestions = createDefaultQuestionSet(race);

    setQuestionsByRaceId((current) => ({ ...current, [raceId]: nextQuestions }));
    setSavedQuestionsByRaceId((current) => ({
      ...current,
      [raceId]: cloneQuestions(nextQuestions),
    }));
    setDirtyRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
    setSprintCustomizedRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
    updateRaceQuestionMetadata(raceId, nextQuestions, race.sprintWeekend);
  }, [races, updateRaceQuestionMetadata]);

  const updateQuestion = useCallback((raceId, questionId, updates) => {
    setQuestionsByRaceId((current) => {
      if (!current[raceId]) return current;
      const nextQuestions = current[raceId].map((question) => (
        question.id === questionId ? { ...question, ...updates } : question
      ));
      return { ...current, [raceId]: nextQuestions };
    });
    setDirtyRaceIds((current) => new Set(current).add(raceId));
    if (Number(questionId) > 7) {
      setSprintCustomizedRaceIds((current) => new Set(current).add(raceId));
    }
  }, []);

  const enableSprintWeekend = useCallback((raceId = selectedRaceId) => {
    setQuestionsByRaceId((current) => {
      if (!current[raceId]) return current;
      const nextQuestions = syncSprintQuestions(current[raceId], true);
      updateRaceQuestionMetadata(raceId, nextQuestions, true);
      return { ...current, [raceId]: nextQuestions };
    });
    setDirtyRaceIds((current) => new Set(current).add(raceId));
  }, [selectedRaceId, updateRaceQuestionMetadata]);

  const disableSprintWeekend = useCallback((raceId = selectedRaceId) => {
    setQuestionsByRaceId((current) => {
      if (!current[raceId]) return current;
      const nextQuestions = syncSprintQuestions(current[raceId], false);
      updateRaceQuestionMetadata(raceId, nextQuestions, false);
      return { ...current, [raceId]: nextQuestions };
    });
    setDirtyRaceIds((current) => new Set(current).add(raceId));
    setSprintCustomizedRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
  }, [selectedRaceId, updateRaceQuestionMetadata]);

  const saveQuestionDraft = useCallback((raceId) => {
    setQuestionsByRaceId((current) => {
      if (!current[raceId]) return current;
      setSavedQuestionsByRaceId((saved) => ({
        ...saved,
        [raceId]: cloneQuestions(current[raceId]),
      }));
      return current;
    });
    setDirtyRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
  }, []);

  const discardQuestionChanges = useCallback((raceId) => {
    setSavedQuestionsByRaceId((saved) => {
      const savedQuestions = saved[raceId];
      setQuestionsByRaceId((current) => {
        if (!savedQuestions) {
          const next = { ...current };
          delete next[raceId];
          return next;
        }
        return { ...current, [raceId]: cloneQuestions(savedQuestions) };
      });

      const sprintWeekend = Boolean(savedQuestions?.some((question) => question.sprint));
      updateRaceQuestionMetadata(raceId, savedQuestions ?? [], sprintWeekend);
      setSprintCustomizedRaceIds((current) => {
        const next = new Set(current);
        if (hasCustomizedSprintQuestions(savedQuestions)) next.add(raceId);
        else next.delete(raceId);
        return next;
      });
      return saved;
    });

    setDirtyRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
  }, [updateRaceQuestionMetadata]);

  const totalQuestions = questions.length;
  const activeQuestions = questions.filter((question) => question.active).length;
  const maximumPoints = questions.reduce((total, question) => total + question.points, 0);
  const isSprintWeekend = Boolean(selectedRace?.sprintWeekend);

  const sprintWeekend = {
    activeQuestions,
    disableSprintWeekend: () => disableSprintWeekend(selectedRaceId),
    enableSprintWeekend: () => enableSprintWeekend(selectedRaceId),
    isSprintWeekend,
    maximumPoints,
    questions,
    sprintQuestionsEdited: sprintCustomizedRaceIds.has(selectedRaceId),
    totalQuestions,
    updateQuestion: (questionId, updates) => updateQuestion(selectedRaceId, questionId, updates),
  };

  return {
    createQuestionsForRace,
    dirtyRaceIds,
    discardQuestionChanges,
    ensureQuestionsForRace,
    questionsByRaceId,
    races,
    saveQuestionDraft,
    selectedRace,
    selectedRaceId,
    setRaces,
    setSelectedRaceId,
    sprintWeekend,
  };
}
