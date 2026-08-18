import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const statusLabels = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Closed',
  scored: 'Scored',
  published: 'Published',
};

function mapRace(race) {
  const season = Array.isArray(race.seasons) ? race.seasons[0] : race.seasons;
  return {
    id: race.id,
    calendarId: race.id,
    slug: race.slug,
    name: race.race_name,
    circuit: race.circuit_name,
    country: race.country_code,
    round: race.round_number,
    season: season?.year,
    opensAt: race.opens_at,
    closesAt: race.closes_at,
    raceStart: race.race_starts_at,
    status: statusLabels[race.status] ?? race.status,
    databaseStatus: race.status,
    sprintWeekend: false,
  };
}

function mapQuestion(question) {
  return {
    id: question.id,
    number: question.question_number,
    key: question.question_key,
    text: question.question_text,
    type: question.answer_type === 'driver' ? 'Driver' : 'Constructor',
    points: question.points,
    active: question.is_active,
    sprint: false,
  };
}

export default function useAdminResults() {
  const [state, setState] = useState({
    races: [],
    questionsByRaceId: {},
    optionsByQuestionId: {},
    officialAnswersByRaceId: {},
    entryCountByRaceId: {},
    latestRunByRaceId: {},
  });
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: raceRows, error: raceError } = await supabase
        .from('races')
        .select('id, season_id, round_number, slug, race_name, circuit_name, country_code, opens_at, closes_at, race_starts_at, status, seasons(year)')
        .neq('status', 'draft')
        .order('race_starts_at', { ascending: true });
      if (raceError) throw raceError;

      const raceIds = (raceRows ?? []).map((race) => race.id);
      const races = (raceRows ?? []).map(mapRace);

      if (!raceIds.length) {
        setState({ races: [], questionsByRaceId: {}, optionsByQuestionId: {}, officialAnswersByRaceId: {}, entryCountByRaceId: {}, latestRunByRaceId: {} });
        setSelectedRaceId('');
        return;
      }

      const [questionsResult, entriesResult, officialResult, runsResult] = await Promise.all([
        supabase
          .from('race_questions')
          .select('id, race_id, question_number, question_key, question_text, answer_type, points, is_active')
          .in('race_id', raceIds)
          .eq('is_active', true)
          .order('question_number', { ascending: true }),
        supabase.from('prediction_entries').select('id, race_id').in('race_id', raceIds),
        supabase.from('official_answers').select('question_id, answer_value'),
        supabase
          .from('scoring_runs')
          .select('id, race_id, version, scored_entry_count, completed_at')
          .in('race_id', raceIds)
          .order('version', { ascending: false }),
      ]);

      if (questionsResult.error) throw questionsResult.error;
      if (entriesResult.error) throw entriesResult.error;
      if (officialResult.error) throw officialResult.error;
      if (runsResult.error) throw runsResult.error;

      const questionRows = questionsResult.data ?? [];
      const questionIds = questionRows.map((question) => question.id);
      const optionsResult = questionIds.length
        ? await supabase
            .from('race_question_options')
            .select('question_id, option_value, option_label, option_type, sort_order')
            .in('question_id', questionIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
        : { data: [], error: null };
      if (optionsResult.error) throw optionsResult.error;

      const questionsByRaceId = Object.fromEntries(raceIds.map((raceId) => [raceId, []]));
      const questionRaceId = new Map();
      questionRows.forEach((question) => {
        questionsByRaceId[question.race_id].push(mapQuestion(question));
        questionRaceId.set(question.id, question.race_id);
      });

      const optionsByQuestionId = {};
      (optionsResult.data ?? []).forEach((option) => {
        if (!optionsByQuestionId[option.question_id]) optionsByQuestionId[option.question_id] = [];
        optionsByQuestionId[option.question_id].push({
          answerId: option.option_value,
          name: option.option_label,
          value: option.option_value,
          type: option.option_type,
        });
      });

      const officialAnswersByRaceId = Object.fromEntries(raceIds.map((raceId) => [raceId, {}]));
      (officialResult.data ?? []).forEach((answer) => {
        const raceId = questionRaceId.get(answer.question_id);
        if (raceId) officialAnswersByRaceId[raceId][answer.question_id] = answer.answer_value;
      });

      const entryCountByRaceId = Object.fromEntries(raceIds.map((raceId) => [raceId, 0]));
      (entriesResult.data ?? []).forEach((entry) => {
        entryCountByRaceId[entry.race_id] = (entryCountByRaceId[entry.race_id] ?? 0) + 1;
      });

      const latestRunByRaceId = {};
      (runsResult.data ?? []).forEach((run) => {
        if (!latestRunByRaceId[run.race_id]) latestRunByRaceId[run.race_id] = run;
      });

      setState({ races, questionsByRaceId, optionsByQuestionId, officialAnswersByRaceId, entryCountByRaceId, latestRunByRaceId });
      setSelectedRaceId((current) => {
        if (current && raceIds.includes(current)) return current;
        return races.find((race) => ['locked', 'scored'].includes(race.databaseStatus))?.id
          ?? races.find((race) => race.databaseStatus === 'open')?.id
          ?? races[0]?.id
          ?? '';
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the results workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedRace = useMemo(
    () => state.races.find((race) => race.id === selectedRaceId) ?? null,
    [selectedRaceId, state.races]
  );

  const scoreRace = useCallback(async (answers) => {
    const questions = state.questionsByRaceId[selectedRaceId] ?? [];
    const payload = Object.fromEntries(questions.map((question) => [question.key, answers[question.id]]));

    const { error: answerError } = await supabase.rpc('set_official_answers', {
      p_race_id: selectedRaceId,
      p_answers: payload,
    });
    if (answerError) throw answerError;

    const { data, error: scoringError } = await supabase.rpc('score_race', {
      p_race_id: selectedRaceId,
      p_notes: null,
    });
    if (scoringError) throw scoringError;

    await refresh();
    return data;
  }, [refresh, selectedRaceId, state.questionsByRaceId]);

  const publishRace = useCallback(async () => {
    const { data, error: publishError } = await supabase.rpc('publish_race_results', {
      p_race_id: selectedRaceId,
    });
    if (publishError) throw publishError;
    await refresh();
    return data;
  }, [refresh, selectedRaceId]);

  return {
    ...state,
    error,
    loading,
    publishRace,
    refresh,
    scoreRace,
    selectedRace,
    selectedRaceId,
    setSelectedRaceId,
  };
}
