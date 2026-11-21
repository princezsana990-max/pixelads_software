import React, { createContext, useContext, useEffect, useState } from 'react';
import { CompanySettings } from '../lib/types';
import { getSupabaseClient } from '../lib/supabase';
import { useSupabase } from './SupabaseContext';

interface CompanySettingsContextType {
  settings: CompanySettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: CompanySettings = {
  id: '',
  company_name: 'OrderFlow Pro',
  logo_url: null,
  address: 'Plot 42, Commercial Avenue, Phase 5, Karachi',
  contact_number: '+92 300 1234567',
  email: 'operations@pixelads.com',
  website: 'https://pixelads.com',
  timezone: 'Asia/Karachi',
  currency: 'PKR',
  date_format: 'YYYY-MM-DD',
  time_format: '12h',
  theme: 'light',
  pdf_header_text: 'OrderFlow Pro — Enterprise Order Management & Analytics',
  pdf_footer_text: 'Thank you for partnering with Pixelads. All rights reserved.',
  pdf_logo_position: 'left',
  signature_url: null,
  stamp_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected } = useSupabase();
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    if (!isConnected) {
      setIsLoading(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await client
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Could not load company_settings:', error.message);
      } else if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isConnected]);

  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      if (settings.id) {
        const { error } = await client
          .from('company_settings')
          .update({ ...newSettings, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await client
          .from('company_settings')
          .insert([{ ...DEFAULT_SETTINGS, ...newSettings }])
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data);
      }
      await fetchSettings();
      return true;
    } catch (err) {
      console.error('Failed to update company settings:', err);
      return false;
    }
  };

  return (
    <CompanySettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </CompanySettingsContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};
