-- ============================================================
-- Calendario Familiar — Schema Supabase
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- profiles (espelha auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  avatar_url   TEXT,
  phone        TEXT,
  locale       TEXT NOT NULL DEFAULT 'pt-PT',
  timezone     TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- families
CREATE TABLE IF NOT EXISTS families (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  country_code  TEXT NOT NULL DEFAULT 'PT',
  region_code   TEXT,
  custody_type  TEXT NOT NULL,
  court_ordered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- family_members
CREATE TABLE IF NOT EXISTS family_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  invite_status TEXT NOT NULL DEFAULT 'pendente',
  color         TEXT NOT NULL DEFAULT '#3b82f6',
  can_approve   BOOLEAN NOT NULL DEFAULT TRUE,
  can_request   BOOLEAN NOT NULL DEFAULT TRUE,
  is_view_only  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(family_id, user_id)
);

-- children
CREATE TABLE IF NOT EXISTS children (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  date_of_birth  DATE,
  school_name    TEXT,
  school_region  TEXT,
  color          TEXT NOT NULL DEFAULT '#10b981',
  avatar_url     TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- custody_regimes (rules guardadas em JSONB)
CREATE TABLE IF NOT EXISTS custody_regimes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  regime_type       TEXT NOT NULL,
  label             TEXT NOT NULL,
  effective_from    DATE NOT NULL,
  effective_until   DATE,
  primary_parent_id UUID NOT NULL REFERENCES profiles(id),
  court_ordered     BOOLEAN NOT NULL DEFAULT FALSE,
  priority          INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  rules             JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- exception_requests
CREATE TABLE IF NOT EXISTS exception_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  requested_by        UUID NOT NULL REFERENCES profiles(id),
  exception_type      TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pendente',
  original_date       DATE NOT NULL,
  original_end_date   DATE,
  original_parent_id  UUID NOT NULL REFERENCES profiles(id),
  proposed_date       DATE,
  proposed_end_date   DATE,
  proposed_parent_id  UUID REFERENCES profiles(id),
  reason              TEXT,
  is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,
  responded_by        UUID REFERENCES profiles(id),
  responded_at        TIMESTAMPTZ,
  rejection_reason    TEXT,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id   UUID NOT NULL REFERENCES exception_requests(id) ON DELETE CASCADE,
  actor_id       UUID NOT NULL REFERENCES profiles(id),
  action         TEXT NOT NULL,
  previous_state JSONB,
  new_state      JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- calendar_notes
CREATE TABLE IF NOT EXISTS calendar_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id    UUID REFERENCES children(id) ON DELETE SET NULL,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  note_date   DATE NOT NULL,
  title       TEXT,
  body        TEXT NOT NULL,
  note_type   TEXT NOT NULL DEFAULT 'geral',
  visibility  TEXT NOT NULL DEFAULT 'familia',
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- vacation_periods
CREATE TABLE IF NOT EXISTS vacation_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id         UUID REFERENCES children(id) ON DELETE SET NULL,
  requested_by     UUID NOT NULL REFERENCES profiles(id),
  label            TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  vacation_type    TEXT NOT NULL,
  affects_custody  BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'pendente',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id     UUID REFERENCES children(id) ON DELETE SET NULL,
  description  TEXT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  date         DATE NOT NULL,
  category     TEXT NOT NULL,
  paid_by      UUID NOT NULL REFERENCES profiles(id),
  split_type   TEXT NOT NULL DEFAULT 'partilhada',
  split_ratio  DECIMAL(4,3) NOT NULL DEFAULT 0.5,
  status       TEXT NOT NULL DEFAULT 'pendente',
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  notes        TEXT,
  receipts     TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Trigger: criar profile automaticamente ao registar
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'displayName', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE children          ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_regimes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_periods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;

-- Helper: verificar se utilizador é membro da família
CREATE OR REPLACE FUNCTION is_family_member(fam_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = fam_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- profiles: todos podem ver (necessário para mostrar nomes), só cada um edita o seu
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- families
DROP POLICY IF EXISTS "families_select" ON families;
DROP POLICY IF EXISTS "families_insert" ON families;
DROP POLICY IF EXISTS "families_update" ON families;
CREATE POLICY "families_select" ON families FOR SELECT USING (is_family_member(id));
CREATE POLICY "families_insert" ON families FOR INSERT WITH CHECK (true);
CREATE POLICY "families_update" ON families FOR UPDATE USING (is_family_member(id));

-- family_members
DROP POLICY IF EXISTS "members_select"  ON family_members;
DROP POLICY IF EXISTS "members_insert"  ON family_members;
DROP POLICY IF EXISTS "members_update"  ON family_members;
DROP POLICY IF EXISTS "members_delete"  ON family_members;
CREATE POLICY "members_select" ON family_members FOR SELECT USING (is_family_member(family_id) OR user_id = auth.uid());
CREATE POLICY "members_insert" ON family_members FOR INSERT WITH CHECK (is_family_member(family_id) OR user_id = auth.uid());
CREATE POLICY "members_update" ON family_members FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "members_delete" ON family_members FOR DELETE USING (is_family_member(family_id));

-- children
DROP POLICY IF EXISTS "children_all" ON children;
CREATE POLICY "children_all" ON children FOR ALL USING (is_family_member(family_id));

-- custody_regimes
DROP POLICY IF EXISTS "regimes_all" ON custody_regimes;
CREATE POLICY "regimes_all" ON custody_regimes FOR ALL USING (is_family_member(family_id));

-- exception_requests
DROP POLICY IF EXISTS "exceptions_all" ON exception_requests;
CREATE POLICY "exceptions_all" ON exception_requests FOR ALL USING (is_family_member(family_id));

-- audit_log
DROP POLICY IF EXISTS "audit_select" ON audit_log;
DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM exception_requests er
    JOIN family_members fm ON fm.family_id = er.family_id
    WHERE er.id = audit_log.exception_id AND fm.user_id = auth.uid()
  ));
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (actor_id = auth.uid());

-- calendar_notes (privadas só visíveis pelo autor)
DROP POLICY IF EXISTS "notes_select" ON calendar_notes;
DROP POLICY IF EXISTS "notes_insert" ON calendar_notes;
DROP POLICY IF EXISTS "notes_update" ON calendar_notes;
DROP POLICY IF EXISTS "notes_delete" ON calendar_notes;
CREATE POLICY "notes_select" ON calendar_notes FOR SELECT
  USING (is_family_member(family_id) AND (visibility = 'familia' OR author_id = auth.uid()));
CREATE POLICY "notes_insert" ON calendar_notes FOR INSERT WITH CHECK (is_family_member(family_id) AND author_id = auth.uid());
CREATE POLICY "notes_update" ON calendar_notes FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "notes_delete" ON calendar_notes FOR DELETE USING (author_id = auth.uid());

-- vacation_periods
DROP POLICY IF EXISTS "vacations_all" ON vacation_periods;
CREATE POLICY "vacations_all" ON vacation_periods FOR ALL USING (is_family_member(family_id));

-- expenses
DROP POLICY IF EXISTS "expenses_all" ON expenses;
CREATE POLICY "expenses_all" ON expenses FOR ALL USING (is_family_member(family_id));
