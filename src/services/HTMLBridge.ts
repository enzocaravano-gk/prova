/**
 * Bridge per comunicare con le app HTML esterne (JARVIS, MATCH, SH2)
 * Permette alle app HTML di usare il DatabaseService centralizzato
 */

import { DatabaseService } from '../services/DatabaseService';

interface BridgeMessage {
  type: string;
  payload?: any;
  callbackId?: string;
}

class HTMLBridgeClass {
  private iframeWindows: Map<string, Window | null>;
  private pendingCallbacks: Map<string, { resolve: Function; reject: Function }>;

  constructor() {
    this.iframeWindows = new Map();
    this.pendingCallbacks = new Map();
    
    // Ascolta i messaggi dalle app HTML
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  // ==================== REGISTRAZIONE IFRAME ====================

  registerIframe(appName: string, iframeElement: HTMLIFrameElement) {
    this.iframeWindows.set(appName, iframeElement.contentWindow);
    console.log(`[Bridge] ${appName} registrato`);
  }

  unregisterIframe(appName: string) {
    this.iframeWindows.delete(appName);
    console.log(`[Bridge] ${appName} rimosso`);
  }

  // ==================== INVIO MESSAGGI ====================

  sendToApp(appName: string, message: BridgeMessage) {
    const targetWindow = this.iframeWindows.get(appName);
    if (targetWindow) {
      targetWindow.postMessage(message, '*');
    } else {
      console.warn(`[Bridge] App ${appName} non trovata`);
    }
  }

  broadcast(message: BridgeMessage) {
    this.iframeWindows.forEach((window, appName) => {
      if (window) {
        window.postMessage(message, '*');
      }
    });
  }

  // ==================== GESTIONE RICHIESTE DALLE APP HTML ====================

  private async handleMessage(event: MessageEvent<BridgeMessage>) {
    const { type, payload, callbackId } = event.data;
    
    if (!type) return;

    console.log(`[Bridge] Ricevuto: ${type}`, payload);

    try {
      let result: any;

      switch (type) {
        // === AUTENTICAZIONE ===
        case 'CHECK_CONNECTION':
          result = await DatabaseService.checkConnection();
          break;

        case 'GET_SESSION':
          result = await DatabaseService.getSession();
          break;

        // === SQUADRE ===
        case 'GET_TEAMS':
          if (!payload?.coachId) {
            throw new Error('coachId richiesto');
          }
          result = await DatabaseService.getCoachTeams(payload.coachId);
          break;

        // === ATLETI ===
        case 'GET_ATHLETES':
          if (!payload?.teamId) {
            throw new Error('teamId richiesto');
          }
          result = await DatabaseService.getAthletes(payload.teamId);
          break;

        case 'UPDATE_ATHLETE':
          if (!payload?.id || !payload?.updates) {
            throw new Error('id e updates richiesti');
          }
          result = await DatabaseService.updateAthlete(payload.id, payload.updates);
          break;

        // === PARTITE ===
        case 'GET_MATCHES':
          if (!payload?.teamId) {
            throw new Error('teamId richiesto');
          }
          result = await DatabaseService.getMatches(payload.teamId);
          break;

        case 'CREATE_MATCH':
          if (!payload?.match) {
            throw new Error('match richiesto');
          }
          result = await DatabaseService.createMatch(payload.match);
          break;

        case 'UPDATE_MATCH':
          if (!payload?.id || !payload?.updates) {
            throw new Error('id e updates richiesti');
          }
          result = await DatabaseService.updateMatch(payload.id, payload.updates);
          break;

        // === ALLENAMENTI ===
        case 'GET_TRAININGS':
          if (!payload?.teamId) {
            throw new Error('teamId richiesto');
          }
          result = await DatabaseService.getTrainings(payload.teamId);
          break;

        case 'CREATE_TRAINING':
          if (!payload?.training) {
            throw new Error('training richiesto');
          }
          result = await DatabaseService.createTraining(payload.training);
          break;

        // === CARICAMENTO COMPLETO ===
        case 'LOAD_TEAM_DATA':
          if (!payload?.teamId) {
            throw new Error('teamId richiesto');
          }
          result = await DatabaseService.loadTeamData(payload.teamId);
          break;

        // === REALTIME ===
        case 'SUBSCRIBE_REALTIME':
          if (!payload?.table || !payload?.teamId) {
            throw new Error('table e teamId richiesti');
          }
          DatabaseService.subscribeToRealtime(payload.table, payload.teamId);
          result = true;
          break;

        case 'UNSUBSCRIBE_REALTIME':
          if (!payload?.table) {
            throw new Error('table richiesto');
          }
          DatabaseService.unsubscribeFromRealtime(payload.table);
          result = true;
          break;

        default:
          console.warn(`[Bridge] Tipo messaggio sconosciuto: ${type}`);
          result = null;
      }

      // Invia risposta se c'è un callbackId
      if (callbackId) {
        this.sendBack(event.source as Window, {
          type: `${type}_RESPONSE`,
          callbackId,
          payload: { success: true, data: result },
        });
      }
    } catch (error: any) {
      console.error(`[Bridge] Errore elaborazione ${type}:`, error);
      
      if (callbackId) {
        this.sendBack(event.source as Window, {
          type: `${type}_RESPONSE`,
          callbackId,
          payload: { success: false, error: error.message },
        });
      }
    }
  }

  private sendBack(targetWindow: Window, message: BridgeMessage) {
    targetWindow.postMessage(message, '*');
  }

  // ==================== NOTIFICHE PROATTIVE ALLE APP ====================

  notifyDataUpdate(table: string, data: any[]) {
    this.broadcast({
      type: 'DATA_UPDATE',
      payload: { table, data },
    });
  }

  notifyStateChange(state: any) {
    this.broadcast({
      type: 'STATE_CHANGE',
      payload: state,
    });
  }

  // ==================== PULIZIA ====================

  cleanup() {
    this.iframeWindows.clear();
    this.pendingCallbacks.clear();
  }
}

// Export dell'istanza singleton
export const HTMLBridge = new HTMLBridgeClass();
