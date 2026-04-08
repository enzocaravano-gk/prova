# 📚 Guida all'Uso - Nuovo Sistema Database

## Panoramica

Ho ristrutturato completamente il tuo sistema per migliorare la comunicazione con il database Supabase. Ecco cosa è stato creato:

## 🗂️ Struttura dei Nuovi File

### 1. **Backend (React/TypeScript)**

#### `/src/services/DatabaseService.ts`
Il **cuore del sistema**. Un servizio centralizzato che gestisce tutte le operazioni di database:
- ✅ Connessione a Supabase
- ✅ Operazioni CRUD per atleti, partite e allenamenti
- ✅ Sottoscrizioni realtime (aggiornamenti automatici)
- ✅ Gestione dello stato condiviso

#### `/src/hooks/useDatabase.ts`
Hook React per utilizzare facilmente il DatabaseService nei tuoi componenti:
- `useDatabase()` - Hook principale
- `useAthletes(teamId)` - Hook specializzato per atleti
- `useMatches(teamId)` - Hook specializzato per partite
- `useTrainings(teamId)` - Hook specializzato per allenamenti

#### `/src/services/HTMLBridge.ts`
Ponte di comunicazione tra l'app React e le app HTML esterne (JARVIS, MATCH, SH2):
- Riceve richieste dalle app HTML
- Le inoltra al DatabaseService
- Invia risposte e notifiche push

### 2. **Frontend (App HTML)**

#### `/public/database-client.js`
Libreria JavaScript da includere nelle tue app HTML per comunicare con il database:
```html
<script src="/database-client.js"></script>
```

---

## 🚀 Come Usare il Nuovo Sistema

### Per le App HTML (JARVIS, MATCH, SH2)

#### Passo 1: Includi il Client
Aggiungi questo script nel `<head>` delle tue app HTML:
```html
<script src="/database-client.js"></script>
```

#### Passo 2: Inizializza il Client
Nel tuo codice JavaScript:
```javascript
// Crea un'istanza del client
const db = new DatabaseClient('JARVIS'); // o 'MATCH', 'SH2'

// Esempio di utilizzo
async function init() {
  // Verifica la connessione
  const connected = await db.checkConnection();
  
  if (connected) {
    // Ottieni la sessione
    const session = await db.getSession();
    const coachId = session.user.id;
    
    // Carica le squadre
    const teams = await db.getTeams(coachId);
    
    // Carica i dati della squadra
    const teamData = await db.loadTeamData(teams[0].team_id);
    
    console.log('Atleti:', teamData.athletes);
    console.log('Partite:', teamData.matches);
    console.log('Allenamenti:', teamData.trainings);
  }
}
```

#### Passo 3: Usa le Funzionalità Realtime
```javascript
// Iscriviti agli aggiornamenti in tempo reale
await db.subscribeRealtime('athletes', teamId);
await db.subscribeRealtime('matches', teamId);
await db.subscribeRealtime('training_sessions', teamId);

// Ascolta gli aggiornamenti
db.on('data_update', (payload) => {
  console.log(`Dati aggiornati: ${payload.table}`, payload.data);
  // Aggiorna la tua UI qui
});
```

---

### Per l'App React

#### Passo 1: Importa gli Hook
```typescript
import { useDatabase, useAthletes, useMatches, useTrainings } from '@/hooks/useDatabase';
```

#### Passo 2: Usa negli Componenti
```tsx
function MyComponent() {
  const { athletes, loading } = useAthletes(teamId);
  const { matches } = useMatches(teamId);
  const { trainings } = useTrainings(teamId);

  if (loading) return <div>Caricamento...</div>;

  return (
    <div>
      <h2>Atleti ({athletes.length})</h2>
      {athletes.map(a => (
        <div key={a.id}>{a.full_name}</div>
      ))}
    </div>
  );
}
```

#### Passo 3: Oppure Usa l'Hook Completo
```tsx
function Dashboard() {
  const db = useDatabase();
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      db.loadTeamData(teamId);
    }
  }, [teamId]);

  return (
    <div>
      {db.isLoading && <p>Caricamento...</p>}
      {db.error && <p>Errore: {db.error}</p>}
      {db.athletes.length > 0 && (
        <p>{db.athletes.length} atleti caricati</p>
      )}
    </div>
  );
}
```

---

## 📋 Metodi Disponibili

### DatabaseClient (per app HTML)

| Metodo | Descrizione | Parametri | Ritorno |
|--------|-------------|-----------|---------|
| `checkConnection()` | Verifica se sei connesso | - | `Promise<boolean>` |
| `getSession()` | Ottieni la sessione utente | - | `Promise<Session>` |
| `getTeams(coachId)` | Ottieni le squadre di un coach | `coachId: string` | `Promise<Team[]>` |
| `loadTeamData(teamId)` | Carica tutti i dati di una squadra | `teamId: string` | `Promise<TeamData>` |
| `getAthletes(teamId)` | Ottieni gli atleti | `teamId: string` | `Promise<Athlete[]>` |
| `updateAthlete(id, updates)` | Aggiorna un atleta | `id: string, updates: object` | `Promise<boolean>` |
| `getMatches(teamId)` | Ottieni le partite | `teamId: string` | `Promise<Match[]>` |
| `createMatch(match)` | Crea una partita | `match: object` | `Promise<boolean>` |
| `updateMatch(id, updates)` | Aggiorna una partita | `id: string, updates: object` | `Promise<boolean>` |
| `getTrainings(teamId)` | Ottieni gli allenamenti | `teamId: string` | `Promise<Training[]>` |
| `createTraining(training)` | Crea un allenamento | `training: object` | `Promise<boolean>` |
| `subscribeRealtime(table, teamId)` | Iscriviti agli aggiornamenti | `table: string, teamId: string` | `Promise<boolean>` |
| `unsubscribeRealtime(table)` | Annulla sottoscrizione | `table: string` | `Promise<boolean>` |
| `on(event, callback)` | Ascolta eventi | `event: string, callback: Function` | `Function` (unsubscribe) |

