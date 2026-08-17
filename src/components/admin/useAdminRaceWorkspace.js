import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { defaultGrandPrixQuestions } from './data';
import { getAdminRosterForSeason } from './rosters';

const statusLabels = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Closed',
  scored: 'Scored',
  published: 'Published',
};

const databaseStatuses = {
  Draft: 'draft',
  Open: 'open',
  Closed: 'locked',
};

const countryNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const countryCodesByName = {
  Australia: 'AU',
  Austria: 'AT',
  Azerbaijan: 'AZ',
  Bahrain: 'BH',
  Belgium: 'BE',
  Brazil: 'BR',
  Canada: 'CA',
  China: 'CN',
  Hungary: 'HU',
  Italy: 'IT',
  Japan: 'JP',
  Mexico: 'MX',
  Monaco: 'MC',
  Netherlands: 'NL',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  Singapore: 'SG',
  Spain: 'ES',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
};

const displayDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Colombo',
    }).format(new Date(value))
  : 'Not set';

const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Colombo',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

const fromSriLankaInput = (value) => value ? new Date(`${value}:00+05:30`).toISOString() : null;
const cloneQuestions = (questions) => questions.map((question) => ({ ...question }));

export function getRaceStableId(race) {
  return race ? String(race.id) : '';
}

export function createDefaultQuestionSet() {
  return cloneQuestions(defaultGrandPrixQuestions).map((question, index) => ({
    ...question,
    questionNumber: index + 1,
    active: true,
  }));
}

function mapRace(row, questionCount) {
  const season = row.seasons?.year ?? new Date(row.race_starts_at).getFullYear();
  const countryCode = String(row.country_code ?? '').toUpperCase();
  const country = countryNames?.of(countryCode) ?? countryCode;

  return {
    id: row.id,
    name: row.race_name,
    slug: row.slug,
    circuit: row.circuit_name,
    country,
    countryCode,
    round: row.round_number,
    season,
    seasonName: row.seasons?.name ?? `${season} Formula 1 World Championship`,
    raceStart: row.race_starts_at,
    predictionOpens: toLocalDateTimeInput(row.opens_at),
    predictionCloses: toLocalDateTimeInput(row.closes_at),
    opensAt: displayDateTime(row.opens_at),
    closesAt: displayDateTime(row.closes_at),
    status: statusLabels[row.status] ?? row.status,
    databaseStatus: row.status,
    sprintWeekend: false,
    isDemo: Boolean(row.is_demo),
    questions: questionCount,
  };
}

function mapQuestion(row) {
  return {
    id: row.id,
    questionNumber: row.question_number,
    key: row.question_key,
    text: row.question_text,
    type: row.answer_type === 'constructor' ? 'Constructor' : 'Driver',
    points: row.points,
    active: row.is_active,
  };
}

