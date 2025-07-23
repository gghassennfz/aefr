import { supabase } from './supabase';
import { getAccountingSummary } from './accounting';
import { calculateSocialContributions } from './socialContributions';
import { Database } from './database.types';

type TaxDeclaration = Database['public']['Tables']['tax_declarations']['Row'];
type TaxDeclarationInsert = Database['public']['Tables']['tax_declarations']['Insert'];

export interface TaxDeclarationData {
  user_id: string;
  year: number;
  declaration_type: 'urssaf' | 'income_tax' | 'vat' | 'cfe';
  period_start: string;
  period_end: string;
  revenue: number;
  expenses: number;
  net_result: number;
  tax_amount: number;
  status: 'draft' | 'submitted' | 'paid';
  due_date: string;
  form_data?: any;
  submitted_at?: string;
  paid_at?: string;
}

export interface URSSAFDeclarationData {
  revenue: number;
  activity_type: 'services' | 'commerce' | 'liberal';
  contributions: {
    maladie: number;
    retraite_base: number;
    retraite_complementaire: number;
    invalidite_deces: number;
    csg_crds: number;
    formation_professionnelle: number;
    total: number;
  };
  declaration_month: string;
  is_acre: boolean;
  acre_year?: number;
}

export interface IncomeTaxData {
  revenue: number;
  expenses: number;
  net_result: number;
  activity_type: 'services' | 'commerce' | 'liberal';
  regime: 'micro' | 'reel';
  abattement: number;
  taxable_income: number;
  tax_brackets: Array<{
    min: number;
    max: number;
    rate: number;
    amount: number;
  }>;
  total_tax: number;
}

export interface CFEData {
  revenue: number;
  activity_type: 'services' | 'commerce' | 'liberal';
  commune: string;
  surface_m2?: number;
  is_exempt: boolean;
  exemption_reason?: string;
  base_amount: number;
  tax_rate: number;
  total_cfe: number;
}

// Taux d'abattement forfaitaire pour les micro-entreprises
export const MICRO_ABATTEMENT_RATES = {
  services: 0.50, // 50% pour les services
  commerce: 0.29, // 29% pour le commerce
  liberal: 0.34   // 34% pour les professions libérales
};

// Barème de l'impôt sur le revenu 2024
export const INCOME_TAX_BRACKETS_2024 = [
  { min: 0, max: 11294, rate: 0.00 },
  { min: 11294, max: 28797, rate: 0.11 },
  { min: 28797, max: 82341, rate: 0.30 },
  { min: 82341, max: 177106, rate: 0.41 },
  { min: 177106, max: Infinity, rate: 0.45 }
];

// Seuils CFE 2024
export const CFE_THRESHOLDS = {
  exemption_revenue: 5000, // Exonération si CA < 5000€
  minimum_base: 227, // Base minimum CFE
  maximum_base: 7000 // Base maximum CFE
};

// Créer une déclaration fiscale
export const createTaxDeclaration = async (data: TaxDeclarationData): Promise<string> => {
  const { data: declaration, error } = await supabase
    .from('tax_declarations')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return declaration.id;
};

// Mettre à jour une déclaration fiscale
export const updateTaxDeclaration = async (
  declarationId: string, 
  data: Partial<TaxDeclarationData>
): Promise<void> => {
  const { error } = await supabase
    .from('tax_declarations')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', declarationId);

  if (error) throw error;
};

