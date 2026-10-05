import { create } from 'zustand';

interface AuthModalState {
  isOpen: boolean;
  callbackUrl: string | null;
  view: 'signin' | 'signup';
  openModal: (options?: { view?: 'signin' | 'signup'; callbackUrl?: string }) => void;
  closeModal: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  callbackUrl: null,
  view: 'signin',
  openModal: (options) => 
    set((state) => ({ 
      isOpen: true, 
      view: options?.view || state.view,
      callbackUrl: options?.callbackUrl || state.callbackUrl 
    })),
  closeModal: () => set({ isOpen: false }),
}));