export default function useAdminRaceWorkspace() {
  const [races, setRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [questionsByRaceId, setQuestionsByRaceId] = useState({});
  const [savedQuestionsByRaceId, setSavedQuestionsByRaceId] = useState({});
  const [dirtyRaceIds, setDirtyRaceIds] = useState(() => new Set());
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');

  const loadWorkspace = useCallback(async () => {
    if (!supabase) {
      setWorkspaceError('Supabase is not configured.');
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    setWorkspaceError('');

    try {
      const [{ data: raceRows, error: raceError }, { data: questionRows, error: questionError }] = await Promise.all([
        supabase
          .from('races')
          .select('id, round_number, slug, race_name, circuit_name, country_code, opens_at, closes_at, race_starts_at, status, is_demo, seasons(year, name)')
          .order('race_starts_at', { ascending: false }),
        supabase
          .from('race_questions')
          .select('id, race_id, question_number, question_key, question_text, answer_type, points, is_active')
          .order('question_number', { ascending: true }),
      ]);

      if (raceError) throw raceError;
      if (questionError) throw questionError;

      const nextQuestionsByRaceId = {};
      for (const row of questionRows ?? []) {
        const raceId = String(row.race_id);
        if (!nextQuestionsByRaceId[raceId]) nextQuestionsByRaceId[raceId] = [];
        nextQuestionsByRaceId[raceId].push(mapQuestion(row));
      }

      const nextRaces = (raceRows ?? []).map((row) => (
        mapRace(row, nextQuestionsByRaceId[String(row.id)]?.length ?? 0)
      ));

      setRaces(nextRaces);
      setQuestionsByRaceId(nextQuestionsByRaceId);
      setSavedQuestionsByRaceId(Object.fromEntries(
        Object.entries(nextQuestionsByRaceId).map(([raceId, questions]) => [raceId, cloneQuestions(questions)])
      ));
      setDirtyRaceIds(new Set());
      setSelectedRaceId((current) => {
        if (nextRaces.some((race) => getRaceStableId(race) === current)) return current;
        const preferred = nextRaces.find((race) => race.status === 'Open') ?? nextRaces[0];
        return getRaceStableId(preferred);
      });
    } catch (error) {
      setWorkspaceError(error.message || 'Unable to load race administration data.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const selectedRace = races.find((race) => getRaceStableId(race) === selectedRaceId) ?? null;
  const questions = questionsByRaceId[selectedRaceId] ?? [];

  const saveRace = useCallback(async (race, isEditing) => {
    const status = databaseStatuses[race.status];
    if (!status) throw new Error('Scored and published races are managed from Results & Scoring.');

    const countryCode = race.countryCode || countryCodesByName[race.country];
    if (!countryCode) throw new Error(`Country code is not configured for ${race.country}.`);

    const { data, error } = await supabase.rpc('admin_upsert_race', {
      p_race_id: isEditing ? race.id : null,
      p_season_year: race.season,
      p_season_name: race.seasonName || `${race.season} Formula 1 World Championship`,
      p_round_number: race.round,
      p_slug: race.slug.startsWith(`${race.season}-`) ? race.slug : `${race.season}-${race.slug}`,
      p_race_name: race.name,
      p_circuit_name: race.circuit,
      p_country_code: countryCode,
      p_opens_at: fromSriLankaInput(race.predictionOpens),
      p_closes_at: fromSriLankaInput(race.predictionCloses),
      p_race_starts_at: race.raceStart,
      p_status: status,
    });

    if (error) throw error;
    await loadWorkspace();
    return data;
  }, [loadWorkspace]);

  const createQuestionsForRace = useCallback((raceId) => {
    const nextQuestions = createDefaultQuestionSet();
    setQuestionsByRaceId((current) => ({ ...current, [raceId]: nextQuestions }));
    setDirtyRaceIds((current) => new Set(current).add(raceId));
  }, []);

  const createDemoRace = useCallback(async ({ name, opensAt, closesAt }) => {
    const roster = getAdminRosterForSeason(2026);
    const questions = createDefaultQuestionSet();
    const payload = questions.map((question, index) => {
      const isConstructor = question.type === 'Constructor';
      const options = (isConstructor ? roster.constructors : roster.drivers).map((option, optionIndex) => ({
        option_value: isConstructor ? option.fullName : option.name,
        option_label: isConstructor ? option.fullName : option.name,
        sort_order: optionIndex + 1,
        is_active: true,
      }));
      return {
        question_number: index + 1,
        question_key: question.key,
        question_text: question.text,
        answer_type: isConstructor ? 'constructor' : 'driver',
        is_active: true,
        options,
      };
    });

    const { data, error } = await supabase.rpc('admin_create_demo_race', {
      p_race_name: name,
      p_opens_at: fromSriLankaInput(opensAt),
      p_closes_at: fromSriLankaInput(closesAt),
      p_questions: payload,
    });
    if (error) throw error;
    await loadWorkspace();
    setSelectedRaceId(String(data.race_id));
    return data;
  }, [loadWorkspace]);

  const updateQuestion = useCallback((raceId, questionId, updates) => {
    setQuestionsByRaceId((current) => ({
      ...current,
      [raceId]: (current[raceId] ?? []).map((question) => (
        question.id === questionId ? { ...question, ...updates } : question
      )),
    }));
    setDirtyRaceIds((current) => new Set(current).add(raceId));
  }, []);

  const saveQuestionDraft = useCallback(async (raceId) => {
    const race = races.find((candidate) => getRaceStableId(candidate) === raceId);
    const questionSet = questionsByRaceId[raceId] ?? [];
    if (!race) throw new Error('Select a race before saving questions.');

    const roster = getAdminRosterForSeason(race.season);
    if (!roster.drivers.length || !roster.constructors.length) {
      throw new Error(`No prediction roster is configured for ${race.season}.`);
    }

    const payload = questionSet.map((question, index) => {
      const isConstructor = question.type === 'Constructor';
      const options = (isConstructor ? roster.constructors : roster.drivers).map((option, optionIndex) => ({
        option_value: isConstructor ? option.fullName : option.name,
        option_label: isConstructor ? option.fullName : option.name,
        sort_order: optionIndex + 1,
        is_active: true,
      }));

      return {
        question_number: question.questionNumber ?? index + 1,
        question_key: question.key,
        question_text: question.text,
        answer_type: isConstructor ? 'constructor' : 'driver',
        is_active: question.active !== false,
        options,
      };
    });

    const { error } = await supabase.rpc('admin_save_race_questions', {
      p_race_id: race.id,
      p_questions: payload,
    });
    if (error) throw error;
    await loadWorkspace();
  }, [loadWorkspace, questionsByRaceId, races]);

  const discardQuestionChanges = useCallback((raceId) => {
    setQuestionsByRaceId((current) => ({
      ...current,
      [raceId]: cloneQuestions(savedQuestionsByRaceId[raceId] ?? []),
    }));
    setDirtyRaceIds((current) => {
      const next = new Set(current);
      next.delete(raceId);
      return next;
    });
  }, [savedQuestionsByRaceId]);

  const totalQuestions = questions.length;
  const activeQuestions = questions.filter((question) => question.active).length;
  const maximumPoints = questions.reduce((total, question) => total + question.points, 0);

  return {
    createDemoRace,
    createQuestionsForRace,
    dirtyRaceIds,
    discardQuestionChanges,
    ensureQuestionsForRace: () => {},
    loadWorkspace,
    questionsByRaceId,
    races,
    saveQuestionDraft,
    saveRace,
    selectedRace,
    selectedRaceId,
    setRaces,
    setSelectedRaceId,
    sprintWeekend: {
      activeQuestions,
      disableSprintWeekend: () => {},
      enableSprintWeekend: () => {},
      isSprintWeekend: false,
      maximumPoints,
      questions,
      sprintQuestionsEdited: false,
      totalQuestions,
      updateQuestion: (questionId, updates) => updateQuestion(selectedRaceId, questionId, updates),
    },
    workspaceError,
    workspaceLoading,
  };
}
