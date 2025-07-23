import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default stripePromise;

// Stripe pricing plans
export const PRICING_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    priceId: 'price_starter_monthly', // Replace with actual Stripe price ID
    yearlyPriceId: 'price_starter_yearly',
    features: [
      'Jusqu\'à 50 factures par mois',
      'Gestion des clients',
      'Suivi des paiements',
      'Tableaux de bord basiques',
      'Export PDF',
      'Support email'
    ],
    limits: {
      invoices: 50,
      clients: 100,
      storage: '1GB'
    }
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 39,
    priceId: 'price_professional_monthly',
    yearlyPriceId: 'price_professional_yearly',
    features: [
      'Factures illimitées',
      'Gestion des devis',
      'Rappels automatiques',
      'Comptabilité avancée',
      'Déclarations fiscales',
      'Calendrier fiscal',
      'Analyses détaillées',
      'Support prioritaire'
    ],
    limits: {
      invoices: 'unlimited',
      clients: 'unlimited',
      storage: '10GB'
    },
    popular: true
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 79,
    priceId: 'price_enterprise_monthly',
    yearlyPriceId: 'price_enterprise_yearly',
    features: [
      'Tout du plan Professional',
      'Multi-utilisateurs',
      'API avancée',
      'Intégrations personnalisées',
      'Sauvegarde automatique',
      'Support téléphonique',
      'Gestionnaire de compte dédié'
    ],
    limits: {
      invoices: 'unlimited',
      clients: 'unlimited',
      storage: '100GB'
    }
  }
};

// Helper function to get plan by ID
export const getPlanById = (planId: string) => {
  return Object.values(PRICING_PLANS).find(plan => plan.id === planId);
};

// Helper function to format price
export const formatPrice = (price: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

// Helper function to get price ID based on billing cycle
export const getPriceId = (planId: string, yearly: boolean = false) => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  
  return yearly ? plan.yearlyPriceId : plan.priceId;
};
