export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'business';
export type PaidTier = Exclude<SubscriptionTier, 'trial'>;
export type Billing = 'monthly' | 'yearly';

export const PRICING: Record<PaidTier, Record<Billing, number>> = {
  starter: { monthly: 1000, yearly: 10000 },
  pro: { monthly: 2000, yearly: 20000 },
  business: { monthly: 3000, yearly: 30000 },
};

export const ADDON_PRICING = {
  domainPackage: { monthly: 1500, yearly: 15000 },
  whatsappBusiness: { monthly: 1000, yearly: 10000 },
  extraStoragePer5Gb: { monthly: 200, yearly: 2400 },
  salesCrm: { monthly: 1500, yearly: 15000 },
};

export const PLAN_LIMITS: Record<SubscriptionTier, {
  productLimit: number;
  storageLimitMb: number;
  operationsPerMonth: number | null;
  revenueSharePercentage: number;
  allowsComposed: boolean;
  allowsManufacturing: boolean;
}> = {
  trial: { productLimit: 10, storageLimitMb: 500, operationsPerMonth: 30, revenueSharePercentage: 20, allowsComposed: false, allowsManufacturing: false },
  starter: { productLimit: 8, storageLimitMb: 5120, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: false },
  pro: { productLimit: 20, storageLimitMb: 10240, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: true },
  business: { productLimit: 50, storageLimitMb: 20480, operationsPerMonth: null, revenueSharePercentage: 0, allowsComposed: true, allowsManufacturing: true },
};

export const TRIAL_DURATION_MONTHS = 3;
export const TRIAL_GRACE_DAYS = 15;

export function normalizeTier(tier?: string): SubscriptionTier {
  if (!tier) return 'starter';
  if (tier === 'premium') return 'starter';
  if (['trial', 'starter', 'pro', 'business'].includes(tier)) return tier as SubscriptionTier;
  return 'starter';
}

export function normalizePaidTier(tier?: string): PaidTier {
  const t = normalizeTier(tier);
  return t === 'trial' ? 'starter' : t;
}

interface NormalizedAddOns {
  domainPackage: boolean;
  whatsappBusiness: boolean;
  salesCrm: boolean;
  extraStorageBlocks: number;
}

export function normalizeAddOns(addOns: unknown): NormalizedAddOns {
  if (Array.isArray(addOns)) {
    return {
      domainPackage: addOns.includes('domainPackage') || addOns.includes('customDomainHosting'),
      whatsappBusiness: addOns.includes('whatsappBusiness'),
      salesCrm: addOns.includes('salesCrm'),
      extraStorageBlocks: addOns.includes('extraStorage') || addOns.includes('storage') ? 1 : 0,
    };
  }
  const value = (addOns && typeof addOns === 'object' ? addOns : {}) as Record<string, unknown>;
  return {
    domainPackage: Boolean(value.domainPackage || value.customDomainHosting),
    whatsappBusiness: Boolean(value.whatsappBusiness),
    salesCrm: Boolean(value.salesCrm),
    extraStorageBlocks: Math.max(0, Number(value.extraStorageBlocks || (value.storage ? 1 : 0) || 0)),
  };
}

export function calculateAmount(tier: PaidTier, billing: Billing, addOnsInput: unknown) {
  const addOns = normalizeAddOns(addOnsInput);
  let amount = PRICING[tier][billing];
  let description = `Grabio ${tier.toUpperCase()} - ${billing}`;
  if (addOns.domainPackage) { amount += ADDON_PRICING.domainPackage[billing]; description += ' + Domain Package'; }
  if (addOns.whatsappBusiness) { amount += ADDON_PRICING.whatsappBusiness[billing]; description += ' + WhatsApp Business'; }
  if (addOns.extraStorageBlocks > 0) { amount += addOns.extraStorageBlocks * ADDON_PRICING.extraStoragePer5Gb[billing]; description += ` + ${addOns.extraStorageBlocks}x Extra Storage`; }
  if (addOns.salesCrm) { amount += ADDON_PRICING.salesCrm[billing]; description += ' + Sales CRM'; }
  return { amount, description, addOns };
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
