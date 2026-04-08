/**
 * Servizio centrale per la comunicazione con Supabase
 * Gestisce tutte le operazioni di database in modo centralizzato
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Configurazione Supabase
const SUPABASE_URL = 'https://xjsoqcopalvoskbnarzn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc29xY29wYWx2b3NrYm5hcnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjE2ODAsImV4cCI6MjA5MDYzNzY4MH0.6AhQ5ogFLKRHkfsdMFDD2tB06vcXAf8mINJ3XUdcq_8';

export interface TeamData {
  team_id: string;
  team_name: string;
}

export interface AthleteData {
  id: string;
  full_name: string;
  position: string;
  jersey_number: number;
  goals_scored: number;
  goals_conceded: number;
  assists: number;
  matches_played: number;
  attendance: number;
  fitness: number;
  team_id: string;
}

export interface MatchData {
  id: string;
  date: string;
  opponent: string;
  type: string;
  venue: string;
  goals_for: number;
  goals_against: number;
  notes: string;
  team_id: string;
}

export interface TrainingSessionData {
  id: string;
  date: string;
  session_type: string;
  duration_min: number;
  notes: string;
  team_id: string;
  training_attendances?: Array<{
    athlete_id: string;
    present: boolean;
  }>;
}

export interface DatabaseState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentTeam: TeamData | null;
  athletes: AthleteData[];
  matches: MatchData[];
  trainings: TrainingSessionData[];
}

type StateListener = (state: DatabaseState) => void;
type DataListener<T> = (data: T[]) => void;

class DatabaseServiceClass {
  private client: SupabaseClient;
  private state: DatabaseState;
  private stateListeners: Set<StateListener>;
  private dataListeners: Map<string, Set<DataListener<any>>>;
  private realtimeChannels: Map<string, RealtimeChannel>;
  private sessionRefreshInterval: NodeJS.Timeout | null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.state = {
      isConnected: false,
      isLoading: false,
      error: null,
      currentTeam: null,
      athletes: [],
      matches: [],
      trainings: [],
    };
    this.stateListeners = new Set();
    this.dataListeners = new Map();
    this.realtimeChannels = new Map();
    this.sessionRefreshInterval = null;
  }

  // ==================== GESTIONE STATO ====================

  private setState(partial: Partial<DatabaseState>) {
    this.state = { ...this.state, ...partial };
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    this.stateListeners.forEach(listener => listener(this.state));
  }

  subscribeToState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state); // Chiama immediatamente con lo stato corrente
    return () => this.stateListeners.delete(listener);
  }

  private notifyDataListeners<T>(table: string, data: T[]) {
    const listeners = this.dataListeners.get(table);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // ==================== AUTENTICAZIONE ====================

  async getSession() {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error: any) {
      console.error('Errore nel recuperare la sessione:', error);
      return null;
    }
  }

  async checkConnection(): Promise<boolean> {
    this.setState({ isLoading: true, error: null });
    try {
      const session = await this.getSession();
      if (!session) {
        this.setState({ isConnected: false, isLoading: false });
        return false;
      }
      this.setState({ isConnected: true, isLoading: false });
      return true;
    } catch (error: any) {
      this.setState({ isConnected: false, isLoading: false, error: error.message });
      return false;
    }
  }

  // ==================== OPERAZIONI SQUADRE ====================

  async getCoachTeams(coachId: string): Promise<TeamData[]> {
    try {
      const { data, error } = await this.client.rpc('get_coach_teams', { 
        _coach_id: coachId 
      });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Errore nel recuperare le squadre:', error);
      this.setState({ error: error.message });
      return [];
    }
  }

  // ==================== OPERAZIONI ATLETI ====================

  async getAthletes(teamId: string): Promise<AthleteData[]> {
    try {
      const { data, error } = await this.client
        .from('athletes')
        .select('*')
        .eq('team_id', teamId)
        .order('jersey_number');
      
      if (error) throw error;
      const athletes = data || [];
      this.setState({ athletes });
      this.notifyDataListeners('athletes', athletes);
      return athletes;
    } catch (error: any) {
      console.error('Errore nel recuperare gli atleti:', error);
      this.setState({ error: error.message });
      return [];
    }
  }

  async updateAthlete(id: string, updates: Partial<AthleteData>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('athletes')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Aggiorna lo stato locale
      const updatedAthletes = this.state.athletes.map(a => 
        a.id === id ? { ...a, ...updates } : a
      );
      this.setState({ athletes: updatedAthletes });
      this.notifyDataListeners('athletes', updatedAthletes);
      
      return true;
    } catch (error: any) {
      console.error('Errore nell\'aggiornare l\'atleta:', error);
      this.setState({ error: error.message });
      return false;
    }
  }

  // ==================== OPERAZIONI PARTITE ====================

  async getMatches(teamId: string): Promise<MatchData[]> {
    try {
      const { data, error } = await this.client
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      const matches = data || [];
      this.setState({ matches });
      this.notifyDataListeners('matches', matches);
      return matches;
    } catch (error: any) {
      console.error('Errore nel recuperare le partite:', error);
      this.setState({ error: error.message });
      return [];
    }
  }

  async createMatch(match: Omit<MatchData, 'id'>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('matches')
        .insert([match]);
      
      if (error) throw error;
      
      // Ricarica le partite
      await this.getMatches(match.team_id);
      return true;
    } catch (error: any) {
      console.error('Errore nel creare la partita:', error);
      this.setState({ error: error.message });
      return false;
    }
  }

  async updateMatch(id: string, updates: Partial<MatchData>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('matches')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Aggiorna lo stato locale
      const updatedMatches = this.state.matches.map(m => 
        m.id === id ? { ...m, ...updates } : m
      );
      this.setState({ matches: updatedMatches });
      this.notifyDataListeners('matches', updatedMatches);
      
      return true;
    } catch (error: any) {
      console.error('Errore nell\'aggiornare la partita:', error);
      this.setState({ error: error.message });
      return false;
    }
  }

  // ==================== OPERAZIONI ALLENAMENTI ====================

  async getTrainings(teamId: string): Promise<TrainingSessionData[]> {
    try {
      const { data, error } = await this.client
        .from('training_sessions')
        .select('*, training_attendances(athlete_id,present)')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      const trainings = data || [];
      this.setState({ trainings });
      this.notifyDataListeners('trainings', trainings);
      return trainings;
    } catch (error: any) {
      console.error('Errore nel recuperare gli allenamenti:', error);
      this.setState({ error: error.message });
      return [];
    }
  }

  async createTraining(training: Omit<TrainingSessionData, 'id'>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('training_sessions')
        .insert([training]);
      
      if (error) throw error;
      
      // Ricarica gli allenamenti
      if (training.team_id) {
        await this.getTrainings(training.team_id);
      }
      return true;
    } catch (error: any) {
      console.error('Errore nel creare l\'allenamento:', error);
      this.setState({ error: error.message });
      return false;
    }
  }

  // ==================== CARICAMENTO COMPLETO SQUADRA ====================

  async loadTeamData(teamId: string): Promise<{
    team: TeamData;
    athletes: AthleteData[];
    matches: MatchData[];
    trainings: TrainingSessionData[];
  }> {
    this.setState({ isLoading: true, error: null });
    
    try {
      // Carica tutti i dati in parallelo
      const [athletes, matches, trainings] = await Promise.all([
        this.getAthletes(teamId),
        this.getMatches(teamId),
        this.getTrainings(teamId),
      ]);

      const team = { team_id: teamId, team_name: '' }; // Il nome verrà recuperato separatamente
      
      this.setState({ 
        currentTeam: team, 
        athletes, 
        matches, 
        trainings,
        isLoading: false,
        isConnected: true,
      });

      return { team, athletes, matches, trainings };
    } catch (error: any) {
      this.setState({ isLoading: false, error: error.message });
      throw error;
    }
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================

  subscribeToRealtime(table: string, teamId: string): void {
    // Disconnetti eventuali subscription esistenti per questa tabella
    this.unsubscribeFromRealtime(table);

    const channel = this.client
      .channel(`public:${table}:team_id=eq.${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          console.log(`Cambiamento rilevato in ${table}:`, payload);
          
          // Ricarica i dati della tabella specifica
          switch (table) {
            case 'athletes':
              await this.getAthletes(teamId);
              break;
            case 'matches':
              await this.getMatches(teamId);
              break;
            case 'training_sessions':
              await this.getTrainings(teamId);
              break;
          }
        }
      )
      .subscribe();

    this.realtimeChannels.set(table, channel);
  }

  unsubscribeFromRealtime(table: string): void {
    const channel = this.realtimeChannels.get(table);
    if (channel) {
      this.client.removeChannel(channel);
      this.realtimeChannels.delete(table);
    }
  }

  unsubscribeFromAllRealtime(): void {
    this.realtimeChannels.forEach((channel, table) => {
      this.client.removeChannel(channel);
    });
    this.realtimeChannels.clear();
  }

  // ==================== LISTENER PERSONALIZZATI ====================

  subscribeToData<T>(table: string, listener: DataListener<T>): () => void {
    if (!this.dataListeners.has(table)) {
      this.dataListeners.set(table, new Set());
    }
    this.dataListeners.get(table)!.add(listener);
    
    // Chiama immediatamente con i dati correnti
    const currentData = (this.state as any)[table];
    if (currentData) {
      listener(currentData);
    }
    
    return () => {
      const listeners = this.dataListeners.get(table);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  // ==================== UTILITIES ====================

  getState(): DatabaseState {
    return { ...this.state };
  }

  getCurrentTeam(): TeamData | null {
    return this.state.currentTeam;
  }

  getAthletesList(): AthleteData[] {
    return this.state.athletes;
  }

  getMatchesList(): MatchData[] {
    return this.state.matches;
  }

  getTrainingsList(): TrainingSessionData[] {
    return this.state.trainings;
  }

  // ==================== PULIZIA ====================

  cleanup(): void {
    this.unsubscribeFromAllRealtime();
    this.stateListeners.clear();
    this.dataListeners.clear();
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
    }
  }
}

// Export dell'istanza singleton
export const DatabaseService = new DatabaseServiceClass();
