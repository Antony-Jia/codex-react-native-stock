import { useCallback, useMemo, useReducer } from 'react';
import { ApiSpec } from '../types';
import { mockApiSpecs } from '../api/mock';

export type ApiRegistryAction =
  | { type: 'create'; payload: ApiSpec }
  | { type: 'update'; payload: ApiSpec }
  | { type: 'remove'; payload: string }
  | { type: 'bulk-import'; payload: ApiSpec[] };

const registryReducer = (state: ApiSpec[], action: ApiRegistryAction): ApiSpec[] => {
  switch (action.type) {
    case 'create':
      return [...state, action.payload];
    case 'update':
      return state.map(api => (api.id === action.payload.id ? action.payload : api));
    case 'remove':
      return state.filter(api => api.id !== action.payload);
    case 'bulk-import':
      return [...state, ...action.payload.filter(api => !state.some(existing => existing.id === api.id))];
    default:
      return state;
  }
};

export const useApiRegistry = (initialState: ApiSpec[] = mockApiSpecs) => {
  const [apis, dispatch] = useReducer(registryReducer, initialState);

  const findById = useCallback(
    (id: string) => apis.find(api => api.id === id),
    [apis]
  );

  const groupedByStatus = useMemo(() => {
    return apis.reduce(
      (acc, api) => {
        acc[api.status] = (acc[api.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [apis]);

  return { apis, dispatch, findById, groupedByStatus };
};
