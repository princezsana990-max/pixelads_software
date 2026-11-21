import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseProvider } from './context/SupabaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { DateRangeProvider } from './context/DateRangeContext';
import { CompanySettingsProvider } from './context/CompanySettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <SupabaseProvider>
            <ThemeProvider>
              <DateRangeProvider>
                <CompanySettingsProvider>
                  <App />
                </CompanySettingsProvider>
              </DateRangeProvider>
            </ThemeProvider>
          </SupabaseProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
