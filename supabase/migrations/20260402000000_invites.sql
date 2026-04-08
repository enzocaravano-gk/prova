-- ══════════════════════════════════════════════════════════
-- SISTEMA INVITI ALLENATORI
-- ══════════════════════════════════════════════════════════

CREATE TABLE public.coach_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id    uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  phone         text,
  status        text NOT NULL DEFAULT 'pending',
  -- status: pending | accepted | expired
  token         uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  UNIQUE(team_id, email)
);
ALTER TABLE public.coach_invites ENABLE ROW LEVEL SECURITY;

-- Solo il direttore della società può vedere/creare inviti
CREATE POLICY "directors manage invites" ON public.coach_invites
  FOR ALL TO authenticated
  USING (society_id = public.get_user_society_id(auth.uid()))
  WITH CHECK (society_id = public.get_user_society_id(auth.uid()));

-- L'allenatore può vedere il proprio invito via token (senza auth)
CREATE POLICY "anyone can read invite by token" ON public.coach_invites
  FOR SELECT USING (true);

-- Funzione: accetta invito (chiamata dopo che l'allenatore completa la registrazione)
CREATE OR REPLACE FUNCTION public.accept_coach_invite(_token uuid, _coach_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.coach_invites;
BEGIN
  SELECT * INTO inv FROM public.coach_invites WHERE token = _token AND status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  -- Aggiunge allenatore alla squadra
  INSERT INTO public.team_coaches(team_id, coach_id)
  VALUES (inv.team_id, _coach_id)
  ON CONFLICT (team_id, coach_id) DO NOTHING;

  -- Aggiorna phone nel profilo se fornito
  IF inv.phone IS NOT NULL THEN
    UPDATE public.profiles SET phone = inv.phone WHERE user_id = _coach_id AND (phone IS NULL OR phone = '');
  END IF;

  -- Marca invito come accettato
  UPDATE public.coach_invites SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  RETURN true;
END;
$$;

-- Funzione: allenatore autonomo si collega a società esistente
-- Il direttore trova l'allenatore per email e lo aggiunge (se già registrato)
CREATE OR REPLACE FUNCTION public.link_coach_to_team(_coach_email text, _team_id uuid, _director_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  coach_id uuid;
  team_soc uuid;
  dir_soc uuid;
BEGIN
  -- Verifica che il team appartenga alla società del direttore
  SELECT society_id INTO team_soc FROM public.teams WHERE id = _team_id;
  SELECT id INTO dir_soc FROM public.societies WHERE director_id = _director_id;
  IF team_soc IS DISTINCT FROM dir_soc THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Team non appartiene alla tua società');
  END IF;

  -- Cerca allenatore per email
  SELECT u.id INTO coach_id FROM auth.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.email = _coach_email AND ur.role = 'coach';

  IF coach_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nessun allenatore trovato con questa email. Puoi invitarlo.');
  END IF;

  -- Controlla limite 3 allenatori per squadra
  IF (SELECT COUNT(*) FROM public.team_coaches WHERE team_id = _team_id) >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Massimo 3 allenatori per squadra raggiunto');
  END IF;

  INSERT INTO public.team_coaches(team_id, coach_id)
  VALUES (_team_id, coach_id)
  ON CONFLICT (team_id, coach_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'coach_id', coach_id);
END;
$$;

-- Squadre senza società: l'allenatore autonomo può crearne
-- Aggiungiamo society_id nullable per squadre "orfane"
ALTER TABLE public.teams ALTER COLUMN society_id DROP NOT NULL;

-- RLS aggiornata: allenatori possono creare squadre proprie (senza society)
CREATE POLICY "coaches can create own teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (society_id IS NULL);

CREATE POLICY "coaches can update own teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (id IN (SELECT team_id FROM public.team_coaches WHERE coach_id = auth.uid()));

CREATE POLICY "coaches can delete own teams" ON public.teams
  FOR DELETE TO authenticated
  USING (id IN (SELECT team_id FROM public.team_coaches WHERE coach_id = auth.uid()) AND society_id IS NULL);

-- Vista: squadre visibili all'allenatore (proprie + assegnate)
CREATE OR REPLACE VIEW public.coach_teams AS
SELECT t.*, tc.coach_id
FROM public.teams t
JOIN public.team_coaches tc ON tc.team_id = t.id
WHERE tc.coach_id = auth.uid();
