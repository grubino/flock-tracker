import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AuthProvider } from '../contexts/AuthContext';

// Create a test query client with network call prevention
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        networkMode: 'offlineFirst', // Prefer cache over network in tests
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {}, // Suppress query errors in tests
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <FluentProvider theme={webLightTheme}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </AuthProvider>
    </FluentProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
