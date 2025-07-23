'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING_PLANS, getPlanById } from '@/lib/stripe';
import { Database } from '@/lib/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  currentPlan: any | null;
  isTrialPeriod: boolean;
  daysUntilExpiry: number;
  canAccessFeature: (feature: string) => boolean;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (priceId: string) => Promise<string>;
  cancelSubscription: () => Promise<void>;
  upgradeSubscription: (newPriceId: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user subscription
  const loadSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user]);

  // Derived values
  const hasActiveSubscription = subscription?.status === 'active';
  const currentPlan = subscription ? getPlanById(subscription.plan_name) : null;
  const isTrialPeriod = false; // TODO: Implement trial logic
  
  const daysUntilExpiry = subscription?.current_period_end 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Feature access control
  const canAccessFeature = (feature: string): boolean => {
    if (!hasActiveSubscription) {
      // Free tier limitations
      return ['basic_invoicing', 'basic_clients', 'basic_dashboard'].includes(feature);
    }

    const plan = currentPlan;
    if (!plan) return false;

    // Feature mapping based on plan
    const featureMap: { [key: string]: string[] } = {
      starter: [
        'basic_invoicing', 'basic_clients', 'basic_dashboard', 'pdf_export', 'email_support'
      ],
      professional: [
        'basic_invoicing', 'basic_clients', 'basic_dashboard', 'pdf_export', 'email_support',
        'unlimited_invoices', 'quotes_management', 'automatic_reminders', 'advanced_accounting',
        'tax_declarations', 'fiscal_calendar', 'detailed_analytics', 'priority_support'
      ],
      enterprise: [
        'basic_invoicing', 'basic_clients', 'basic_dashboard', 'pdf_export', 'email_support',
        'unlimited_invoices', 'quotes_management', 'automatic_reminders', 'advanced_accounting',
        'tax_declarations', 'fiscal_calendar', 'detailed_analytics', 'priority_support',
        'multi_users', 'advanced_api', 'custom_integrations', 'auto_backup', 'phone_support'
      ]
    };

    return featureMap[plan.id]?.includes(feature) || false;
  };

  // Create Stripe checkout session
  const createCheckoutSession = async (priceId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId: user.id,
        customerEmail: user.email,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return data.url;
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!subscription) throw new Error('No active subscription');

    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.stripe_subscription_id,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel subscription');
    }

    await refreshSubscription();
  };

  // Upgrade subscription
  const upgradeSubscription = async (newPriceId: string) => {
    if (!subscription) throw new Error('No active subscription');

    const response = await fetch('/api/stripe/upgrade-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.stripe_subscription_id,
        newPriceId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upgrade subscription');
    }

    await refreshSubscription();
  };

  // Refresh subscription data
  const refreshSubscription = async () => {
    await loadSubscription();
  };

  const value = {
    subscription,
    loading,
    hasActiveSubscription,
    currentPlan,
    isTrialPeriod,
    daysUntilExpiry,
    canAccessFeature,
    refreshSubscription,
    createCheckoutSession,
    cancelSubscription,
    upgradeSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