// Récupérer les déclarations d'un utilisateur
export const getUserTaxDeclarations = async (
  userId: string,
  filters?: {
    year?: number;
    type?: string;
    status?: string;
  }
): Promise<TaxDeclaration[]> => {
  let query = supabase
    .from('tax_declarations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.year) {
    query = query.eq('year', filters.year);
  }

  if (filters?.type) {
    query = query.eq('declaration_type', filters.type);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
};

// Calculer l'impôt sur le revenu (micro-entreprise)
export const calculateIncomeTax = (
  revenue: number,
  activityType: 'services' | 'commerce' | 'liberal',
  parts: number = 1
): IncomeTaxData => {
  const abattementRate = MICRO_ABATTEMENT_RATES[activityType];
  const abattement = revenue * abattementRate;
  const taxableIncome = (revenue - abattement) / parts; // Quotient familial
  
  const taxBrackets = [];
  let totalTax = 0;
  
  for (const bracket of INCOME_TAX_BRACKETS_2024) {
    if (taxableIncome <= bracket.min) break;
    
    const taxableAmount = Math.min(taxableIncome, bracket.max) - bracket.min;
    const taxAmount = taxableAmount * bracket.rate;
    
    taxBrackets.push({
      min: bracket.min,
      max: bracket.max,
      rate: bracket.rate,
      amount: taxAmount
    });
    
    totalTax += taxAmount;
  }
  
  return {
    revenue,
    expenses: 0, // Pas de charges déductibles en micro
    net_result: revenue,
    activity_type: activityType,
    regime: 'micro',
    abattement,
    taxable_income: taxableIncome,
    tax_brackets: taxBrackets,
    total_tax: totalTax * parts // Remultiplier par le nombre de parts
  };
};

// Calculer la CFE (Cotisation Foncière des Entreprises)
export const calculateCFE = (
  revenue: number,
  activityType: 'services' | 'commerce' | 'liberal',
  commune: string,
  surfaceM2?: number
): CFEData => {
  const isExempt = revenue < CFE_THRESHOLDS.exemption_revenue;
  
  if (isExempt) {
    return {
      revenue,
      activity_type: activityType,
      commune,
      surface_m2: surfaceM2,
      is_exempt: true,
      exemption_reason: 'Chiffre d\'affaires inférieur à 5 000€',
      base_amount: 0,
      tax_rate: 0,
      total_cfe: 0
    };
  }
  
  // Base CFE selon la surface ou le CA
  let baseAmount = CFE_THRESHOLDS.minimum_base;
  
  if (surfaceM2) {
    // Calcul selon la surface (simplifié)
    baseAmount = Math.min(surfaceM2 * 16, CFE_THRESHOLDS.maximum_base);
  } else {
    // Calcul selon le CA (barème simplifié)
    if (revenue > 32600) {
      baseAmount = Math.min(revenue * 0.005, CFE_THRESHOLDS.maximum_base);
    }
  }
  
  // Taux CFE moyen (varie selon la commune)
  const taxRate = 0.25; // 25% en moyenne
  const totalCFE = baseAmount * taxRate;
  
  return {
    revenue,
    activity_type: activityType,
    commune,
    surface_m2: surfaceM2,
    is_exempt: false,
    base_amount: baseAmount,
    tax_rate: taxRate,
    total_cfe: totalCFE
  };
};

// Préparer une déclaration URSSAF
export const prepareURSSAFDeclaration = async (
  userId: string,
  year: number,
  month: number,
  activityType: 'services' | 'commerce' | 'liberal',
  isACRE: boolean = false,
  acreYear?: number
): Promise<URSSAFDeclarationData> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const summary = await getAccountingSummary(
    userId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
  
  const contributions = calculateSocialContributions(
    summary.totalIncome,
    activityType,
    year
  );
  
  return {
    revenue: summary.totalIncome,
    activity_type: activityType,
    contributions: contributions.contributions,
    declaration_month: `${year}-${month.toString().padStart(2, '0')}`,
    is_acre: isACRE,
    acre_year: acreYear
  };
};

// Générer le fichier de déclaration URSSAF (format DSN simplifié)
export const generateURSSAFFile = (data: URSSAFDeclarationData): string => {
  const lines = [
    `URSSAF_DECLARATION_${data.declaration_month}`,
    `TYPE_ACTIVITE:${data.activity_type}`,
    `CHIFFRE_AFFAIRES:${data.revenue.toFixed(2)}`,
    `COTISATION_MALADIE:${data.contributions.maladie.toFixed(2)}`,
    `COTISATION_RETRAITE:${data.contributions.retraite_base.toFixed(2)}`,
    `COTISATION_RETRAITE_COMP:${data.contributions.retraite_complementaire.toFixed(2)}`,
    `COTISATION_INVALIDITE:${data.contributions.invalidite_deces.toFixed(2)}`,
    `CSG_CRDS:${data.contributions.csg_crds.toFixed(2)}`,
    `FORMATION_PROF:${data.contributions.formation_professionnelle.toFixed(2)}`,
    `TOTAL_COTISATIONS:${data.contributions.total.toFixed(2)}`,
    `ACRE:${data.is_acre ? 'OUI' : 'NON'}`,
    ...(data.is_acre && data.acre_year ? [`ACRE_ANNEE:${data.acre_year}`] : []),
    `DATE_GENERATION:${new Date().toISOString()}`
  ];
  
  return lines.join('\n');
};

// Générer le formulaire de déclaration de revenus
export const generateIncomeTaxForm = (data: IncomeTaxData): any => {
  return {
    formulaire: '2042-C-PRO',
    regime: 'micro-entreprise',
    activite: data.activity_type,
    chiffre_affaires: data.revenue,
    abattement_forfaitaire: data.abattement,
    revenus_imposables: data.taxable_income,
    bareme_application: data.tax_brackets,
    impot_calcule: data.total_tax,
    date_generation: new Date().toISOString()
  };
};

// Récupérer les déclarations en retard
export const getOverdueTaxDeclarations = async (userId: string): Promise<TaxDeclaration[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .eq('user_id', userId)
    .lt('due_date', today)
    .neq('status', 'paid')
    .order('due_date');

  if (error) throw error;
  return data || [];
};

// Récupérer les prochaines échéances fiscales
export const getUpcomingTaxDeadlines = async (userId: string, days: number = 30): Promise<TaxDeclaration[]> => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .neq('status', 'paid')
    .order('due_date');

  if (error) throw error;
  return data || [];
};

