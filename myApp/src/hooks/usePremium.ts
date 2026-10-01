/**
 * usePremium Hook
 *
 * Manages premium subscription state via our backend API.
 * All RevenueCat SDK references have been replaced with the demo
 * subscription system.
 *
 * Usage:
 * const { isPremium, loading, refreshSubscription, restorePurchases } = usePremium();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCustomerInfo,
  onCustomerInfoUpdated,
  isRevenueCatConfigured,
} from '../services/revenuecat';
import { api } from '../services/api';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface UsePremiumReturn {
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  activeEntitlements: string[];
  expiresAt: number | null;
  platform: string | null;
  refreshSubscription: () => Promise<void>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntitlements, setActiveEntitlements] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const hasInitializedRef = useRef(false);
  const unsubscribeListenerRef = useRef<(() => void) | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!isRevenueCatConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const status = await getCustomerInfo();

      setIsPremium(status.isPremium);
      setActiveEntitlements(status.activeEntitlements || []);
      setExpiresAt(status.expiresAt || null);
      setPlatform(status.platform || null);
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError('Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.restorePurchase();

      if (result.success && result.isPremium) {
        setIsPremium(true);
        await refreshSubscription();
        return { success: true };
      } else if (result.success) {
        return { success: true };
      } else {
        setError(result.message || 'Restore failed');
        return { success: false, error: result.message };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to restore purchases';
      console.error(errorMsg, err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [refreshSubscription]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          await new Promise((r) => setTimeout(r, 200));
          await refreshSubscription();

          const unsubscribeListener = onCustomerInfoUpdated(() => {});
          unsubscribeListenerRef.current = unsubscribeListener;
        }
      } else {
        hasInitializedRef.current = false;

        if (unsubscribeListenerRef.current) {
          unsubscribeListenerRef.current();
          unsubscribeListenerRef.current = null;
        }

        setIsPremium(false);
        setActiveEntitlements([]);
        setExpiresAt(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeListenerRef.current) {
        unsubscribeListenerRef.current();
      }
    };
  }, [refreshSubscription]);

  return {
    isPremium,
    loading,
    error,
    activeEntitlements,
    expiresAt,
    platform,
    refreshSubscription,
    restorePurchases,
  };
}
