import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

type Page =
  | 'landing'
  | 'dashboard'
  | 'worker';

export type LegalDoc = 'privacy' | 'terms' | 'provider' | 'liability';

interface AppContextType {
  page: Page;

  navigate: (page: Page) => void;

  authModalOpen: boolean;

  authModalTab: 'login' | 'signup';

  openAuthModal: (
    tab?: 'login' | 'signup'
  ) => void;

  closeAuthModal: () => void;
  openLegal: (doc: LegalDoc) => void;
  legalDoc: LegalDoc | null;
  closeLegal: () => void;
}

const AppContext =
  createContext<AppContextType | null>(
    null
  );

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [page, setPage] =
    useState<Page>('landing');

  const [authModalOpen, setAuthModalOpen] =
    useState(false);

  const [authModalTab, setAuthModalTab] =
    useState<'login' | 'signup'>(
      'login'
    );

  const [legalDoc, setLegalDoc] =
    useState<LegalDoc | null>(null);

  const openLegal = (doc: LegalDoc) => setLegalDoc(doc);
  const closeLegal = () => setLegalDoc(null);

  const navigate = (page: Page) => {
    setPage(page);
  };

  const openAuthModal = (
    tab: 'login' | 'signup' = 'login'
  ) => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        page,
        navigate,

        authModalOpen,
        authModalTab,

        openAuthModal,
        closeAuthModal,
        openLegal,
        legalDoc,
        closeLegal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }

  return context;
}