// Marquer une déclaration comme soumise
export const submitTaxDeclaration = async (declarationId: string): Promise<void> => {
  const { error } = await supabase
    .from('tax_declarations')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
    .eq('id', declarationId);

  if (error) throw error;
};

// Marquer une déclaration comme payée
export const payTaxDeclaration = async (declarationId: string): Promise<void> => {
  const { error } = await supabase
    .from('tax_declarations')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('id', declarationId);

  if (error) throw error;
};

// Calendrier fiscal français pour auto-entrepreneurs
export const TAX_CALENDAR_2024 = {
  // Déclarations mensuelles URSSAF (si option choisie)
  monthly_urssaf: [
    { month: 1, due_date: '2024-01-31', description: 'Déclaration URSSAF janvier' },
    { month: 2, due_date: '2024-02-29', description: 'Déclaration URSSAF février' },
    { month: 3, due_date: '2024-03-31', description: 'Déclaration URSSAF mars' },
    { month: 4, due_date: '2024-04-30', description: 'Déclaration URSSAF avril' },
    { month: 5, due_date: '2024-05-31', description: 'Déclaration URSSAF mai' },
    { month: 6, due_date: '2024-06-30', description: 'Déclaration URSSAF juin' },
    { month: 7, due_date: '2024-07-31', description: 'Déclaration URSSAF juillet' },
    { month: 8, due_date: '2024-08-31', description: 'Déclaration URSSAF août' },
    { month: 9, due_date: '2024-09-30', description: 'Déclaration URSSAF septembre' },
    { month: 10, due_date: '2024-10-31', description: 'Déclaration URSSAF octobre' },
    { month: 11, due_date: '2024-11-30', description: 'Déclaration URSSAF novembre' },
    { month: 12, due_date: '2024-12-31', description: 'Déclaration URSSAF décembre' }
  ],
  
  // Déclarations trimestrielles URSSAF (option par défaut)
  quarterly_urssaf: [
    { quarter: 1, due_date: '2024-04-30', description: 'Déclaration URSSAF T1' },
    { quarter: 2, due_date: '2024-07-31', description: 'Déclaration URSSAF T2' },
    { quarter: 3, due_date: '2024-10-31', description: 'Déclaration URSSAF T3' },
    { quarter: 4, due_date: '2025-01-31', description: 'Déclaration URSSAF T4' }
  ],
  
  // Déclarations annuelles
  annual_declarations: [
    { 
      type: 'income_tax', 
      due_date: '2024-05-23', 
      description: 'Déclaration de revenus 2023',
      forms: ['2042', '2042-C-PRO']
    },
    { 
      type: 'cfe', 
      due_date: '2024-12-15', 
      description: 'Cotisation Foncière des Entreprises',
      forms: ['CFE']
    }
  ],
  
  // Autres échéances importantes
  other_deadlines: [
    { 
      type: 'tva', 
      due_date: '2024-01-19', 
      description: 'TVA annuelle (si applicable)',
      condition: 'CA > 91 900€'
    },
    { 
      type: 'stage_spi', 
      due_date: '2024-12-31', 
      description: 'Stage SPI obligatoire',
      condition: 'Première inscription RM/RCS'
    }
  ]
};

