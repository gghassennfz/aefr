'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  getUserTaxDeclarations,
  getOverdueTaxDeclarations,
  getUpcomingTaxDeadlines,
  getAnnualTaxSummary,
  submitTaxDeclaration,
  payTaxDeclaration,
  generateAnnualTaxDeclarations,
  generateURSSAFFile,
  generateIncomeTaxForm,
  TAX_CALENDAR_2024,
  calculateIncomeTax,
  calculateCFE
} from '@/lib/taxDeclarations';
import { Database } from '@/lib/database.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  InformationCircleIcon,
  PlayIcon,
  PaperAirplaneIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type TaxDeclaration = Database['public']['Tables']['tax_declarations']['Row'];

export default function TaxDeclarationsPage() {
  const { user, business } = useAuth();
  const { canAccessFeature } = useSubscription();
  const router = useRouter();

  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [overdueDeclarations, setOverdueDeclarations] = useState<TaxDeclaration[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<TaxDeclaration[]>([]);
  const [annualSummary, setAnnualSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [generatingDeclarations, setGeneratingDeclarations] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedYear, selectedType]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [
        userDeclarations,
        overdue,
        upcoming,
        summary
      ] = await Promise.all([
        getUserTaxDeclarations(user.id, {
          year: selectedYear,
          type: selectedType !== 'all' ? selectedType : undefined
        }),
        getOverdueTaxDeclarations(user.id),
        getUpcomingTaxDeadlines(user.id, 45),
        getAnnualTaxSummary(user.id, selectedYear)
      ]);

      setDeclarations(userDeclarations);
      setOverdueDeclarations(overdue);
      setUpcomingDeadlines(upcoming);
      setAnnualSummary(summary);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeclaration = async (declarationId: string) => {
    try {
      await submitTaxDeclaration(declarationId);
      toast.success('Déclaration soumise avec succès');
      loadData();
    } catch (error) {
      console.error('Error submitting declaration:', error);
      toast.error('Erreur lors de la soumission');
    }
  };

  const handlePayDeclaration = async (declarationId: string) => {
    try {
      await payTaxDeclaration(declarationId);
      toast.success('Paiement enregistré avec succès');
      loadData();
    } catch (error) {
      console.error('Error paying declaration:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleGenerateDeclarations = async () => {
    if (!user) return;

    if (!canAccessFeature('tax_automation')) {
      toast.error('Fonctionnalité disponible avec un abonnement payant');
      return;
    }

    setGeneratingDeclarations(true);
    try {
      await generateAnnualTaxDeclarations(
        user.id,
        selectedYear,
        business?.activity_type || 'services',
        'quarterly'
      );
      toast.success('Déclarations générées avec succès');
      loadData();
    } catch (error) {
      console.error('Error generating declarations:', error);
      toast.error('Erreur lors de la génération des déclarations');
    } finally {
      setGeneratingDeclarations(false);
    }
  };

  const handleDownloadFile = (declaration: TaxDeclaration) => {
    if (!canAccessFeature('export')) {
      toast.error('Fonctionnalité disponible avec un abonnement payant');
      return;
    }

    let fileContent = '';
    let filename = '';

    switch (declaration.declaration_type) {
      case 'urssaf':
        fileContent = generateURSSAFFile(declaration.form_data);
        filename = `urssaf_${declaration.year}_${format(new Date(declaration.period_start), 'MM')}.txt`;
        break;
      case 'income_tax':
        fileContent = JSON.stringify(generateIncomeTaxForm(declaration.form_data), null, 2);
        filename = `declaration_revenus_${declaration.year}.json`;
        break;
      case 'cfe':
        fileContent = JSON.stringify(declaration.form_data, null, 2);
        filename = `cfe_${declaration.year}.json`;
        break;
    }

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Fichier téléchargé');
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urssaf':
        return <BanknotesIcon className="w-4 h-4" />;
      case 'income_tax':
        return <ScaleIcon className="w-4 h-4" />;
      case 'cfe':
        return <BuildingOfficeIcon className="w-4 h-4" />;
      case 'vat':
        return <CurrencyEuroIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'urssaf':
        return 'URSSAF';
      case 'income_tax':
        return 'Impôt sur le revenu';
      case 'cfe':
        return 'CFE';
      case 'vat':
        return 'TVA';
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return format(start, 'MMMM yyyy', { locale: fr });
    }
    
    return `${format(start, 'MMM', { locale: fr })} - ${format(end, 'MMM yyyy', { locale: fr })}`;
  };

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
          <h1 className="text-2xl font-bold text-secondary-900">Déclarations fiscales</h1>
          <p className="text-secondary-600">
            Gérez vos obligations fiscales et sociales
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/dashboard/taxes/calendar')}
            className="btn-outline"
          >
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Calendrier fiscal
          </button>
          <button
            onClick={handleGenerateDeclarations}
            disabled={generatingDeclarations || !canAccessFeature('tax_automation')}
            className="btn-primary"
          >
            {generatingDeclarations ? (
              <div className="flex items-center">
                <div className="loading-spinner mr-2"></div>
                Génération...
              </div>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Générer les déclarations
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="form-label">Type de déclaration</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="form-input"
              >
                <option value="all">Toutes</option>
                <option value="urssaf">URSSAF</option>
                <option value="income_tax">Impôt sur le revenu</option>
                <option value="cfe">CFE</option>
                <option value="vat">TVA</option>
              </select>
            </div>
            <div>
              <label className="form-label">Statut</label>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-secondary-600">
                  {annualSummary?.pending_declarations || 0} en attente
                </span>
                <span className="text-secondary-300">•</span>
                <span className="text-sm text-secondary-600">
                  {annualSummary?.paid_declarations || 0} payées
                </span>
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
                Vous avez {overdueDeclarations.length} déclaration(s) en retard. Régularisez rapidement pour éviter les pénalités.
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
                {upcomingDeadlines.length} déclaration(s) à soumettre dans les 45 prochains jours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Annual Summary */}
      {annualSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CurrencyEuroIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">CA déclaré</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualSummary.total_revenue)}
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
                  <p className="text-sm font-medium text-secondary-500">URSSAF</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualSummary.urssaf_contributions)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <ScaleIcon className="w-5 h-5 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Impôt revenus</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualSummary.income_tax)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <BuildingOfficeIcon className="w-5 h-5 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">CFE</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(annualSummary.cfe_tax)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Declarations List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Déclarations {selectedYear}
          </h3>
        </div>
        <div className="card-body">
          {declarations.length > 0 ? (
            <div className="space-y-4">
              {declarations.map((declaration) => (
                <div key={declaration.id} className="border border-secondary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-secondary-100 rounded-lg">
                        {getTypeIcon(declaration.declaration_type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-secondary-900">
                          {getTypeLabel(declaration.declaration_type)}
                        </h4>
                        <p className="text-sm text-secondary-600">
                          {formatPeriod(declaration.period_start, declaration.period_end)}
                        </p>
                        <p className="text-sm text-secondary-600">
                          Échéance : {format(new Date(declaration.due_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-secondary-900">
                        {formatCurrency(declaration.tax_amount)}
                      </p>
                      <p className="text-sm text-secondary-600">
                        CA : {formatCurrency(declaration.revenue)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(declaration.status)}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadFile(declaration)}
                          className="p-2 text-secondary-400 hover:text-secondary-600"
                          title="Télécharger"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                        {declaration.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitDeclaration(declaration.id)}
                            className="btn-outline text-sm"
                          >
                            <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                            Soumettre
                          </button>
                        )}
                        {declaration.status === 'submitted' && (
                          <button
                            onClick={() => handlePayDeclaration(declaration.id)}
                            className="btn-primary text-sm"
                          >
                            <CreditCardIcon className="w-4 h-4 mr-1" />
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
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto w-12 h-12 text-secondary-400" />
              <h3 className="mt-2 text-sm font-medium text-secondary-900">
                Aucune déclaration
              </h3>
              <p className="mt-1 text-sm text-secondary-500">
                Générez automatiquement vos déclarations pour l'année {selectedYear}.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleGenerateDeclarations}
                  disabled={!canAccessFeature('tax_automation')}
                  className="btn-primary"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Générer les déclarations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Calendar Preview */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-secondary-900">
              Calendrier fiscal 2024
            </h3>
            <button
              onClick={() => router.push('/dashboard/taxes/calendar')}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Voir tout →
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-secondary-900 mb-3">Échéances trimestrielles URSSAF</h4>
              <div className="space-y-2">
                {TAX_CALENDAR_2024.quarterly_urssaf.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-secondary-50 rounded">
                    <span className="text-sm text-secondary-900">{item.description}</span>
                    <span className="text-sm font-medium text-secondary-600">
                      {format(new Date(item.due_date), 'dd/MM', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-3">Échéances annuelles</h4>
              <div className="space-y-2">
                {TAX_CALENDAR_2024.annual_declarations.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-secondary-50 rounded">
                    <span className="text-sm text-secondary-900">{item.description}</span>
                    <span className="text-sm font-medium text-secondary-600">
                      {format(new Date(item.due_date), 'dd/MM', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <InformationCircleIcon className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-secondary-900">
              Aide aux déclarations
            </h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Déclarations URSSAF</h4>
              <p className="text-sm text-secondary-600">
                Déclarez mensuellement ou trimestriellement selon votre choix. 
                Les cotisations sont calculées automatiquement sur votre chiffre d'affaires.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Déclaration de revenus</h4>
              <p className="text-sm text-secondary-600">
                En micro-entreprise, vous bénéficiez d'un abattement forfaitaire. 
                Seul le montant net est imposable.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">CFE</h4>
              <p className="text-sm text-secondary-600">
                Exonération possible si CA &lt; 5 000€. 
                Sinon, montant calculé selon votre commune et votre activité.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Pénalités</h4>
              <p className="text-sm text-secondary-600">
                Respectez les échéances pour éviter les majorations. 
                En cas de retard, régularisez rapidement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