---

## 🔄 Esempio Completo per JARVIS.html

Sostituisci la sezione Supabase nel tuo JARVIS.html con:

```html
<!-- Sostituisci i vecchi script con questi -->
<script src="/database-client.js"></script>
<script>
// ═══════════════════════════════════════════════════
// NUOVO SISTEMA DATABASE
// ═══════════════════════════════════════════════════

// Inizializza il client
const db = new DatabaseClient('JARVIS');

// Stato globale (semplificato)
const state = {
  ready: false,
  session: null,
  coachId: null,
  teamId: null,
  teamName: '',
  allTeams: [],
  athletes: [],
  matches: [],
  trainings: [],
  pendingSave: null
};

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
async function init() {
  setStatus('', 'Connessione...');
  
  try {
    // Verifica connessione
    const connected = await db.checkConnection();
    if (!connected) {
      setStatus('', 'Non autenticato');
      addMsg('jarvis', 'Non sei autenticato. Accedi prima dall\\'app principale.');
      return;
    }

    // Ottieni sessione
    const session = await db.getSession();
    state.session = session;
    state.coachId = session.user.id;

    // Carica squadre
    const teams = await db.getTeams(state.coachId);
    if (!teams || !teams.length) {
      addMsg('jarvis', 'Nessuna squadra trovata. Crea prima una squadra dalla dashboard.');
      return;
    }
    state.allTeams = teams;

    // Seleziona squadra attiva
    const lastHash = localStorage.getItem('teamStats_lastTeam');
    const active = (lastHash && teams.find(t => String(db.hashUUID(t.team_id)) === String(lastHash))) || teams[0];
    
    await loadTeam(active);

    // Iscriviti agli aggiornamenti realtime
    await db.subscribeRealtime('athletes', state.teamId);
    await db.subscribeRealtime('matches', state.teamId);
    await db.subscribeRealtime('training_sessions', state.teamId);

    // Ascolta aggiornamenti
    db.on('data_update', (payload) => {
      console.log('Aggiornamento ricevuto:', payload.table);
      // Ricarica i dati specifici
      refreshData(payload.table);
    });

  } catch(err) {
    setStatus('', 'Errore connessione');
    addMsg('jarvis', 'Errore di connessione. Ricarica la pagina.');
    console.error(err);
  }
}

async function loadTeam(teamRow) {
  setStatus('think', 'Carico dati...');
  
  state.teamId = teamRow.team_id;
  state.teamName = teamRow.team_name;
  document.getElementById('squadName').textContent = teamRow.team_name;

  // Carica tutti i dati in una volta
  const data = await db.loadTeamData(teamRow.team_id);
  
  state.athletes = data.athletes || [];
  state.matches = data.matches || [];
  state.trainings = data.trainings || [];
  state.ready = true;

  // Aggiorna contesto UI
  updateContextUI();
  
  setStatus('ready', 'Pronto');
  addMsg('jarvis', buildWelcome());
  showSuggestions();
}

function updateContextUI() {
  document.getElementById('ctxAtleti').textContent = state.athletes.length;
  document.getElementById('ctxPartite').textContent = state.matches.length;
  document.getElementById('ctxAllenamenti').textContent = state.trainings.length;
  
  if (state.trainings.length > 0) {
    const last = new Date(state.trainings[0].date);
    document.getElementById('ctxLastDate').textContent = last.toLocaleDateString('it-IT', { day:'2-digit', month:'short' });
    document.getElementById('ctxLastTrain').style.display = 'flex';
  }
  document.getElementById('ctxBar').style.display = 'flex';
}

async function refreshData(table) {
  if (!state.teamId) return;
  
  try {
    if (table === 'athletes') {
      state.athletes = await db.getAthletes(state.teamId);
    } else if (table === 'matches') {
      state.matches = await db.getMatches(state.teamId);
    } else if (table === 'training_sessions') {
      state.trainings = await db.getTrainings(state.teamId);
    }
    updateContextUI();
  } catch (err) {
    console.error('Errore aggiornamento:', err);
  }
}

// Avvia l'inizializzazione
init();
</script>
```

---

## 🎯 Vantaggi del Nuovo Sistema

1. **Codice Centralizzato**: Tutte le operazioni DB sono in un unico posto
2. **Meno Duplicazione**: Le app HTML condividono la stessa logica
3. **Realtime Automatico**: I dati si aggiornano da soli quando cambiano nel DB
4. **Più Reattivo**: Cache locale e aggiornamenti ottimizzati
5. **Facile Manutenzione**: Modifiche in un solo punto
6. **Gestione Errori**: Tutti gli errori sono gestiti centralmente

---

## 🛠️ Prossimi Passi

1. **Includi `database-client.js`** in tutte le tue app HTML
2. **Sostituisci il vecchio codice Supabase** con le nuove chiamate
3. **Testa la comunicazione** tra le app
4. **Attiva le sottoscrizioni realtime** per aggiornamenti automatici

---

## ❓ Supporto

Se hai problemi o domande:
- Controlla la console del browser per messaggi di errore
- Verifica che `database-client.js` sia caricato correttamente
- Assicurati che le app HTML siano sulla stessa origine (stesso dominio)

Buon lavoro! 🚀