// Générer automatiquement les déclarations pour l'année
export const generateAnnualTaxDeclarations = async (
  userId: string,
  year: number,
  activityType: 'services' | 'commerce' | 'liberal',
  declarationFrequency: 'monthly' | 'quarterly' = 'quarterly'
): Promise<void> => {
  const declarations = [];
  
  // Déclarations URSSAF
  if (declarationFrequency === 'monthly') {
    for (const monthData of TAX_CALENDAR_2024.monthly_urssaf) {
      const urssafData = await prepareURSSAFDeclaration(
        userId,
        year,
        monthData.month,
        activityType
      );
      
      declarations.push({
        user_id: userId,
        year,
        declaration_type: 'urssaf',
        period_start: `${year}-${monthData.month.toString().padStart(2, '0')}-01`,
        period_end: new Date(year, monthData.month, 0).toISOString().split('T')[0],
        revenue: urssafData.revenue,
        expenses: 0,
        net_result: urssafData.revenue,
        tax_amount: urssafData.contributions.total,
        status: 'draft',
        due_date: monthData.due_date,
        form_data: urssafData
      });
    }
  } else {
    for (const quarterData of TAX_CALENDAR_2024.quarterly_urssaf) {
      const startMonth = (quarterData.quarter - 1) * 3 + 1;
      const endMonth = quarterData.quarter * 3;
      
      const summary = await getAccountingSummary(
        userId,
        `${year}-${startMonth.toString().padStart(2, '0')}-01`,
        new Date(year, endMonth, 0).toISOString().split('T')[0]
      );
      
      const contributions = calculateSocialContributions(summary.totalIncome, activityType, year);
      
      declarations.push({
        user_id: userId,
        year,
        declaration_type: 'urssaf',
        period_start: `${year}-${startMonth.toString().padStart(2, '0')}-01`,
        period_end: new Date(year, endMonth, 0).toISOString().split('T')[0],
        revenue: summary.totalIncome,
        expenses: 0,
        net_result: summary.totalIncome,
        tax_amount: contributions.contributions.total,
        status: 'draft',
        due_date: quarterData.due_date,
        form_data: contributions
      });
    }
  }
  
  // Déclaration de revenus annuelle
  const annualSummary = await getAccountingSummary(userId, `${year}-01-01`, `${year}-12-31`);
  const incomeTax = calculateIncomeTax(annualSummary.totalIncome, activityType);
  
  declarations.push({
    user_id: userId,
    year,
    declaration_type: 'income_tax',
    period_start: `${year}-01-01`,
    period_end: `${year}-12-31`,
    revenue: annualSummary.totalIncome,
    expenses: 0,
    net_result: annualSummary.totalIncome,
    tax_amount: incomeTax.total_tax,
    status: 'draft',
    due_date: `${year + 1}-05-31`,
    form_data: incomeTax
  });
  
  // CFE
  const cfeData = calculateCFE(annualSummary.totalIncome, activityType, 'Paris'); // Commune par défaut
  
  declarations.push({
    user_id: userId,
    year,
    declaration_type: 'cfe',
    period_start: `${year}-01-01`,
    period_end: `${year}-12-31`,
    revenue: annualSummary.totalIncome,
    expenses: 0,
    net_result: annualSummary.totalIncome,
    tax_amount: cfeData.total_cfe,
    status: 'draft',
    due_date: `${year}-12-15`,
    form_data: cfeData
  });
  
  // Créer toutes les déclarations
  for (const declaration of declarations) {
    await createTaxDeclaration(declaration);
  }
};

// Résumé fiscal annuel
export const getAnnualTaxSummary = async (userId: string, year: number) => {
  const declarations = await getUserTaxDeclarations(userId, { year });
  
  const summary = {
    total_revenue: 0,
    total_tax: 0,
    urssaf_contributions: 0,
    income_tax: 0,
    cfe_tax: 0,
    declarations_count: declarations.length,
    pending_declarations: declarations.filter(d => d.status === 'draft').length,
    submitted_declarations: declarations.filter(d => d.status === 'submitted').length,
    paid_declarations: declarations.filter(d => d.status === 'paid').length
  };
  
  declarations.forEach(declaration => {
    summary.total_revenue += declaration.revenue;
    summary.total_tax += declaration.tax_amount;
    
    switch (declaration.declaration_type) {
      case 'urssaf':
        summary.urssaf_contributions += declaration.tax_amount;
        break;
      case 'income_tax':
        summary.income_tax += declaration.tax_amount;
        break;
      case 'cfe':
        summary.cfe_tax += declaration.tax_amount;
        break;
    }
  });
  
  return summary;
};
