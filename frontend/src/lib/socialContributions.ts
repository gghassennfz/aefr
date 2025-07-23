import { supabase } from './supabase';
import { getUserTransactions, getAccountingSummary } from './accounting';

export interface SocialContributionRates {
  maladie: number;
  retraite_base: number;
  retraite_complementaire: number;
  invalidite_deces: number;
  csg_crds: number;
  formation_professionnelle: number;
  total: number;
}

export interface SocialContributionCalculation {
  revenue: number;
  activity_type: 'services' | 'commerce' | 'liberal';
  rates: SocialContributionRates;
  contributions: {
    maladie: number;
    retraite_base: number;
    retraite_complementaire: number;
    invalidite_deces: number;
    csg_crds: number;
    formation_professionnelle: number;
    total: number;
  };
  net_revenue: number;
  quarter: string;
  year: number;
}

export interface QuarterlyDeclaration {
  id: string;
  user_id: string;
  year: number;
  quarter: number;
  revenue: number;
  contributions: number;
  activity_type: 'services' | 'commerce' | 'liberal';
  status: 'draft' | 'submitted' | 'paid';
  due_date: string;
  submitted_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// Taux de cotisations sociales 2024 pour auto-entrepreneurs
export const SOCIAL_CONTRIBUTION_RATES_2024: Record<string, SocialContributionRates> = {
  services: {
    maladie: 0.065, // 6.5%
    retraite_base: 0.1175, // 11.75%
    retraite_complementaire: 0.007, // 0.7%
    invalidite_deces: 0.0048, // 0.48%
    csg_crds: 0.0262, // 2.62%
    formation_professionnelle: 0.0025, // 0.25%
    total: 0.221 // 22.1%
  },
  commerce: {
    maladie: 0.065, // 6.5%
    retraite_base: 0.1175, // 11.75%
    retraite_complementaire: 0.007, // 0.7%
    invalidite_deces: 0.0048, // 0.48%
    csg_crds: 0.0262, // 2.62%
    formation_professionnelle: 0.0011, // 0.11%
    total: 0.1286 // 12.86%
  },
  liberal: {
    maladie: 0.065, // 6.5%
    retraite_base: 0.1175, // 11.75%
    retraite_complementaire: 0.007, // 0.7%
    invalidite_deces: 0.0048, // 0.48%
    csg_crds: 0.0262, // 2.62%
    formation_professionnelle: 0.0025, // 0.25%
    total: 0.221 // 22.1%
  }
};

// Seuils de franchise 2024
export const FRANCHISE_THRESHOLDS_2024 = {
  services: 77700, // €
  commerce: 188700, // €
  liberal: 77700 // €
};

// Calcul des cotisations sociales
export const calculateSocialContributions = (
  revenue: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services',
  year: number = new Date().getFullYear()
): SocialContributionCalculation => {
  const rates = SOCIAL_CONTRIBUTION_RATES_2024[activityType];
  const threshold = FRANCHISE_THRESHOLDS_2024[activityType];
  
  // Vérifier si le CA dépasse le seuil de franchise
  if (revenue > threshold) {
    throw new Error(`Chiffre d'affaires dépassant le seuil de ${threshold}€ pour ${activityType}`);
  }

  const contributions = {
    maladie: revenue * rates.maladie,
    retraite_base: revenue * rates.retraite_base,
    retraite_complementaire: revenue * rates.retraite_complementaire,
    invalidite_deces: revenue * rates.invalidite_deces,
    csg_crds: revenue * rates.csg_crds,
    formation_professionnelle: revenue * rates.formation_professionnelle,
    total: revenue * rates.total
  };

  const net_revenue = revenue - contributions.total;
  const quarter = `T${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  return {
    revenue,
    activity_type: activityType,
    rates,
    contributions,
    net_revenue,
    quarter,
    year
  };
};

// Calcul des cotisations trimestrielles
export const calculateQuarterlyContributions = async (
  userId: string,
  year: number,
  quarter: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services'
): Promise<SocialContributionCalculation> => {
  // Déterminer les dates du trimestre
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, endMonth, 0); // dernier jour du mois
  
  // Récupérer les transactions du trimestre
  const transactions = await getUserTransactions(userId, {
    type: 'income',
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  });

  // Calculer le CA du trimestre
  const quarterlyRevenue = transactions.reduce((sum, transaction) => {
    return sum + transaction.amount;
  }, 0);

  return calculateSocialContributions(quarterlyRevenue, activityType, year);
};

// Calcul des cotisations annuelles
export const calculateAnnualContributions = async (
  userId: string,
  year: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services'
): Promise<SocialContributionCalculation> => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  const summary = await getAccountingSummary(userId, startDate, endDate);
  
  return calculateSocialContributions(summary.totalIncome, activityType, year);
};

// Enregistrer une déclaration trimestrielle
export const saveQuarterlyDeclaration = async (
  userId: string,
  year: number,
  quarter: number,
  calculation: SocialContributionCalculation
): Promise<string> => {
  // Calculer la date limite de déclaration (fin du mois suivant le trimestre)
  const dueMonth = (quarter * 3) + 1;
  const dueDate = new Date(year, dueMonth, 0); // dernier jour du mois

  const { data, error } = await supabase
    .from('quarterly_declarations')
    .insert({
      user_id: userId,
      year,
      quarter,
      revenue: calculation.revenue,
      contributions: calculation.contributions.total,
      activity_type: calculation.activity_type,
      status: 'draft',
      due_date: dueDate.toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
};

// Récupérer les déclarations trimestrielles
export const getQuarterlyDeclarations = async (
  userId: string,
  year?: number
): Promise<QuarterlyDeclaration[]> => {
  let query = supabase
    .from('quarterly_declarations')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false });

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
};

// Marquer une déclaration comme soumise
export const submitQuarterlyDeclaration = async (declarationId: string): Promise<void> => {
  const { error } = await supabase
    .from('quarterly_declarations')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
    .eq('id', declarationId);

  if (error) throw error;
};

// Marquer une déclaration comme payée
export const payQuarterlyDeclaration = async (declarationId: string): Promise<void> => {
  const { error } = await supabase
    .from('quarterly_declarations')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('id', declarationId);

  if (error) throw error;
};

// Récupérer les déclarations en retard
export const getOverdueDeclarations = async (userId: string): Promise<QuarterlyDeclaration[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('quarterly_declarations')
    .select('*')
    .eq('user_id', userId)
    .lt('due_date', today)
    .neq('status', 'paid')
    .order('due_date');

  if (error) throw error;
  return data || [];
};

// Récupérer les prochaines échéances
export const getUpcomingDeadlines = async (userId: string, days: number = 30): Promise<QuarterlyDeclaration[]> => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  
  const { data, error } = await supabase
    .from('quarterly_declarations')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .neq('status', 'paid')
    .order('due_date');

  if (error) throw error;
  return data || [];
};

// Générer les déclarations automatiquement pour l'année
export const generateAnnualDeclarations = async (
  userId: string,
  year: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services'
): Promise<void> => {
  const declarations = [];
  
  for (let quarter = 1; quarter <= 4; quarter++) {
    const calculation = await calculateQuarterlyContributions(userId, year, quarter, activityType);
    
    if (calculation.revenue > 0) {
      await saveQuarterlyDeclaration(userId, year, quarter, calculation);
    }
  }
};

// Simuler les cotisations sur différents CA
export const simulateContributions = (
  revenues: number[],
  activityType: 'services' | 'commerce' | 'liberal' = 'services'
): Array<{ revenue: number; contributions: number; net: number; rate: number }> => {
  return revenues.map(revenue => {
    const calculation = calculateSocialContributions(revenue, activityType);
    return {
      revenue,
      contributions: calculation.contributions.total,
      net: calculation.net_revenue,
      rate: (calculation.contributions.total / revenue) * 100
    };
  });
};

// Détail des cotisations par poste
export const getContributionBreakdown = (
  revenue: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services'
): Array<{ name: string; rate: number; amount: number; description: string }> => {
  const rates = SOCIAL_CONTRIBUTION_RATES_2024[activityType];
  
  return [
    {
      name: 'Maladie-Maternité',
      rate: rates.maladie * 100,
      amount: revenue * rates.maladie,
      description: 'Assurance maladie et maternité'
    },
    {
      name: 'Retraite de base',
      rate: rates.retraite_base * 100,
      amount: revenue * rates.retraite_base,
      description: 'Retraite de base du régime général'
    },
    {
      name: 'Retraite complémentaire',
      rate: rates.retraite_complementaire * 100,
      amount: revenue * rates.retraite_complementaire,
      description: 'Retraite complémentaire obligatoire'
    },
    {
      name: 'Invalidité-Décès',
      rate: rates.invalidite_deces * 100,
      amount: revenue * rates.invalidite_deces,
      description: 'Assurance invalidité et décès'
    },
    {
      name: 'CSG-CRDS',
      rate: rates.csg_crds * 100,
      amount: revenue * rates.csg_crds,
      description: 'Contribution sociale généralisée et CRDS'
    },
    {
      name: 'Formation professionnelle',
      rate: rates.formation_professionnelle * 100,
      amount: revenue * rates.formation_professionnelle,
      description: 'Contribution à la formation professionnelle'
    }
  ];
};

// Vérifier l'éligibilité ACRE (Aide aux Créateurs et Repreneurs d'Entreprise)
export const checkACREEligibility = (
  creationDate: Date,
  hasReceivedACRE: boolean
): { eligible: boolean; expiryDate?: Date; reducedRates?: SocialContributionRates } => {
  const today = new Date();
  const threeYearsAfterCreation = new Date(creationDate);
  threeYearsAfterCreation.setFullYear(threeYearsAfterCreation.getFullYear() + 3);
  
  const eligible = !hasReceivedACRE && today <= threeYearsAfterCreation;
  
  if (eligible) {
    // Taux réduits ACRE (exemple pour services)
    const reducedRates: SocialContributionRates = {
      maladie: 0.0325, // 50% de réduction la première année
      retraite_base: 0.05875,
      retraite_complementaire: 0.0035,
      invalidite_deces: 0.0024,
      csg_crds: 0.0131,
      formation_professionnelle: 0.00125,
      total: 0.1105 // environ 11.05%
    };
    
    return {
      eligible: true,
      expiryDate: threeYearsAfterCreation,
      reducedRates
    };
  }
  
  return { eligible: false };
};

// Calculer les cotisations avec ACRE
export const calculateContributionsWithACRE = (
  revenue: number,
  activityType: 'services' | 'commerce' | 'liberal' = 'services',
  acreYear: 1 | 2 | 3 = 1
): SocialContributionCalculation => {
  let reductionRate = 0;
  
  switch (acreYear) {
    case 1:
      reductionRate = 0.75; // 75% de réduction
      break;
    case 2:
      reductionRate = 0.50; // 50% de réduction
      break;
    case 3:
      reductionRate = 0.25; // 25% de réduction
      break;
  }
  
  const standardCalculation = calculateSocialContributions(revenue, activityType);
  
  // Appliquer la réduction ACRE
  const reducedContributions = {
    maladie: standardCalculation.contributions.maladie * (1 - reductionRate),
    retraite_base: standardCalculation.contributions.retraite_base * (1 - reductionRate),
    retraite_complementaire: standardCalculation.contributions.retraite_complementaire * (1 - reductionRate),
    invalidite_deces: standardCalculation.contributions.invalidite_deces * (1 - reductionRate),
    csg_crds: standardCalculation.contributions.csg_crds * (1 - reductionRate),
    formation_professionnelle: standardCalculation.contributions.formation_professionnelle * (1 - reductionRate),
    total: standardCalculation.contributions.total * (1 - reductionRate)
  };
  
  return {
    ...standardCalculation,
    contributions: reducedContributions,
    net_revenue: revenue - reducedContributions.total
  };
};
