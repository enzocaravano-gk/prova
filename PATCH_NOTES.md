# PATCH NOTES — SPORTHUB+

## Correzioni applicate

1. **AuthContext stabilizzato**
   - Il ruolo utente ora viene caricato prima di sbloccare la UI.
   - Eliminato il caso in cui un direttore poteva vedere temporaneamente la dashboard coach.

2. **Accettazione inviti resa robusta**
   - Se un coach apre `/app?invite=...` da autenticato, il collegamento alla squadra viene completato automaticamente.
   - Questo copre sia il caso **coach esistente che fa login** sia il caso **coach nuovo che conferma email e rientra nell'app**.

3. **Flow inviti direttore corretto**
   - Rimossa la dipendenza dall'Admin API Supabase nel browser.
   - Il link invito ora usa il **token reale** generato da `coach_invites`.
   - Il link viene copiato automaticamente negli appunti.
   - Se esiste già un invito pendente per quella email, viene recuperato e ricopiato il link esistente.

4. **Routing Vercel corretto per SPA**
   - Aggiunti rewrite per `/app` e `/login`, necessari per deep link e redirect da email.

## Cosa resta da fare dopo il deploy

### In Vercel
- Imposta le env del frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Rilancia il deploy.

### In Supabase Auth
Nel pannello **Authentication > URL Configuration** verifica:
- `Site URL` = dominio principale Vercel
- `Redirect URLs` includa almeno:
  - `https://TUO-DOMINIO/app`
  - `https://*.vercel.app/app`

## Limiti ancora presenti

- Le schermate coach sono ancora moduli HTML in iframe.
- Jump/Postura non sono ancora state rifatte come moduli React unificati.
- Alcuni moduli coach continuano a usare cache locale oltre al DB.
- Multi-team coach non ancora gestito bene: diversi moduli prendono ancora la prima squadra assegnata.

## Priorità prossima fase

1. Rifare area coach senza iframe
2. Rendere Supabase unica source of truth
3. Aggiungere selettore squadra per coach multi-team
4. Aggiungere error handling chiaro su ogni salvataggio
