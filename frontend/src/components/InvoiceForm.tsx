'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { createInvoice, updateInvoice, InvoiceFormData, InvoiceWithItems } from '@/lib/invoices';
import { format } from 'date-fns';
import {
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Veuillez sélectionner un client'),
  title: z.string().optional(),
  description: z.string().optional(),
  issue_date: z.string().min(1, 'Date d\'émission requise'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  terms_conditions: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description requise'),
    quantity: z.number().min(0.01, 'Quantité doit être supérieure à 0'),
    unit_price: z.number().min(0, 'Prix unitaire doit être positif'),
    vat_rate: z.number().min(0).max(1, 'Taux de TVA invalide'),
  })).min(1, 'Au moins un article est requis'),
});

type InvoiceFormInputs = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: InvoiceWithItems;
  onSuccess?: () => void;
}

export default function InvoiceForm({ invoice, onSuccess }: InvoiceFormProps) {
  const { user, business } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);

  const isEditMode = !!invoice;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<InvoiceFormInputs>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: invoice?.client_id || '',
      title: invoice?.title || '',
      description: invoice?.description || '',
      issue_date: invoice?.issue_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: invoice?.due_date || '',
      notes: invoice?.notes || '',
      terms_conditions: invoice?.terms_conditions || 'Paiement à réception de facture. Pénalités de retard applicables.',
      items: invoice?.invoice_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })) || [{
        description: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: business?.vat_rate || 0.20,
      }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;

    watchedItems.forEach(item => {
      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;
      vatAmount += itemTotal * item.vat_rate;
    });

    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount
    };
  };

  const totals = calculateTotals();

  // Load clients
  useEffect(() => {
    loadClients();
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const onSubmit = async (data: InvoiceFormInputs) => {
    if (!user) return;

    setLoading(true);
    try {
      if (isEditMode) {
        await updateInvoice(invoice.id, data);
        toast.success('Facture mise à jour avec succès');
      } else {
        const invoiceId = await createInvoice(user.id, data);
        toast.success('Facture créée avec succès');
        router.push(`/dashboard/invoices/${invoiceId}`);
      }
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: business?.vat_rate || 0.20,
    });
  };

  const getClientName = (client: any) => {
    return client.company_name || `${client.first_name} ${client.last_name}`;
  };

  if (loadingClients) {
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
          <h1 className="text-2xl font-bold text-secondary-900">
            {isEditMode ? 'Modifier la facture' : 'Nouvelle facture'}
          </h1>
          <p className="text-secondary-600">
            {isEditMode ? 'Modifiez les informations de votre facture' : 'Créez une nouvelle facture'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Client and Dates */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Informations générales
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Client *</label>
                <select
                  {...register('client_id')}
                  className="form-input"
                >
                  <option value="">Sélectionnez un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {getClientName(client)}
                    </option>
                  ))}
                </select>
                {errors.client_id && (
                  <p className="form-error">{errors.client_id.message}</p>
                )}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/clients/new')}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Créer un nouveau client
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Titre (optionnel)</label>
                <input
                  type="text"
                  {...register('title')}
                  className="form-input"
                  placeholder="Titre de la facture"
                />
              </div>

              <div>
                <label className="form-label">Date d'émission *</label>
                <input
                  type="date"
                  {...register('issue_date')}
                  className="form-input"
                />
                {errors.issue_date && (
                  <p className="form-error">{errors.issue_date.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Date d'échéance</label>
                <input
                  type="date"
                  {...register('due_date')}
                  className="form-input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  {...register('description')}
                  className="form-input"
                  rows={3}
                  placeholder="Description de la facture"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-secondary-900">
                Articles et services
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="btn-outline"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Ajouter un article
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-secondary-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-secondary-900">
                      Article {index + 1}
                    </h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-error-600 hover:text-error-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <label className="form-label">Description *</label>
                      <input
                        type="text"
                        {...register(`items.${index}.description`)}
                        className="form-input"
                        placeholder="Description de l'article"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="form-error">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="form-label">Quantité *</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="form-input"
                        placeholder="1"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="form-error">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="form-label">Prix unitaire HT *</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        className="form-input"
                        placeholder="0.00"
                      />
                      {errors.items?.[index]?.unit_price && (
                        <p className="form-error">{errors.items[index]?.unit_price?.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="form-label">TVA</label>
                      <select
                        {...register(`items.${index}.vat_rate`, { valueAsNumber: true })}
                        className="form-input"
                      >
                        <option value={0}>0%</option>
                        <option value={0.055}>5,5%</option>
                        <option value={0.10}>10%</option>
                        <option value={0.20}>20%</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="form-label">Total TTC</label>
                      <div className="form-input bg-secondary-50 text-secondary-700">
                        {((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0) * (1 + (watchedItems[index]?.vat_rate || 0))).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="form-error mt-4">{errors.items.message}</p>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Récapitulatif
            </h3>
          </div>
          <div className="card-body">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-600">Sous-total HT :</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">TVA :</span>
                <span className="font-medium">{totals.vatAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-secondary-200 pt-2">
                <span>Total TTC :</span>
                <span>{totals.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Notes et conditions
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  {...register('notes')}
                  className="form-input"
                  rows={3}
                  placeholder="Notes internes ou informations supplémentaires"
                />
              </div>

              <div>
                <label className="form-label">Conditions de paiement</label>
                <textarea
                  {...register('terms_conditions')}
                  className="form-input"
                  rows={3}
                  placeholder="Conditions de paiement et mentions légales"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="loading-spinner mr-2"></div>
                Sauvegarde...
              </div>
            ) : (
              <>
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                {isEditMode ? 'Mettre à jour' : 'Créer la facture'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
