
-- 1. Societies table
CREATE TABLE public.societies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  director_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(director_id)
);
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;

-- 2. Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 3. Team coaches junction
CREATE TABLE public.team_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, coach_id)
);
ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;

-- 4. Athletes table
CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  birth_date date,
  position text,
  jersey_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Validation trigger: max 3 coaches per team
CREATE OR REPLACE FUNCTION public.validate_max_coaches()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.team_coaches WHERE team_id = NEW.team_id) >= 3 THEN
    RAISE EXCEPTION 'Massimo 3 allenatori per squadra';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_max_coaches BEFORE INSERT ON public.team_coaches
  FOR EACH ROW EXECUTE FUNCTION public.validate_max_coaches();

-- Validation trigger: max 28 athletes per team
CREATE OR REPLACE FUNCTION public.validate_max_athletes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.athletes WHERE team_id = NEW.team_id) >= 28 THEN
    RAISE EXCEPTION 'Massimo 28 atleti per squadra';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_max_athletes BEFORE INSERT ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.validate_max_athletes();

-- Helper: get society_id for director
CREATE OR REPLACE FUNCTION public.get_user_society_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.societies WHERE director_id = _user_id LIMIT 1
$$;

-- Helper: is user coach of team
CREATE OR REPLACE FUNCTION public.is_coach_of_team(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_coaches WHERE coach_id = _user_id AND team_id = _team_id)
$$;

-- RLS: societies
CREATE POLICY "Directors can view own society" ON public.societies
  FOR SELECT TO authenticated USING (director_id = auth.uid());
CREATE POLICY "Directors can insert own society" ON public.societies
  FOR INSERT TO authenticated WITH CHECK (director_id = auth.uid() AND public.has_role(auth.uid(), 'director'));
CREATE POLICY "Directors can update own society" ON public.societies
  FOR UPDATE TO authenticated USING (director_id = auth.uid());
CREATE POLICY "Directors can delete own society" ON public.societies
  FOR DELETE TO authenticated USING (director_id = auth.uid());

-- RLS: teams (directors manage, coaches view their own)
CREATE POLICY "Directors can select teams" ON public.teams
  FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Directors can insert teams" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Directors can update teams" ON public.teams
  FOR UPDATE TO authenticated USING (society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Directors can delete teams" ON public.teams
  FOR DELETE TO authenticated USING (society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Coaches can view their teams" ON public.teams
  FOR SELECT TO authenticated USING (public.is_coach_of_team(auth.uid(), id));

-- RLS: team_coaches
CREATE POLICY "Directors can select team_coaches" ON public.team_coaches
  FOR SELECT TO authenticated USING (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Directors can insert team_coaches" ON public.team_coaches
  FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Directors can delete team_coaches" ON public.team_coaches
  FOR DELETE TO authenticated USING (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Coaches can view own assignments" ON public.team_coaches
  FOR SELECT TO authenticated USING (coach_id = auth.uid());

-- RLS: athletes
CREATE POLICY "Directors can select athletes" ON public.athletes
  FOR SELECT TO authenticated USING (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Directors can insert athletes" ON public.athletes
  FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Directors can update athletes" ON public.athletes
  FOR UPDATE TO authenticated USING (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Directors can delete athletes" ON public.athletes
  FOR DELETE TO authenticated USING (team_id IN (SELECT id FROM public.teams WHERE society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Coaches can select athletes" ON public.athletes
  FOR SELECT TO authenticated USING (public.is_coach_of_team(auth.uid(), team_id));
CREATE POLICY "Coaches can insert athletes" ON public.athletes
  FOR INSERT TO authenticated WITH CHECK (public.is_coach_of_team(auth.uid(), team_id));
CREATE POLICY "Coaches can update athletes" ON public.athletes
  FOR UPDATE TO authenticated USING (public.is_coach_of_team(auth.uid(), team_id));
CREATE POLICY "Coaches can delete athletes" ON public.athletes
  FOR DELETE TO authenticated USING (public.is_coach_of_team(auth.uid(), team_id));
