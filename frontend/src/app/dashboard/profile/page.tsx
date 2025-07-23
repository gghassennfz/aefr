'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const businessSchema = z.object({
  company_name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  siret: z.string().optional(),
  siren: z.string().optional(),
  legal_form: z.string().optional(),
  activity_code: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  vat_number: z.string().optional(),
  vat_rate: z.number().min(0).max(1).optional(),
  social_security_number: z.string().optional(),
  urssaf_number: z.string().optional(),
  auto_entrepreneur_regime: z.boolean().default(true),
  quarterly_declaration: z.boolean().default(true),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export default function ProfilePage() {
  const { user, business, updateBusiness, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'business' | 'account'>('business');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      company_name: business?.company_name || '',
      siret: business?.siret || '',
      siren: business?.siren || '',
      legal_form: business?.legal_form || '',
      activity_code: business?.activity_code || '',
      address: business?.address || '',
      postal_code: business?.postal_code || '',
      city: business?.city || '',
      phone: business?.phone || '',
      website: business?.website || '',
      vat_number: business?.vat_number || '',
      vat_rate: business?.vat_rate || 0.20,
      social_security_number: business?.social_security_number || '',
      urssaf_number: business?.urssaf_number || '',
      auto_entrepreneur_regime: business?.auto_entrepreneur_regime ?? true,
      quarterly_declaration: business?.quarterly_declaration ?? true,
    }
  });

  useEffect(() => {
    if (business) {
      reset({
        company_name: business.company_name,
        siret: business.siret || '',
        siren: business.siren || '',
        legal_form: business.legal_form || '',
        activity_code: business.activity_code || '',
        address: business.address || '',
        postal_code: business.postal_code || '',
        city: business.city || '',
        phone: business.phone || '',
        website: business.website || '',
        vat_number: business.vat_number || '',
        vat_rate: business.vat_rate || 0.20,
        social_security_number: business.social_security_number || '',
        urssaf_number: business.urssaf_number || '',
        auto_entrepreneur_regime: business.auto_entrepreneur_regime ?? true,
        quarterly_declaration: business.quarterly_declaration ?? true,
      });
    }
  }, [business, reset]);

  const onSubmit = async (data: BusinessFormData) => {
    setLoading(true);
    try {
      await updateBusiness(data);
      toast.success('Informations mises à jour avec succès');
      await refreshUserData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const legalForms = [
    { value: 'auto-entrepreneur', label: 'Auto-entrepreneur' },
    { value: 'eurl', label: 'EURL' },
    { value: 'sasu', label: 'SASU' },
    { value: 'sarl', label: 'SARL' },
    { value: 'sas', label: 'SAS' },
    { value: 'sa', label: 'SA' },
    { value: 'other', label: 'Autre' },
  ];

  const tabs = [
    { id: 'business', name: 'Informations d\'entreprise', icon: BuildingOffice2Icon },
    { id: 'account', name: 'Compte utilisateur', icon: UserCircleIcon },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Profil</h1>
        <p className="text-secondary-600">
          Gérez vos informations personnelles et d'entreprise
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'business' | 'account')}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Business Information Tab */}
      {activeTab === 'business' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Informations d'entreprise
            </h3>
            <p className="text-sm text-secondary-600">
              Complétez vos informations d'entreprise pour les factures et déclarations
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  {...register('company_name')}
                  className="form-input"
                  placeholder="Nom de votre entreprise"
                />
                {errors.company_name && (
                  <p className="form-error">{errors.company_name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Forme juridique
                </label>
                <select
                  {...register('legal_form')}
                  className="form-input"
                >
                  <option value="">Sélectionnez une forme juridique</option>
                  {legalForms.map((form) => (
                    <option key={form.value} value={form.value}>
                      {form.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Numéro SIRET
                </label>
                <input
                  type="text"
                  {...register('siret')}
                  className="form-input"
                  placeholder="12345678901234"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="form-label">
                  Numéro SIREN
                </label>
                <input
                  type="text"
                  {...register('siren')}
                  className="form-input"
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>

              <div>
                <label className="form-label">
                  Code d'activité (APE/NAF)
                </label>
                <input
                  type="text"
                  {...register('activity_code')}
                  className="form-input"
                  placeholder="6201Z"
                />
              </div>

              <div>
                <label className="form-label">
                  Numéro de TVA
                </label>
                <input
                  type="text"
                  {...register('vat_number')}
                  className="form-input"
                  placeholder="FR12345678901"
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-secondary-900">Adresse</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="form-label">
                    Adresse
                  </label>
                  <input
                    type="text"
                    {...register('address')}
                    className="form-input"
                    placeholder="123 Rue de la Paix"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Code postal
                  </label>
                  <input
                    type="text"
                    {...register('postal_code')}
                    className="form-input"
                    placeholder="75000"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Ville
                  </label>
                  <input
                    type="text"
                    {...register('city')}
                    className="form-input"
                    placeholder="Paris"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-secondary-900">Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="form-input"
                    placeholder="01 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Site web
                  </label>
                  <input
                    type="url"
                    {...register('website')}
                    className="form-input"
                    placeholder="https://monsite.fr"
                  />
                </div>
              </div>
            </div>

            {/* Informations fiscales */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-secondary-900">Informations fiscales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    Numéro de sécurité sociale
                  </label>
                  <input
                    type="text"
                    {...register('social_security_number')}
                    className="form-input"
                    placeholder="1234567890123"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Numéro URSSAF
                  </label>
                  <input
                    type="text"
                    {...register('urssaf_number')}
                    className="form-input"
                    placeholder="123456789"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Taux de TVA par défaut
                  </label>
                  <select
                    {...register('vat_rate', { valueAsNumber: true })}
                    className="form-input"
                  >
                    <option value={0}>0% (Exonéré)</option>
                    <option value={0.055}>5,5% (Taux réduit)</option>
                    <option value={0.10}>10% (Taux intermédiaire)</option>
                    <option value={0.20}>20% (Taux normal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Paramètres du régime */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-secondary-900">Paramètres du régime</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('auto_entrepreneur_regime')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-secondary-700">
                    Régime auto-entrepreneur
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('quarterly_declaration')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-secondary-700">
                    Déclaration trimestrielle (sinon mensuelle)
                  </label>
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-secondary-200">
              <button
                type="button"
                onClick={() => reset()}
                className="btn-outline"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !isDirty}
                className="btn-primary"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Information Tab */}
      {activeTab === 'account' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Compte utilisateur
            </h3>
            <p className="text-sm text-secondary-600">
              Gérez vos paramètres de compte et sécurité
            </p>
          </div>
          <div className="card-body space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <UserCircleIcon className="w-16 h-16 text-secondary-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-secondary-900">
                  {user?.email}
                </h4>
                <p className="text-sm text-secondary-600">
                  Compte créé le {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-medium text-secondary-900">Email</h5>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="w-5 h-5 text-secondary-400" />
                  <span className="text-sm text-secondary-700">{user?.email}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-medium text-secondary-900">Sécurité</h5>
                <button className="btn-outline text-sm">
                  Changer le mot de passe
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-secondary-200">
              <h5 className="font-medium text-secondary-900 mb-4">Zone de danger</h5>
              <button className="btn-danger text-sm">
                Supprimer mon compte
              </button>
              <p className="text-xs text-secondary-500 mt-2">
                Cette action est irréversible et supprimera toutes vos données.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
