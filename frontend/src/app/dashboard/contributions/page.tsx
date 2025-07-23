'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  calculateAnnualContributions,
  calculateQuarterlyContributions,
  getQuarterlyDeclarations,
  getOverdueDeclarations,
  getUpcomingDeadlines,
  submitQuarterlyDeclaration,
  payQuarterlyDeclaration,
  simulateContributions,
  getContributionBreakdown,
  SocialContributionCalculation,
  QuarterlyDeclaration,
  SOCIAL_CONTRIBUTION_RATES_2024,
  FRANCHISE_THRESHOLDS_2024
} from '@/lib/socialContributions';
import { getAccountingSummary } from '@/lib/accounting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SocialContributionsPage() {
  const { user, business } = useAuth();
  const { canAccessFeature } = useSubscription();
  const router = useRouter();

  const [annualCalculation, setAnnualCalculation] = useState<SocialContributionCalculation | null>(null);
  const [quarterlyDeclarations, setQuarterlyDeclarations] = useState<QuarterlyDeclaration[]>([]);
  const [overdueDeclarations, setOverdueDeclarations] = useState<QuarterlyDeclaration[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<QuarterlyDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activityType, setActivityType] = useState<'services' | 'commerce' | 'liberal'>('services');
  const [simulationResults, setSimulationResults] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedYear, activityType]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [
        annualCalc,
        declarations,
        overdue,
        upcoming
      ] = await Promise.all([
        calculateAnnualContributions(user.id, selectedYear, activityType),
        getQuarterlyDeclarations(user.id, selectedYear),
        getOverdueDeclarations(user.id),
        getUpcomingDeadlines(user.id, 30)
      ]);

      setAnnualCalculation(annualCalc);
      setQuarterlyDeclarations(declarations);
      setOverdueDeclarations(overdue);
      setUpcomingDeadlines(upcoming);

      // Generate simulation data
      const revenueTargets = [10000, 20000, 30000, 40000, 50000, 60000, 70000];
      const simulation = simulateContributions(revenueTargets, activityType);
      setSimulationResults(simulation);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeclaration = async (declarationId: string) => {
    try {
      await submitQuarterlyDeclaration(declarationId);
      toast.success('Déclaration soumise avec succès');
      loadData();
    } catch (error) {
      console.error('Error submitting declaration:', error);
      toast.error('Erreur lors de la soumission');
    }
  };

  const handlePayDeclaration = async (declarationId: string) => {
    try {
      await payQuarterlyDeclaration(declarationId);
      toast.success('Paiement enregistré avec succès');
      loadData();
    } catch (error) {
      console.error('Error paying declaration:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
            <DocumentTextIcon className="w-3 h-3 mr-1" />
            Brouillon
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Soumise
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Payée
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getQuarterLabel = (quarter: number) => {
    return `T${quarter} ${selectedYear}`;
  };

  const contributionBreakdown = annualCalculation ? getContributionBreakdown(annualCalculation.revenue, activityType) : [];
  const rates = SOCIAL_CONTRIBUTION_RATES_2024[activityType];
  const threshold = FRANCHISE_THRESHOLDS_2024[activityType];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Cotisations sociales</h1>
          <p className="text-secondary-600">
            Calculez et gérez vos cotisations URSSAF
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/dashboard/contributions/simulator')}
            className="btn-outline"
          >
            <CalculatorIcon className="w-4 h-4 mr-2" />
            Simulateur
          </button>
          <button
            onClick={() => router.push('/dashboard/contributions/calendar')}
            className="btn-outline"
          >
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Calendrier fiscal
          </button>
        </div>
      </div>

      {/* Activity Type and Year Selection */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Type d'activité</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                className="form-input"
              >
                <option value="services">Services</option>
                <option value="commerce">Commerce</option>
                <option value="liberal">Profession libérale</option>
              </select>
            </div>
            <div>
              <label className="form-label">Année</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="form-input"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="form-label">Taux global</label>
              <div className="form-input bg-secondary-50 text-secondary-700 font-medium">
                {(rates.total * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueDeclarations.length > 0 && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-error-600 mr-2" />
            <div>
              <h3 className="font-medium text-error-900">
                Déclarations en retard
              </h3>
              <p className="text-error-700">
                Vous avez {overdueDeclarations.length} déclaration(s) en retard.
              </p>
            </div>
          </div>
        </div>
      )}

      {upcomingDeadlines.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 text-warning-600 mr-2" />
            <div>
              <h3 className="font-medium text-warning-900">
                Échéances à venir
              </h3>
              <p className="text-warning-700">
                {upcomingDeadlines.length} déclaration(s) à soumettre dans les 30 prochains jours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Annual Summary */}
      {annualCalculation && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CurrencyEuroIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">CA annuel</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualCalculation.revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-error-100 rounded-lg">
                  <BanknotesIcon className="w-5 h-5 text-error-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Cotisations</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualCalculation.contributions.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Revenu net</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualCalculation.net_revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Taux effectif</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {((annualCalculation.contributions.total / annualCalculation.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Breakdown */}
      {contributionBreakdown.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Détail des cotisations
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {contributionBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-secondary-900">{item.name}</h4>
                    <p className="text-sm text-secondary-600">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-secondary-900">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-sm text-secondary-600">
                      {item.rate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quarterly Declarations */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Déclarations trimestrielles {selectedYear}
          </h3>
        </div>
        <div className="card-body">
          {quarterlyDeclarations.length > 0 ? (
            <div className="space-y-4">
              {quarterlyDeclarations.map((declaration) => (
                <div key={declaration.id} className="border border-secondary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-secondary-900">
                        {getQuarterLabel(declaration.quarter)}
                      </h4>
                      <p className="text-sm text-secondary-600">
                        Échéance : {format(new Date(declaration.due_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-secondary-900">
                        {formatCurrency(declaration.contributions)}
                      </p>
                      <p className="text-sm text-secondary-600">
                        CA : {formatCurrency(declaration.revenue)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(declaration.status)}
                      <div className="flex space-x-2">
                        {declaration.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitDeclaration(declaration.id)}
                            className="btn-outline text-sm"
                          >
                            Soumettre
                          </button>
                        )}
                        {declaration.status === 'submitted' && (
                          <button
                            onClick={() => handlePayDeclaration(declaration.id)}
                            className="btn-primary text-sm"
                          >
                            Marquer payé
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDaysIcon className="mx-auto w-12 h-12 text-secondary-400" />
              <h3 className="mt-2 text-sm font-medium text-secondary-900">
                Aucune déclaration
              </h3>
              <p className="mt-1 text-sm text-secondary-500">
                Les déclarations seront générées automatiquement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResults.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Simulation des cotisations
            </h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-2 text-sm font-medium text-secondary-900">
                      Chiffre d'affaires
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-secondary-900">
                      Cotisations
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-secondary-900">
                      Revenu net
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-secondary-900">
                      Taux effectif
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResults.map((result, index) => (
                    <tr key={index} className="border-b border-secondary-100">
                      <td className="py-2 text-sm text-secondary-900">
                        {formatCurrency(result.revenue)}
                      </td>
                      <td className="py-2 text-sm text-error-600 text-right">
                        {formatCurrency(result.contributions)}
                      </td>
                      <td className="py-2 text-sm text-success-600 text-right">
                        {formatCurrency(result.net)}
                      </td>
                      <td className="py-2 text-sm text-secondary-900 text-right">
                        {result.rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Franchise Threshold Warning */}
      {annualCalculation && annualCalculation.revenue > threshold * 0.8 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center">
            <InformationCircleIcon className="w-5 h-5 text-warning-600 mr-2" />
            <div>
              <h3 className="font-medium text-warning-900">
                Attention au seuil de franchise
              </h3>
              <p className="text-warning-700">
                Vous approchez du seuil de {formatCurrency(threshold)} pour {activityType}.
                Au-delà, vous devrez basculer vers un régime réel.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
