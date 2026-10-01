/**
 * revenuecat.ts — DEMO MOCK
 *
 * This file replaces the real RevenueCat SDK.
 * All subscription state is stored in Firestore via the backend API.
 * No real payment SDK is used. No real money can be charged.
 */

import { api } from './api';

let _isConfigured = false;

export async function initializeRevenueCat() {
  _isConfigured = true;
  console.log('[Demo] RevenueCat mock initialized');
}

export function isRevenueCatConfigured() {
  return _isConfigured;
}

export async function loginRevenueCatUser(firebaseUid: string) {
  console.log('[Demo] RevenueCat mock login:', firebaseUid);
}

export async function logoutRevenueCatUser() {
  console.log('[Demo] RevenueCat mock logout');
}

export async function hasPremiumAccess(): Promise<boolean> {
  try {
    const res = await api.getUserStatus();
    return res.isSubscribed;
  } catch {
    return false;
  }
}

export interface CustomerInfoResult {
  isPremium: boolean;
  activeEntitlements: string[];
  expiresAt: number | null;
  originalAppUserId: string | null;
  platform: string | null;
}

export async function getCustomerInfo(): Promise<CustomerInfoResult> {
  try {
    const res = await api.getUserStatus();
    return {
      isPremium: res.isSubscribed,
      activeEntitlements: res.isSubscribed ? ['premium'] : [],
      expiresAt: res.isSubscribed ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
      originalAppUserId: null,
      platform: 'demo',
    };
  } catch {
    return {
      isPremium: false,
      activeEntitlements: [],
      expiresAt: null,
      originalAppUserId: null,
      platform: null,
    };
  }
}

export interface RestoreResult {
  success: boolean;
  isPremium: boolean;
  message?: string;
}

export async function restorePurchases(): Promise<RestoreResult> {
  try {
    const result = await api.restorePurchase();
    return {
      success: result.success,
      isPremium: result.isPremium || false,
      message: result.message,
    };
  } catch (err: any) {
    return {
      success: false,
      isPremium: false,
      message: err?.message || 'Restore failed',
    };
  }
}

export async function refreshSubscriptionStatus(): Promise<CustomerInfoResult> {
  return getCustomerInfo();
}

// No-op listener — real-time subscription updates not needed in demo mode
export function onCustomerInfoUpdated(_callback: (info: any) => void): () => void {
  return () => {};
}