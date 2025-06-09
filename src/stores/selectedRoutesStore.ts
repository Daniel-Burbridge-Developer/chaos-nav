import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Trip } from '~/db/schema/trips';
import type {} from '@redux-devtools/extension'; // required for devtools typing

export interface SelectedRoute {
  name: string;
  trips: Trip[];
}
interface SelectedRoutesState {
  selectedRoutes: SelectedRoute[];
  addRoute: (route: SelectedRoute) => void;
}

export const useSelectedRoutesStore = create<SelectedRoutesState>((set) => ({
  selectedRoutes: [],
  addRoute: (route) =>
    set((state) => ({
      selectedRoutes: [...state.selectedRoutes, route],
    })),
}));
