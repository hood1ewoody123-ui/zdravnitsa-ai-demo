import { create } from "zustand";

type UiState = {
  interceptStatus: string;
  setInterceptStatus: (value: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  interceptStatus: "",
  setInterceptStatus: (value) => set({ interceptStatus: value }),
}));
