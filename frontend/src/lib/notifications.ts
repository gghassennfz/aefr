import { supabase } from './supabase';
import { Database } from './database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export interface EmailNotification {
  to: string;
  subject: string;
  content: string;
  template: string;
  data: any;
  scheduled_for?: string;
}

export interface NotificationPreferences {
  invoice_reminders: boolean;
  payment_overdue: boolean;
  quote_expiring: boolean;
  tax_deadlines: boolean;
  subscription_alerts: boolean;
  newsletter: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly';
}

// Templates d'emails en français
export const EMAIL_TEMPLATES = {
  invoice_reminder: {
    subject: 'Rappel de paiement - Facture #{invoice_number}',
    content: `
      <h2>Rappel de paiement</h2>
      <p>Cher(e) {client_name},</p>
      <p>Nous espérons que vous allez bien. Nous vous contactons concernant la facture #{invoice_number} d'un montant de {amount} qui arrive à échéance le {due_date}.</p>
      <p>Si vous avez déjà effectué le paiement, merci d'ignorer ce rappel.</p>
      <p>Pour toute question, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>{business_name}</p>
    `
  },
  payment_overdue: {
    subject: 'Facture impayée - Action requise',
    content: `
      <h2>Facture impayée</h2>
      <p>Cher(e) {client_name},</p>
      <p>Nous vous informons que la facture #{invoice_number} d'un montant de {amount} est impayée depuis le {due_date}.</p>
      <p>Merci de régulariser votre situation dans les plus brefs délais.</p>
      <p>Cordialement,<br>{business_name}</p>
    `
  },
  quote_expiring: {
    subject: 'Votre devis expire bientôt',
    content: `
      <h2>Devis arrivant à expiration</h2>
      <p>Cher(e) {client_name},</p>
      <p>Nous vous rappelons que votre devis #{quote_number} d'un montant de {amount} expire le {expiry_date}.</p>
      <p>Si vous souhaitez donner suite à ce devis, merci de nous le faire savoir rapidement.</p>
      <p>Cordialement,<br>{business_name}</p>
    `
  },
  tax_deadline: {
    subject: 'Échéance fiscale approchant - {deadline_type}',
    content: `
      <h2>Rappel d'échéance fiscale</h2>
      <p>Bonjour,</p>
      <p>Nous vous rappelons que l'échéance pour votre {deadline_type} est prévue le {due_date}.</p>
      <p>Montant estimé : {estimated_amount}</p>
      <p>Pensez à préparer votre déclaration et effectuer le paiement dans les délais.</p>
      <p>Cordialement,<br>BillsFac</p>
    `
  },
  subscription_expiring: {
    subject: 'Votre abonnement expire bientôt',
    content: `
      <h2>Abonnement arrivant à expiration</h2>
      <p>Bonjour,</p>
      <p>Votre abonnement {plan_name} expire le {expiry_date}.</p>
      <p>Pour continuer à profiter de tous les avantages, pensez à renouveler votre abonnement.</p>
      <p>Cordialement,<br>L'équipe BillsFac</p>
    `
  },
  welcome: {
    subject: 'Bienvenue sur BillsFac !',
    content: `
      <h2>Bienvenue sur BillsFac !</h2>
      <p>Bonjour {first_name},</p>
      <p>Nous sommes ravis de vous accueillir sur BillsFac, votre solution complète pour gérer votre auto-entreprise.</p>
      <p>Vous pouvez dès maintenant :</p>
      <ul>
        <li>Créer vos factures et devis</li>
        <li>Suivre votre comptabilité</li>
        <li>Calculer vos cotisations sociales</li>
        <li>Gérer vos déclarations fiscales</li>
      </ul>
      <p>Pour bien commencer, nous vous recommandons de compléter votre profil dans les paramètres.</p>
      <p>Cordialement,<br>L'équipe BillsFac</p>
    `
  }
};

// Créer une notification
export const createNotification = async (data: NotificationInsert): Promise<string> => {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return notification.id;
};

// Récupérer les notifications d'un utilisateur
export const getUserNotifications = async (
  userId: string,
  filters?: {
    type?: string;
    read?: boolean;
    limit?: number;
  }
): Promise<Notification[]> => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.read !== undefined) {
    query = query.eq('read', filters.read);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
};

// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
};

// Supprimer une notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

// Récupérer les préférences de notification
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('notification_preferences')
    .eq('user_id', userId)
    .single();

  if (error || !settings?.notification_preferences) {
    // Préférences par défaut
    return {
      invoice_reminders: true,
      payment_overdue: true,
      quote_expiring: true,
      tax_deadlines: true,
      subscription_alerts: true,
      newsletter: false,
      email_frequency: 'immediate'
    };
  }

  return settings.notification_preferences;
};

// Mettre à jour les préférences de notification
export const updateNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<void> => {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      notification_preferences: preferences,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
};

// Envoyer un email (fonction simulée - dans un vrai projet, utiliser SendGrid, etc.)
export const sendEmail = async (notification: EmailNotification): Promise<void> => {
  // Simuler l'envoi d'email
  console.log('Sending email:', notification);
  
  // Dans un vrai projet, utiliser un service comme SendGrid :
  /*
  const sg = require('@sendgrid/mail');
  sg.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: notification.to,
    from: 'noreply@billsfac.com',
    subject: notification.subject,
    html: notification.content
  };
  
  await sg.send(msg);
  */
};

// Programmer un rappel de facture
export const scheduleInvoiceReminder = async (
  userId: string,
  invoiceId: string,
  clientEmail: string,
  reminderDate: string
): Promise<void> => {
  await createNotification({
    user_id: userId,
    type: 'invoice_reminder',
    title: 'Rappel de paiement à envoyer',
    message: `Rappel de paiement pour la facture ${invoiceId}`,
    data: { invoice_id: invoiceId, client_email: clientEmail },
    scheduled_for: reminderDate
  });
};

