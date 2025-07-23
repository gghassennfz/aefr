'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PRICING_PLANS, formatPrice } from '@/lib/stripe';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    subscription,
    loading,
    hasActiveSubscription,
    currentPlan,
    daysUntilExpiry,
    createCheckoutSession,
    cancelSubscription,
    upgradeSubscription,
    refreshSubscription,
  } = useSubscription();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const plan = PRICING_PLANS[planId.toUpperCase() as keyof typeof PRICING_PLANS];
      if (!plan) throw new Error('Plan not found');

      const priceId = billingCycle === 'yearly' ? plan.yearlyPriceId : plan.priceId;
      
      if (hasActiveSubscription) {
        await upgradeSubscription(priceId);
        toast.success('Abonnement mis à jour avec succès');
      } else {
        const checkoutUrl = await createCheckoutSession(priceId);
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) return;
    
    setCancelLoading(true);
    try {
      await cancelSubscription();
      toast.success('Abonnement annulé avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success-600';
      case 'cancelled':
        return 'text-error-600';
      case 'past_due':
        return 'text-warning-600';
      default:
        return 'text-secondary-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'cancelled':
        return 'Annulé';
      case 'past_due':
        return 'Impayé';
      case 'unpaid':
        return 'Non payé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Paramètres d'abonnement</h1>
        <p className="text-secondary-600">
          Gérez votre abonnement et vos paramètres de facturation
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Abonnement actuel
          </h3>
        </div>
        <div className="card-body">
          {hasActiveSubscription && subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-secondary-900">
                    Plan {currentPlan?.name}
                  </h4>
                  <p className="text-sm text-secondary-600">
                    {formatPrice(subscription.plan_price)} / {subscription.billing_cycle === 'yearly' ? 'an' : 'mois'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {getStatusText(subscription.status)}
                  </span>
                  {subscription.current_period_end && (
                    <p className="text-sm text-secondary-600">
                      Renouvellement le {format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>

              {subscription.status === 'active' && daysUntilExpiry <= 7 && (
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-warning-600 mr-2" />
                    <p className="text-sm text-warning-700">
                      Votre abonnement expire dans {daysUntilExpiry} jours
                    </p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => refreshSubscription()}
                  className="btn-outline"
                  disabled={loading}
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Actualiser
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="btn-danger"
                >
                  {cancelLoading ? 'Annulation...' : 'Annuler l\'abonnement'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCardIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-secondary-900 mb-2">
                Aucun abonnement actif
              </h4>
              <p className="text-secondary-600 mb-4">
                Choisissez un plan pour accéder à toutes les fonctionnalités
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 bg-secondary-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-secondary-900 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Annuel
            <span className="ml-1 text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(PRICING_PLANS).map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const price = billingCycle === 'yearly' ? plan.price * 12 * 0.8 : plan.price;
          const priceLabel = billingCycle === 'yearly' ? `${formatPrice(price)} / an` : `${formatPrice(price)} / mois`;
          
          return (
            <div
              key={plan.id}
              className={`card relative ${plan.popular ? 'ring-2 ring-primary-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Populaire
                  </span>
                </div>
              )}

              <div className="card-body">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-secondary-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-secondary-900">
                      {formatPrice(price)}
                    </span>
                    <span className="text-secondary-600 ml-1">
                      {billingCycle === 'yearly' ? '/ an' : '/ mois'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-success-600 mb-4">
                      Économisez {formatPrice(plan.price * 12 * 0.2)} par an
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircleIconSolid className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgradeLoading === plan.id || isCurrentPlan}
                  className={`w-full ${
                    isCurrentPlan
                      ? 'btn-outline cursor-not-allowed'
                      : plan.popular
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  {upgradeLoading === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner mr-2"></div>
                      Traitement...
                    </div>
                  ) : isCurrentPlan ? (
                    <div className="flex items-center justify-center">
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Plan actuel
                    </div>
                  ) : hasActiveSubscription ? (
                    'Changer de plan'
                  ) : (
                    'Choisir ce plan'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Informations de facturation
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-secondary-900">Email de facturation</h4>
              <p className="text-sm text-secondary-600">{user?.email}</p>
            </div>
            
            {subscription && (
              <div>
                <h4 className="font-medium text-secondary-900">ID client Stripe</h4>
                <p className="text-sm text-secondary-600 font-mono">
                  {subscription.stripe_customer_id}
                </p>
              </div>
            )}
            
            <div className="pt-4 border-t border-secondary-200">
              <button className="btn-outline">
                Gérer les méthodes de paiement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Questions fréquentes
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">
                Puis-je changer de plan à tout moment ?
              </h4>
              <p className="text-sm text-secondary-600">
                Oui, vous pouvez changer de plan à tout moment. Les changements prennent effet immédiatement 
                et vous serez facturé au prorata.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">
                Que se passe-t-il si j'annule mon abonnement ?
              </h4>
              <p className="text-sm text-secondary-600">
                Votre abonnement restera actif jusqu'à la fin de la période de facturation actuelle. 
                Vous garderez l'accès à toutes les fonctionnalités jusqu'à cette date.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">
                Proposez-vous des remises pour les abonnements annuels ?
              </h4>
              <p className="text-sm text-secondary-600">
                Oui, nous offrons 20% de réduction sur tous les plans annuels par rapport aux plans mensuels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
