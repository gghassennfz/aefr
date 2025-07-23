'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getUserProfile, getUserBusiness } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Business = Database['public']['Tables']['businesses']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  business: Business | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data when user changes
  const loadUserData = async (user: User | null) => {
    if (!user) {
      setProfile(null);
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      // Try to load profile
      let profileData;
      try {
        profileData = await getUserProfile(user.id, { headers: { Accept: 'application/json' } });
      } catch (profileError: any) {
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          const { error: createError, status: createStatus } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              role: 'user',
            });
          // If duplicate (409), just fetch again
          if (createError && createStatus !== 409) throw createError;
          // Try to load profile again
          profileData = await getUserProfile(user.id, { headers: { Accept: 'application/json' } });
        } else {
          throw profileError;
        }
      }
      setProfile(profileData);

      // Try to load business info
      let businessData;
      try {
        businessData = await getUserBusiness(user.id, { headers: { Accept: 'application/json' } });
      } catch (businessError: any) {
        // If business doesn't exist, create it
        if (businessError.code === 'PGRST116') {
          console.log('Business not found, creating default business...');
          const { error: createError, status: createStatus } = await supabase
            .from('businesses')
            .insert({
              user_id: user.id,
              company_name: 'Mon Entreprise',
              auto_entrepreneur_regime: true,
              quarterly_declaration: true,
            });
          // If duplicate (409), just fetch again
          if (createError && createStatus !== 409) throw createError;
          // Try to load business again
          businessData = await getUserBusiness(user.id, { headers: { Accept: 'application/json' } });
        } else {
          throw businessError;
        }
      }
      setBusiness(businessData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadUserData(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setBusiness(null);
          setLoading(false);
        } else if (session?.user) {
          await loadUserData(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (loading) return; // Prevent multiple simultaneous login attempts
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Don't call loadUserData here - it will be called by useEffect when user changes
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, companyName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          role: 'user',
        });
      
      if (profileError) throw profileError;
      
      // Create business
      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          user_id: data.user.id,
          company_name: companyName,
          auto_entrepreneur_regime: true,
          quarterly_declaration: true,
        });
      
      if (businessError) throw businessError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Non connecté');
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    setProfile(data);
  };

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!user) throw new Error('Non connecté');
    
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    setBusiness(data);
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  const value = {
    user,
    profile,
    business,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updateBusiness,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
