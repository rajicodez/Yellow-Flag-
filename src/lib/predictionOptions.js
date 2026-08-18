import { driversData } from '../data/drivers';
import { f1Teams2026 } from '../data/teams';

export const getDriverPredictionValue = driver => `driver:${driver.imgId}`;
export const getConstructorPredictionValue = team => `constructor:${team.id}`;

export function findDriverByPredictionValue(value) {
  return driversData.find(driver => getDriverPredictionValue(driver) === value) ?? null;
}

export function findConstructorByPredictionValue(value) {
  return f1Teams2026.find(team => getConstructorPredictionValue(team) === value) ?? null;
}

export function normalizePredictionAnswer(questionType, value) {
  if (typeof value !== 'string') return null;

  if (questionType === 'driver') {
    const driver = findDriverByPredictionValue(value)
      ?? driversData.find(candidate => candidate.name === value);
    return driver ? getDriverPredictionValue(driver) : null;
  }

  if (questionType === 'team') {
    const team = findConstructorByPredictionValue(value)
      ?? f1Teams2026.find(candidate => candidate.name === value);
    return team ? getConstructorPredictionValue(team) : null;
  }

  return null;
}
