-- Unique constraints for Firestore → Supabase upsert (PostgREST onConflict)
ALTER TABLE public.stores ADD CONSTRAINT stores_firebase_id_unique UNIQUE (firebase_id);
ALTER TABLE public.products ADD CONSTRAINT products_firebase_id_unique UNIQUE (firebase_id);
ALTER TABLE public.orders ADD CONSTRAINT orders_firebase_id_unique UNIQUE (firebase_id);
ALTER TABLE public.customers ADD CONSTRAINT customers_firebase_id_unique UNIQUE (firebase_id);
ALTER TABLE public.users ADD CONSTRAINT users_firebase_uid_unique UNIQUE (firebase_uid);