// Programmer un rappel de devis expirant
export const scheduleQuoteExpiryReminder = async (
  userId: string,
  quoteId: string,
  clientEmail: string,
  expiryDate: string
): Promise<void> => {
  // Programmer 3 jours avant l'expiration
  const reminderDate = new Date(expiryDate);
  reminderDate.setDate(reminderDate.getDate() - 3);

  await createNotification({
    user_id: userId,
    type: 'quote_expiring',
    title: 'Devis arrivant à expiration',
    message: `Le devis ${quoteId} expire bientôt`,
    data: { quote_id: quoteId, client_email: clientEmail },
    scheduled_for: reminderDate.toISOString()
  });
};

// Programmer un rappel d'échéance fiscale
export const scheduleTaxDeadlineReminder = async (
  userId: string,
  declarationType: string,
  dueDate: string,
  estimatedAmount: number
): Promise<void> => {
  // Programmer 15 jours avant l'échéance
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 15);

  await createNotification({
    user_id: userId,
    type: 'tax_deadline',
    title: `Échéance ${declarationType} approchant`,
    message: `N'oubliez pas votre déclaration ${declarationType}`,
    data: { 
      declaration_type: declarationType,
      due_date: dueDate,
      estimated_amount: estimatedAmount
    },
    scheduled_for: reminderDate.toISOString()
  });
};

// Traiter les notifications programmées
export const processScheduledNotifications = async (): Promise<void> => {
  const now = new Date().toISOString();
  
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .lte('scheduled_for', now)
    .eq('sent', false);

  if (error) throw error;

  for (const notification of notifications || []) {
    try {
      // Préparer l'email selon le type
      let emailContent = '';
      let emailSubject = '';
      
      switch (notification.type) {
        case 'invoice_reminder':
          emailContent = EMAIL_TEMPLATES.invoice_reminder.content;
          emailSubject = EMAIL_TEMPLATES.invoice_reminder.subject;
          break;
        case 'quote_expiring':
          emailContent = EMAIL_TEMPLATES.quote_expiring.content;
          emailSubject = EMAIL_TEMPLATES.quote_expiring.subject;
          break;
        case 'tax_deadline':
          emailContent = EMAIL_TEMPLATES.tax_deadline.content;
          emailSubject = EMAIL_TEMPLATES.tax_deadline.subject;
          break;
      }

      // Remplacer les variables dans le template
      if (notification.data) {
        Object.keys(notification.data).forEach(key => {
          const value = notification.data[key];
          emailContent = emailContent.replace(new RegExp(`{${key}}`, 'g'), value);
          emailSubject = emailSubject.replace(new RegExp(`{${key}}`, 'g'), value);
        });
      }

      // Envoyer l'email
      await sendEmail({
        to: notification.data?.client_email || 'user@example.com',
        subject: emailSubject,
        content: emailContent,
        template: notification.type,
        data: notification.data
      });

      // Marquer comme envoyé
      await supabase
        .from('notifications')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', notification.id);

    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
    }
  }
};

// Créer une notification de bienvenue
export const createWelcomeNotification = async (userId: string, firstName: string): Promise<void> => {
  await createNotification({
    user_id: userId,
    type: 'welcome',
    title: 'Bienvenue sur BillsFac !',
    message: 'Découvrez toutes les fonctionnalités de votre tableau de bord.',
    data: { first_name: firstName }
  });
};

// Vérifier les factures impayées et créer des notifications
export const checkOverdueInvoices = async (): Promise<void> => {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, clients(*)')
    .eq('status', 'sent')
    .lt('due_date', new Date().toISOString());

  if (error) throw error;

  for (const invoice of invoices || []) {
    // Vérifier si une notification n'a pas déjà été envoyée
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', invoice.user_id)
      .eq('type', 'payment_overdue')
      .eq('data->>invoice_id', invoice.id)
      .single();

    if (!existingNotification) {
      await createNotification({
        user_id: invoice.user_id,
        type: 'payment_overdue',
        title: 'Facture impayée',
        message: `La facture ${invoice.invoice_number} est impayée`,
        data: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.total_amount,
          due_date: invoice.due_date,
          client_name: invoice.clients?.company_name || 
                      `${invoice.clients?.first_name} ${invoice.clients?.last_name}`,
          client_email: invoice.clients?.email
        }
      });
    }
  }
};

// Vérifier les devis expirants
export const checkExpiringQuotes = async (): Promise<void> => {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*, clients(*)')
    .eq('status', 'sent')
    .lte('expiry_date', threeDaysFromNow.toISOString());

  if (error) throw error;

  for (const quote of quotes || []) {
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', quote.user_id)
      .eq('type', 'quote_expiring')
      .eq('data->>quote_id', quote.id)
      .single();

    if (!existingNotification) {
      await createNotification({
        user_id: quote.user_id,
        type: 'quote_expiring',
        title: 'Devis arrivant à expiration',
        message: `Le devis ${quote.quote_number} expire bientôt`,
        data: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          amount: quote.total_amount,
          expiry_date: quote.expiry_date,
          client_name: quote.clients?.company_name || 
                      `${quote.clients?.first_name} ${quote.clients?.last_name}`,
          client_email: quote.clients?.email
        }
      });
    }
  }
};

// Fonction principale pour traiter toutes les notifications
export const processAllNotifications = async (): Promise<void> => {
  try {
    await checkOverdueInvoices();
    await checkExpiringQuotes();
    await processScheduledNotifications();
  } catch (error) {
    console.error('Error processing notifications:', error);
  }
};
