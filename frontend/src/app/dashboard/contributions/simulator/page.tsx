'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateSocialContributions,
  calculateContributionsWithACRE,
  getContributionBreakdown,
  simulateContributions,
  checkACREEligibility,
  SOCIAL_CONTRIBUTION_RATES_2024,
  FRANCHISE_THRESHOLDS_2024
} from '@/lib/socialContributions';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import {
  CalculatorIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CurrencyEuroIcon,
  ArrowLeftIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ContributionsSimulatorPage() {
  const { user, business } = useAuth();
  const router = useRouter();

  const [simulationData, setSimulationData] = useState({
    targetRevenue: 30000,
    activityType: 'services' as 'services' | 'commerce' | 'liberal',
    hasACRE: false,
    acreYear: 1 as 1 | 2 | 3,
    businessCreationDate: new Date().toISOString().split('T')[0]
  });

  const [results, setResults] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const runSimulation = () => {
    const standardCalculation = calculateSocialContributions(
      simulationData.targetRevenue,
      simulationData.activityType
    );

    let acreCalculation = null;
    if (simulationData.hasACRE) {
      acreCalculation = calculateContributionsWithACRE(
        simulationData.targetRevenue,
        simulationData.activityType,
        simulationData.acreYear
      );
    }

    const breakdown = getContributionBreakdown(
      simulationData.targetRevenue,
      simulationData.activityType
    );

    setResults({
      standard: standardCalculation,
      acre: acreCalculation,
      breakdown
    });

    // Generate comparison data for chart
    const revenueTargets = Array.from({ length: 10 }, (_, i) => (i + 1) * 10000);
    const comparison = revenueTargets.map(revenue => {
      const standard = calculateSocialContributions(revenue, simulationData.activityType);
      const acre = simulationData.hasACRE 
        ? calculateContributionsWithACRE(revenue, simulationData.activityType, simulationData.acreYear)
        : null;
      
      return {
        revenue,
        standard: standard.contributions.total,
        acre: acre?.contributions.total || 0,
        standardNet: standard.net_revenue,
        acreNet: acre?.net_revenue || 0
      };
    });

    setComparisonData(comparison);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'services': return 'Services';
      case 'commerce': return 'Commerce';
      case 'liberal': return 'Profession libérale';
      default: return type;
    }
  };

  const threshold = FRANCHISE_THRESHOLDS_2024[simulationData.activityType];
  const rates = SOCIAL_CONTRIBUTION_RATES_2024[simulationData.activityType];
  
  const acreEligibility = checkACREEligibility(
    new Date(simulationData.businessCreationDate),
    false // assuming user hasn't received ACRE yet
  );

  // Chart data
  const contributionsChartData = {
    labels: comparisonData.map(d => `${d.revenue / 1000}k€`),
    datasets: [
      {
        label: 'Cotisations standard',
        data: comparisonData.map(d => d.standard),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1
      },
      ...(simulationData.hasACRE ? [{
        label: 'Cotisations avec ACRE',
        data: comparisonData.map(d => d.acre),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
      }] : [])
    ]
  };

  const netRevenueChartData = {
    labels: comparisonData.map(d => `${d.revenue / 1000}k€`),
    datasets: [
      {
        label: 'Revenu net standard',
        data: comparisonData.map(d => d.standardNet),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      },
      ...(simulationData.hasACRE ? [{
        label: 'Revenu net avec ACRE',
        data: comparisonData.map(d => d.acreNet),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1
      }] : [])
    ]
  };

  const pieChartData = results?.breakdown ? {
    labels: results.breakdown.map((item: any) => item.name),
    datasets: [
      {
        data: results.breakdown.map((item: any) => item.amount),
        backgroundColor: [
          '#ef4444',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899'
        ],
        borderWidth: 1
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution des cotisations selon le CA'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-secondary-600 hover:text-secondary-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Simulateur de cotisations sociales
          </h1>
          <p className="text-secondary-600">
            Calculez vos cotisations selon différents scénarios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Parameters */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Paramètres de simulation
              </h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="form-label">Chiffre d'affaires cible</label>
                <div className="relative">
                  <input
                    type="number"
                    value={simulationData.targetRevenue}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      targetRevenue: parseInt(e.target.value) || 0
                    }))}
                    className="form-input pr-8"
                    placeholder="30000"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label">Type d'activité</label>
                <select
                  value={simulationData.activityType}
                  onChange={(e) => setSimulationData(prev => ({
                    ...prev,
                    activityType: e.target.value as any
                  }))}
                  className="form-input"
                >
                  <option value="services">Services</option>
                  <option value="commerce">Commerce</option>
                  <option value="liberal">Profession libérale</option>
                </select>
              </div>

              <div>
                <label className="form-label">Date de création</label>
                <input
                  type="date"
                  value={simulationData.businessCreationDate}
                  onChange={(e) => setSimulationData(prev => ({
                    ...prev,
                    businessCreationDate: e.target.value
                  }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={simulationData.hasACRE}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      hasACRE: e.target.checked
                    }))}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-secondary-700">
                    Bénéficier de l'ACRE
                  </span>
                </label>
              </div>

              {simulationData.hasACRE && (
                <div>
                  <label className="form-label">Année ACRE</label>
                  <select
                    value={simulationData.acreYear}
                    onChange={(e) => setSimulationData(prev => ({
                      ...prev,
                      acreYear: parseInt(e.target.value) as any
                    }))}
                    className="form-input"
                  >
                    <option value={1}>1ère année (75% réduction)</option>
                    <option value={2}>2ème année (50% réduction)</option>
                    <option value={3}>3ème année (25% réduction)</option>
                  </select>
                </div>
              )}

              <button
                onClick={runSimulation}
                className="btn-primary w-full"
              >
                <CalculatorIcon className="w-4 h-4 mr-2" />
                Calculer
              </button>
            </div>
          </div>

          {/* ACRE Eligibility Info */}
          {acreEligibility.eligible && (
            <div className="card mt-4">
              <div className="card-body">
                <div className="flex items-center mb-3">
                  <ShieldCheckIcon className="w-5 h-5 text-success-600 mr-2" />
                  <h4 className="font-medium text-success-900">
                    Éligible à l'ACRE
                  </h4>
                </div>
                <p className="text-sm text-success-700">
                  Vous pouvez bénéficier de l'ACRE jusqu'au {acreEligibility.expiryDate?.toLocaleDateString('fr-FR')}.
                </p>
              </div>
            </div>
          )}

          {/* Threshold Warning */}
          {simulationData.targetRevenue > threshold && (
            <div className="card mt-4">
              <div className="card-body">
                <div className="flex items-center mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-error-600 mr-2" />
                  <h4 className="font-medium text-error-900">
                    Seuil de franchise dépassé
                  </h4>
                </div>
                <p className="text-sm text-error-700">
                  Le seuil de {formatCurrency(threshold)} est dépassé. Vous devrez passer au régime réel.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {results ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-medium text-secondary-900">
                      Calcul standard
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">CA annuel :</span>
                        <span className="font-medium">{formatCurrency(results.standard.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Cotisations :</span>
                        <span className="font-medium text-error-600">
                          {formatCurrency(results.standard.contributions.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Taux :</span>
                        <span className="font-medium">
                          {(results.standard.rates.total * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-secondary-900 font-semibold">Revenu net :</span>
                        <span className="font-bold text-success-600">
                          {formatCurrency(results.standard.net_revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {results.acre && (
                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-medium text-secondary-900">
                        Avec ACRE (année {simulationData.acreYear})
                      </h4>
                    </div>
                    <div className="card-body">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-secondary-600">CA annuel :</span>
                          <span className="font-medium">{formatCurrency(results.acre.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-600">Cotisations :</span>
                          <span className="font-medium text-error-600">
                            {formatCurrency(results.acre.contributions.total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-600">Économie :</span>
                          <span className="font-medium text-success-600">
                            {formatCurrency(results.standard.contributions.total - results.acre.contributions.total)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-secondary-900 font-semibold">Revenu net :</span>
                          <span className="font-bold text-success-600">
                            {formatCurrency(results.acre.net_revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Breakdown Chart */}
              {pieChartData && (
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-medium text-secondary-900">
                      Répartition des cotisations
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="h-64">
                      <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Evolution Charts */}
              {comparisonData.length > 0 && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-medium text-secondary-900">
                        Évolution des cotisations
                      </h4>
                    </div>
                    <div className="card-body">
                      <div className="h-64">
                        <Line data={contributionsChartData} options={chartOptions} />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-medium text-secondary-900">
                        Évolution du revenu net
                      </h4>
                    </div>
                    <div className="card-body">
                      <div className="h-64">
                        <Line data={netRevenueChartData} options={chartOptions} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Detailed Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h4 className="font-medium text-secondary-900">
                    Détail des cotisations
                  </h4>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {results.breakdown.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <div>
                          <h5 className="font-medium text-secondary-900">{item.name}</h5>
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
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="text-center py-12">
                  <CalculatorIcon className="mx-auto w-12 h-12 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">
                    Paramétrez votre simulation
                  </h3>
                  <p className="mt-1 text-sm text-secondary-500">
                    Renseignez vos paramètres et cliquez sur "Calculer" pour voir les résultats.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <LightBulbIcon className="w-5 h-5 text-warning-600 mr-2" />
            <h3 className="text-lg font-semibold text-secondary-900">
              Conseils d'optimisation
            </h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">ACRE</h4>
              <p className="text-sm text-secondary-600">
                L'ACRE permet de réduire vos cotisations de 75% la première année, 50% la deuxième et 25% la troisième.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Seuils de franchise</h4>
              <p className="text-sm text-secondary-600">
                Surveillez les seuils : {formatCurrency(FRANCHISE_THRESHOLDS_2024.services)} pour les services, 
                {formatCurrency(FRANCHISE_THRESHOLDS_2024.commerce)} pour le commerce.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Déclarations</h4>
              <p className="text-sm text-secondary-600">
                Déclarez vos revenus mensuellement ou trimestriellement selon votre choix.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Charges déductibles</h4>
              <p className="text-sm text-secondary-600">
                En auto-entreprise, vous ne pouvez pas déduire de charges, mais vous bénéficiez d'un abattement forfaitaire.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
