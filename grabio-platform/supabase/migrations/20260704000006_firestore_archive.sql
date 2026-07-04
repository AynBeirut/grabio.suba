-- Catch-all archive for every Firestore document not in a typed table
CREATE TABLE IF NOT EXISTS public.firestore_archive (
  collection      TEXT NOT NULL,
  firebase_id     TEXT NOT NULL,
  store_firebase_id TEXT,
  parent_path     TEXT,
  data            JSONB NOT NULL DEFAULT '{}',
  migrated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, firebase_id)
);

CREATE INDEX IF NOT EXISTS idx_firestore_archive_store ON public.firestore_archive(store_firebase_id);
CREATE INDEX IF NOT EXISTS idx_firestore_archive_collection ON public.firestore_archive(collection);

ALTER TABLE public.firestore_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_archive" ON public.firestore_archive
  FOR ALL USING (auth.role() = 'service_role');
