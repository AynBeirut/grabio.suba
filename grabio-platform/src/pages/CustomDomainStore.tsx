import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { resolveStoreByCustomDomain } from '@/lib/publicStoreService';

interface Props {
  hostname: string;
}

const CustomDomainStore: React.FC<Props> = ({ hostname }) => {
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const lookupDomain = async () => {
      try {
        const resolved = await resolveStoreByCustomDomain(hostname);
        if (!resolved) {
          setNotFound(true);
          return;
        }
        if (resolved.store.slug) {
          setStoreSlug(resolved.store.slug);
        } else {
          setStoreId(resolved.legacyStoreId);
        }
      } catch (err) {
        console.error('[CustomDomainStore] lookup failed', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void lookupDomain();
  }, [hostname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <p className="text-muted-foreground">
          No store is connected to <strong>{hostname}</strong>. Please check with the store owner.
        </p>
      </div>
    );
  }

  if (storeSlug) {
    return <Navigate to={`/${storeSlug}`} replace />;
  }

  if (storeId) {
    return <Navigate to={`/store/id/${storeId}`} replace />;
  }

  return null;
};

export default CustomDomainStore;
