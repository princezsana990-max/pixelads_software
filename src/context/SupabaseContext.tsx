import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getSupabaseCredentials,
  saveRuntimeCredentials,
  clearRuntimeCredentials,
  testSupabaseConnection,
  ConnectionTestResult,
} from '../lib/supabase';

interface SupabaseContextType {
  isConfigured: boolean;
  isConnected: boolean;
  isChecking: boolean;
  connectionResult: ConnectionTestResult | null;
  missingVars: string[];
  testConnection: (customUrl?: string, customKey?: string) => Promise<ConnectionTestResult>;
  saveCredentials: (url: string, key: string) => Promise<boolean>;
  clearCredentials: () => void;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState(getSupabaseCredentials);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);

  const performCheck = useCallback(async (url?: string, key?: string) => {
    setIsChecking(true);
    const result = await testSupabaseConnection(url, key);
    setConnectionResult(result);
    setIsConnected(result.success);
    setIsChecking(false);
    return result;
  }, []);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setCredentials(creds);
    if (creds.isConfigured) {
      performCheck();
    } else {
      setIsChecking(false);
      setIsConnected(false);
    }
  }, [performCheck]);

  const saveCredentials = async (url: string, key: string): Promise<boolean> => {
    setIsChecking(true);
    const result = await performCheck(url, key);
    if (result.success) {
      saveRuntimeCredentials(url, key);
      setCredentials(getSupabaseCredentials());
      setIsConnected(true);
      return true;
    }
    setIsChecking(false);
    return false;
  };

  const clearCredentials = () => {
    clearRuntimeCredentials();
    setCredentials(getSupabaseCredentials());
    setIsConnected(false);
    setConnectionResult(null);
  };

  return (
    <SupabaseContext.Provider
      value={{
        isConfigured: credentials.isConfigured,
        isConnected,
        isChecking,
        connectionResult,
        missingVars: credentials.missingVars,
        testConnection: performCheck,
        saveCredentials,
        clearCredentials,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
