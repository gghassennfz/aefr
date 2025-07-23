'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TAX_CALENDAR_2024 } from '@/lib/taxDeclarations';
import { getUpcomingTaxDeadlines, getOverdueTaxDeclarations } from '@/lib/taxDeclarations';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  BellIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface FiscalEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'urssaf' | 'income_tax' | 'cfe' | 'vat' | 'deadline';
  status: 'upcoming' | 'overdue' | 'completed';
  amount?: number;
  isRecurring?: boolean;
}

export default function FiscalCalendarPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [fiscalEvents, setFiscalEvents] = useState<FiscalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (user) {
      loadFiscalEvents();
    }
  }, [user, selectedYear, selectedMonth]);

  const loadFiscalEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [upcomingDeadlines, overdueDeclarations] = await Promise.all([
        getUpcomingTaxDeadlines(user.id, 365),
        getOverdueTaxDeadlines(user.id)
      ]);

      const events: FiscalEvent[] = [];

      // Add recurring URSSAF deadlines
      TAX_CALENDAR_2024.quarterly_urssaf.forEach(quarter => {
        events.push({
          id: `urssaf-q${quarter.quarter}-${selectedYear}`,
          title: `URSSAF ${quarter.description}`,
          description: 'Déclaration trimestrielle des cotisations sociales',
          date: new Date(quarter.due_date),
          type: 'urssaf',
          status: 'upcoming',
          isRecurring: true
        });
      });

      // Add annual declarations
      TAX_CALENDAR_2024.annual_declarations.forEach(declaration => {
        events.push({
          id: `${declaration.type}-${selectedYear}`,
          title: declaration.description,
          description: `Formulaires : ${declaration.forms?.join(', ')}`,
          date: new Date(declaration.due_date),
          type: declaration.type as any,
          status: 'upcoming',
          isRecurring: true
        });
      });

      // Add user-specific deadlines
      upcomingDeadlines.forEach(deadline => {
        events.push({
          id: deadline.id,
          title: `${deadline.declaration_type.toUpperCase()} - ${deadline.tax_amount}€`,
          description: `Période: ${format(new Date(deadline.period_start), 'MMM yyyy', { locale: fr })}`,
          date: new Date(deadline.due_date),
          type: deadline.declaration_type as any,
          status: 'upcoming',
          amount: deadline.tax_amount
        });
      });

      // Add overdue declarations
      overdueDeclarations.forEach(overdue => {
        events.push({
          id: `overdue-${overdue.id}`,
          title: `RETARD - ${overdue.declaration_type.toUpperCase()}`,
          description: `Montant: ${overdue.tax_amount}€`,
          date: new Date(overdue.due_date),
          type: overdue.declaration_type as any,
          status: 'overdue',
          amount: overdue.tax_amount
        });
      });

      setFiscalEvents(events);
    } catch (error) {
      console.error('Error loading fiscal events:', error);
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (event: FiscalEvent) => {
    if (event.status === 'overdue') return 'bg-error-100 text-error-800 border-error-200';
    if (event.status === 'completed') return 'bg-success-100 text-success-800 border-success-200';
    
    switch (event.type) {
      case 'urssaf':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'income_tax':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cfe':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'vat':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  const getEventIcon = (event: FiscalEvent) => {
    if (event.status === 'overdue') return <ExclamationTriangleIcon className="w-4 h-4" />;
    if (event.status === 'completed') return <CheckCircleIcon className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />;
  };

  const getEventsForMonth = (month: number, year: number) => {
    return fiscalEvents.filter(event => 
      isSameMonth(event.date, new Date(year, month))
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0)),
    end: endOfYear(new Date(selectedYear, 0))
  });

  const currentMonth = months[selectedMonth];
  const currentMonthEvents = getEventsForMonth(selectedMonth, selectedYear);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

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
            Calendrier fiscal
          </h1>
          <p className="text-secondary-600">
            Toutes vos échéances fiscales et sociales
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <label className="form-label">Année</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="form-input"
                >
                  {Array.from({ length: 3 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {viewMode === 'month' && (
                <div>
                  <label className="form-label">Mois</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="form-input"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>
                        {format(month, 'MMMM yyyy', { locale: fr })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  viewMode === 'month' 
                    ? 'bg-primary-100 text-primary-800' 
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  viewMode === 'year' 
                    ? 'bg-primary-100 text-primary-800' 
                    : 'text-secondary-600 hover:text-secondary-900'
                }`}
              >
                Année
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {fiscalEvents.filter(e => e.status === 'overdue').length > 0 && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-error-600 mr-2" />
            <div>
              <h3 className="font-medium text-error-900">
                Échéances en retard
              </h3>
              <p className="text-error-700">
                {fiscalEvents.filter(e => e.status === 'overdue').length} échéance(s) dépassée(s).
              </p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'month' ? (
        /* Monthly View */
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h3>
          </div>
          <div className="card-body">
            {currentMonthEvents.length > 0 ? (
              <div className="space-y-4">
                {currentMonthEvents
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${getEventColor(event)}`}
                    >
                      <div className="flex items-center space-x-3">
                        {getEventIcon(event)}
                        <div>
                          <h4 className="font-medium">
                            {event.title}
                          </h4>
                          <p className="text-sm opacity-80">
                            {event.description}
                          </p>
                          <p className="text-sm opacity-80">
                            {format(event.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {event.amount && (
                          <p className="font-medium">
                            {formatCurrency(event.amount)}
                          </p>
                        )}
                        <p className="text-sm opacity-80">
                          {event.date < new Date() ? 'Échue' : 
                           event.date < addDays(new Date(), 7) ? 'Cette semaine' : 
                           'À venir'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDaysIcon className="mx-auto w-12 h-12 text-secondary-400" />
                <h3 className="mt-2 text-sm font-medium text-secondary-900">
                  Aucune échéance ce mois-ci
                </h3>
                <p className="mt-1 text-sm text-secondary-500">
                  Profitez-en pour préparer vos prochaines déclarations.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Yearly View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((month, index) => {
            const monthEvents = getEventsForMonth(index, selectedYear);
            const overdueCount = monthEvents.filter(e => e.status === 'overdue').length;
            const upcomingCount = monthEvents.filter(e => e.status === 'upcoming').length;
            
            return (
              <div key={index} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-secondary-900">
                      {format(month, 'MMMM', { locale: fr })}
                    </h3>
                    {overdueCount > 0 && (
                      <div className="flex items-center text-error-600">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">{overdueCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  {monthEvents.length > 0 ? (
                    <div className="space-y-2">
                      {monthEvents
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .slice(0, 3)
                        .map((event) => (
                          <div
                            key={event.id}
                            className={`p-2 rounded text-sm border ${getEventColor(event)}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">
                                {event.title}
                              </span>
                              <span className="text-xs ml-2">
                                {format(event.date, 'dd', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        ))}
                      {monthEvents.length > 3 && (
                        <p className="text-xs text-secondary-500 text-center">
                          +{monthEvents.length - 3} autres
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary-500 text-center py-4">
                      Aucune échéance
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">
            Légende
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm text-secondary-700">URSSAF</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm text-secondary-700">Impôt sur le revenu</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-sm text-secondary-700">CFE</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-error-100 border border-error-200 rounded"></div>
              <span className="text-sm text-secondary-700">En retard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <InformationCircleIcon className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-secondary-900">
              Points importants
            </h3>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <BellIcon className="w-5 h-5 text-warning-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-secondary-900">Notifications automatiques</h4>
                <p className="text-sm text-secondary-600">
                  Activez les notifications pour être alerté 15 jours avant chaque échéance.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CalendarDaysIcon className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-secondary-900">Déclarations récurrentes</h4>
                <p className="text-sm text-secondary-600">
                  Les déclarations URSSAF sont générées automatiquement selon votre fréquence choisie.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ClockIcon className="w-5 h-5 text-secondary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-secondary-900">Délais de paiement</h4>
                <p className="text-sm text-secondary-600">
                  Respectez les échéances pour éviter les pénalités. En cas de difficultés, contactez l'URSSAF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
