/**
 * Hook React per utilizzare il DatabaseService
 * Fornisce accesso reattivo ai dati del database
 */

import { useState, useEffect, useCallback } from 'react';
import { DatabaseService, DatabaseState, AthleteData, MatchData, TrainingSessionData } from '../services/DatabaseService';

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>(DatabaseService.getState());

  // Sottoscrizione allo stato del database
  useEffect(() => {
    const unsubscribe = DatabaseService.subscribeToState(setState);
    return () => unsubscribe();
  }, []);

  // Funzioni esposte dall'hook
  const loadTeamData = useCallback(async (teamId: string) => {
    return await DatabaseService.loadTeamData(teamId);
  }, []);

  const getAthletes = useCallback(async (teamId: string) => {
    return await DatabaseService.getAthletes(teamId);
  }, []);

  const getMatches = useCallback(async (teamId: string) => {
    return await DatabaseService.getMatches(teamId);
  }, []);

  const getTrainings = useCallback(async (teamId: string) => {
    return await DatabaseService.getTrainings(teamId);
  }, []);

  const updateAthlete = useCallback(async (id: string, updates: Partial<AthleteData>) => {
    return await DatabaseService.updateAthlete(id, updates);
  }, []);

  const createMatch = useCallback(async (match: Omit<MatchData, 'id'>) => {
    return await DatabaseService.createMatch(match);
  }, []);

  const updateMatch = useCallback(async (id: string, updates: Partial<MatchData>) => {
    return await DatabaseService.updateMatch(id, updates);
  }, []);

  const createTraining = useCallback(async (training: Omit<TrainingSessionData, 'id'>) => {
    return await DatabaseService.createTraining(training);
  }, []);

  const subscribeToRealtime = useCallback((table: string, teamId: string) => {
    DatabaseService.subscribeToRealtime(table, teamId);
  }, []);

  const unsubscribeFromRealtime = useCallback((table: string) => {
    DatabaseService.unsubscribeFromRealtime(table);
  }, []);

  return {
    // Stato
    ...state,
    
    // Metodi
    loadTeamData,
    getAthletes,
    getMatches,
    getTrainings,
    updateAthlete,
    createMatch,
    updateMatch,
    createTraining,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    
    // Utility
    getCurrentTeam: () => DatabaseService.getCurrentTeam(),
    getAthletesList: () => DatabaseService.getAthletesList(),
    getMatchesList: () => DatabaseService.getMatchesList(),
    getTrainingsList: () => DatabaseService.getTrainingsList(),
  };
}

// Hook specializzati per tabelle specifiche

export function useAthletes(teamId: string | null) {
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setAthletes([]);
      return;
    }

    setLoading(true);
    
    const loadData = async () => {
      const data = await DatabaseService.getAthletes(teamId);
      setAthletes(data);
      setLoading(false);
    };

    loadData();

    // Sottoscrizione agli aggiornamenti
    const unsubscribe = DatabaseService.subscribeToData<AthleteData>('athletes', setAthletes);
    
    // Attiva realtime per questa tabella
    DatabaseService.subscribeToRealtime('athletes', teamId);

    return () => {
      unsubscribe();
      DatabaseService.unsubscribeFromRealtime('athletes');
    };
  }, [teamId]);

  return { athletes, loading };
}

export function useMatches(teamId: string | null) {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setMatches([]);
      return;
    }

    setLoading(true);
    
    const loadData = async () => {
      const data = await DatabaseService.getMatches(teamId);
      setMatches(data);
      setLoading(false);
    };

    loadData();

    const unsubscribe = DatabaseService.subscribeToData<MatchData>('matches', setMatches);
    DatabaseService.subscribeToRealtime('matches', teamId);

    return () => {
      unsubscribe();
      DatabaseService.unsubscribeFromRealtime('matches');
    };
  }, [teamId]);

  return { matches, loading };
}

export function useTrainings(teamId: string | null) {
  const [trainings, setTrainings] = useState<TrainingSessionData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setTrainings([]);
      return;
    }

    setLoading(true);
    
    const loadData = async () => {
      const data = await DatabaseService.getTrainings(teamId);
      setTrainings(data);
      setLoading(false);
    };

    loadData();

    const unsubscribe = DatabaseService.subscribeToData<TrainingSessionData>('trainings', setTrainings);
    DatabaseService.subscribeToRealtime('trainings', teamId);

    return () => {
      unsubscribe();
      DatabaseService.unsubscribeFromRealtime('trainings');
    };
  }, [teamId]);

  return { trainings, loading };
}
