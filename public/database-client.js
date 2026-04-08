/**
 * Client JavaScript per le app HTML (JARVIS, MATCH, SH2)
 * Include questo file nelle tue app HTML per comunicare con il database
 */

class DatabaseClient {
  constructor(appName) {
    this.appName = appName;
    this.callbackIdCounter = 0;
    this.pendingCallbacks = new Map();
    this.listeners = new Map();

    // Ascolta le risposte dal bridge
    window.addEventListener('message', this.handleMessage.bind(this));

    console.log(`[DBClient] ${appName} inizializzato`);
  }

  // ==================== GESTIONE MESSAGGI ====================

  handleMessage(event) {
    const { type, callbackId, payload } = event.data;

    if (!type) return;

    // Gestione risposte alle richieste
    if (callbackId && this.pendingCallbacks.has(callbackId)) {
      const callback = this.pendingCallbacks.get(callbackId);
      this.pendingCallbacks.delete(callbackId);

      if (payload?.success) {
        callback.resolve(payload.data);
      } else {
        callback.reject(new Error(payload?.error || 'Errore sconosciuto'));
      }
      return;
    }

    // Gestione notifiche push
    if (type === 'DATA_UPDATE') {
      this.notifyListeners('data_update', payload);
      return;
    }

    if (type === 'STATE_CHANGE') {
      this.notifyListeners('state_change', payload);
      return;
    }
  }

  // ==================== SISTEMA DI LISTENER ====================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // ==================== INVIO RICHIESTE ====================

  sendRequest(type, payload) {
    return new Promise((resolve, reject) => {
      const callbackId = `${type}_${++this.callbackIdCounter}`;
      
      this.pendingCallbacks.set(callbackId, { resolve, reject });
      
      // Timeout di sicurezza
      setTimeout(() => {
        if (this.pendingCallbacks.has(callbackId)) {
          this.pendingCallbacks.delete(callbackId);
          reject(new Error('Timeout richiesta'));
        }
      }, 30000);

      // Invia messaggio al parent
      window.parent.postMessage({
        type,
        payload,
        callbackId,
      }, '*');
    });
  }

  // ==================== METODI PUBBLICI ====================

  // Autenticazione
  async checkConnection() {
    return this.sendRequest('CHECK_CONNECTION');
  }

  async getSession() {
    return this.sendRequest('GET_SESSION');
  }

  // Squadre
  async getTeams(coachId) {
    return this.sendRequest('GET_TEAMS', { coachId });
  }

  // Caricamento completo squadra
  async loadTeamData(teamId) {
    return this.sendRequest('LOAD_TEAM_DATA', { teamId });
  }

  // Atleti
  async getAthletes(teamId) {
    return this.sendRequest('GET_ATHLETES', { teamId });
  }

  async updateAthlete(id, updates) {
    return this.sendRequest('UPDATE_ATHLETE', { id, updates });
  }

  // Partite
  async getMatches(teamId) {
    return this.sendRequest('GET_MATCHES', { teamId });
  }

  async createMatch(match) {
    return this.sendRequest('CREATE_MATCH', { match });
  }

  async updateMatch(id, updates) {
    return this.sendRequest('UPDATE_MATCH', { id, updates });
  }

  // Allenamenti
  async getTrainings(teamId) {
    return this.sendRequest('GET_TRAININGS', { teamId });
  }

  async createTraining(training) {
    return this.sendRequest('CREATE_TRAINING', { training });
  }

  // Realtime
  async subscribeRealtime(table, teamId) {
    return this.sendRequest('SUBSCRIBE_REALTIME', { table, teamId });
  }

  async unsubscribeRealtime(table) {
    return this.sendRequest('UNSUBSCRIBE_REALTIME', { table });
  }

  // ==================== UTILITIES ====================

  /**
   * Genera un ID unico per le squadre (compatibile con JARVIS)
   */
  hashUUID(uuid) {
    let h = 0;
    for (let i = 0; i < uuid.length; i++) {
      h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0;
    }
    return Math.abs(h) + 800000;
  }

  /**
   * Salva la squadra selezionata nel localStorage
   */
  saveActiveTeam(teamId) {
    localStorage.setItem('teamStats_lastTeam', teamId);
  }

  /**
   * Recupera la squadra selezionata dal localStorage
   */
  getActiveTeam() {
    return localStorage.getItem('teamStats_lastTeam');
  }
}

// Esporta una funzione factory per creare istanze
window.DatabaseClient = DatabaseClient;
