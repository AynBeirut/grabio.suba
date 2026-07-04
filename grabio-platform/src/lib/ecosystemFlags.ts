/**
 * Local ecosystem rollout flags — all default OFF so production behaviour is unchanged
 * until you explicitly enable them in `.env.local` (never commit secrets).
 */

function envFlag(name: string): boolean {
  const value = String(import.meta.env[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export const ECOSYSTEM_FLAGS = {
  modularEntitlements: envFlag('VITE_ECOSYSTEM_MODULAR'),
  modularCheckout: envFlag('VITE_ECOSYSTEM_MODULAR_CHECKOUT'),
  enforceModuleGates: envFlag('VITE_ECOSYSTEM_ENFORCE_MODULES'),
  packageDraft: envFlag('VITE_ECOSYSTEM_PACKAGE_DRAFT'),
  publicProductStockApi: envFlag('VITE_PUBLIC_PRODUCT_STOCK_API'),
  /** Use Supabase as the primary backend instead of Firebase. */
  useSupabase: envFlag('VITE_USE_SUPABASE'),
} as const;

export function isModularEntitlementsEnabled(): boolean {
  return ECOSYSTEM_FLAGS.modularEntitlements;
}

export function useSupabase(): boolean {
  return ECOSYSTEM_FLAGS.useSupabase;
}
