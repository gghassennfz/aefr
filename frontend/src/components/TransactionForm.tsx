'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createTransaction,
  updateTransaction,
  TransactionFormData,
  DEFAULT_EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  autoCategorizeTran
} from '@/lib/accounting';
import { Database } from '@/lib/database.types';
import { format } from 'date-fns';
import {
  CurrencyEuroIcon,
  DocumentTextIcon,
  CalendarIcon,
  TagIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  PaperClipIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type Transaction = Database['public']['Tables']['transactions']['Row'];

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: 'Type requis' }),
  category: z.string().min(1, 'Catégorie requise'),
  subcategory: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
  amount: z.number().min(0.01, 'Montant doit être supérieur à 0'),
  vat_amount: z.number().min(0, 'Montant TVA doit être positif').optional(),
  date: z.string().min(1, 'Date requise'),
  payment_method: z.string().optional(),
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
  is_deductible: z.boolean().optional(),
});

type TransactionFormInputs = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  onSuccess?: () => void;
}

export default function TransactionForm({ transaction, onSuccess }: TransactionFormProps) {
  const { user, business } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [autoSuggestCategory, setAutoSuggestCategory] = useState<string>('');

  const isEditMode = !!transaction;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TransactionFormInputs>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: transaction?.type || 'expense',
      category: transaction?.category || '',
      subcategory: transaction?.subcategory || '',
      description: transaction?.description || '',
      amount: transaction?.amount || 0,
      vat_amount: transaction?.vat_amount || 0,
      date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
      payment_method: transaction?.payment_method || '',
      receipt_url: transaction?.receipt_url || '',
      notes: transaction?.notes || '',
      is_deductible: transaction?.is_deductible || false,
    }
  });

  const watchedType = watch('type');
  const watchedCategory = watch('category');
  const watchedAmount = watch('amount');
  const watchedDescription = watch('description');

  // Auto-suggest category based on description
  useEffect(() => {
    if (watchedDescription && watchedDescription.length > 3 && !isEditMode) {
      const suggestedCategory = autoCategorizeTran(watchedDescription, watchedAmount);
      setAutoSuggestCategory(suggestedCategory);
    }
  }, [watchedDescription, watchedAmount, isEditMode]);

  // Update selected category when category changes
  useEffect(() => {
    if (watchedType === 'expense') {
      const category = DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === watchedCategory);
      setSelectedCategory(category);
    } else {
      setSelectedCategory(null);
    }
  }, [watchedCategory, watchedType]);

  // Auto-calculate VAT amount
  useEffect(() => {
    if (watchedType === 'income' && watchedAmount && business?.vat_rate) {
      const vatAmount = watchedAmount * business.vat_rate;
      setValue('vat_amount', Number(vatAmount.toFixed(2)));
    }
  }, [watchedAmount, watchedType, business?.vat_rate, setValue]);

  const onSubmit = async (data: TransactionFormInputs) => {
    if (!user) return;

    setLoading(true);
    try {
      if (isEditMode) {
        await updateTransaction(transaction.id, data);
        toast.success('Transaction mise à jour avec succès');
      } else {
        const transactionId = await createTransaction(user.id, data);
        toast.success('Transaction créée avec succès');
        router.push(`/dashboard/accounting/${transactionId}`);
      }
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedCategory = () => {
    setValue('category', autoSuggestCategory);
    setAutoSuggestCategory('');
  };

  const getAvailableCategories = () => {
    return watchedType === 'income' ? INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES.map(c => c.name);
  };

  const getAvailableSubcategories = () => {
    if (watchedType === 'expense' && selectedCategory) {
      return selectedCategory.subcategories || [];
    }
    return [];
  };

  const calculateTotalAmount = () => {
    const amount = watchedAmount || 0;
    const vatAmount = watch('vat_amount') || 0;
    return amount + vatAmount;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {isEditMode ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h1>
          <p className="text-secondary-600">
            {isEditMode ? 'Modifiez les informations de votre transaction' : 'Enregistrez une nouvelle transaction'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Type and Basic Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Informations générales
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Type de transaction *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative">
                    <input
                      type="radio"
                      {...register('type')}
                      value="income"
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      watchedType === 'income' 
                        ? 'border-success-500 bg-success-50' 
                        : 'border-secondary-300 hover:border-secondary-400'
                    }`}>
                      <div className="flex items-center">
                        <BanknotesIcon className="w-5 h-5 text-success-600 mr-2" />
                        <span className="font-medium">Recette</span>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      {...register('type')}
                      value="expense"
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      watchedType === 'expense' 
                        ? 'border-error-500 bg-error-50' 
                        : 'border-secondary-300 hover:border-secondary-400'
                    }`}>
                      <div className="flex items-center">
                        <CurrencyEuroIcon className="w-5 h-5 text-error-600 mr-2" />
                        <span className="font-medium">Dépense</span>
                      </div>
                    </div>
                  </label>
                </div>
                {errors.type && (
                  <p className="form-error mt-2">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  {...register('date')}
                  className="form-input"
                />
                {errors.date && (
                  <p className="form-error">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Description *</label>
                <input
                  type="text"
                  {...register('description')}
                  className="form-input"
                  placeholder="Description de la transaction"
                />
                {errors.description && (
                  <p className="form-error">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Méthode de paiement</label>
                <select
                  {...register('payment_method')}
                  className="form-input"
                >
                  <option value="">Sélectionnez une méthode</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Category and Classification */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Catégorisation
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Catégorie *</label>
                <select
                  {...register('category')}
                  className="form-input"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {getAvailableCategories().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="form-error">{errors.category.message}</p>
                )}
                
                {/* Auto-suggestion */}
                {autoSuggestCategory && autoSuggestCategory !== watchedCategory && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TagIcon className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800">
                          Suggestion : <strong>{autoSuggestCategory}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={applySuggestedCategory}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Sous-catégorie</label>
                <select
                  {...register('subcategory')}
                  className="form-input"
                  disabled={!selectedCategory}
                >
                  <option value="">Sélectionnez une sous-catégorie</option>
                  {getAvailableSubcategories().map(subcategory => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>

              {watchedType === 'expense' && (
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_deductible')}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-secondary-700">
                      Dépense déductible
                    </span>
                  </label>
                  <p className="text-sm text-secondary-500 mt-1">
                    {selectedCategory?.is_deductible 
                      ? 'Cette catégorie est généralement déductible' 
                      : 'Cette catégorie n\'est généralement pas déductible'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amount and VAT */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Montants
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="form-label">Montant HT *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount', { valueAsNumber: true })}
                    className="form-input pr-8"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                    €
                  </span>
                </div>
                {errors.amount && (
                  <p className="form-error">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">TVA</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    {...register('vat_amount', { valueAsNumber: true })}
                    className="form-input pr-8"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                    €
                  </span>
                </div>
                {errors.vat_amount && (
                  <p className="form-error">{errors.vat_amount.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Montant TTC</label>
                <div className="form-input bg-secondary-50 text-secondary-700 font-medium">
                  {calculateTotalAmount().toFixed(2)} €
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Informations supplémentaires
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">Justificatif (URL)</label>
                <input
                  type="url"
                  {...register('receipt_url')}
                  className="form-input"
                  placeholder="https://..."
                />
                <p className="text-sm text-secondary-500 mt-1">
                  Lien vers le justificatif (facture, reçu, etc.)
                </p>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  {...register('notes')}
                  className="form-input"
                  rows={3}
                  placeholder="Notes internes ou informations supplémentaires"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Résumé
            </h3>
          </div>
          <div className="card-body">
            <div className="bg-secondary-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary-600">Type :</span>
                <span className={`font-medium ${watchedType === 'income' ? 'text-success-600' : 'text-error-600'}`}>
                  {watchedType === 'income' ? 'Recette' : 'Dépense'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary-600">Catégorie :</span>
                <span className="font-medium">{watchedCategory || 'Non sélectionnée'}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary-600">Montant HT :</span>
                <span className="font-medium">{(watchedAmount || 0).toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary-600">TVA :</span>
                <span className="font-medium">{(watch('vat_amount') || 0).toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between border-t border-secondary-200 pt-2">
                <span className="text-secondary-900 font-semibold">Total TTC :</span>
                <span className="font-bold text-lg">{calculateTotalAmount().toFixed(2)} €</span>
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
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {isEditMode ? 'Mettre à jour' : 'Créer la transaction'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
