import { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useState } from 'react';
import { Driver, Team, RaceResult, Schedule, RaceInfo } from '../types';

type ThemePreference = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface F1State {
  drivers: Driver[];
  teams: Team[];
  raceResults: RaceResult[];
  schedule: Schedule[];
  raceInfo: RaceInfo[];
  loading: boolean;
  error: string | null;
  selectedDriver: Driver | null;
  selectedTeam: Team | null;
  selectedSeason: number | null;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  theme: ThemePreference;
  photosIndex: string[];
  driverChampionships: { driverId: number, season: number, rank: number }[];
}

type F1Action =
  | { type: 'SET_DRIVERS'; payload: Driver[] }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_RACE_RESULTS'; payload: RaceResult[] }
  | { type: 'SET_SCHEDULE'; payload: Schedule[] }
  | { type: 'SET_RACE_INFO'; payload: RaceInfo[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_DRIVER'; payload: Driver | null }
  | { type: 'SELECT_TEAM'; payload: Team | null }
  | { type: 'SELECT_SEASON'; payload: number | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_THEME'; payload: ThemePreference }
  | { type: 'SET_PHOTOS_INDEX'; payload: string[] }
  | { type: 'SET_DRIVER_CHAMPIONSHIPS'; payload: { driverId: number, season: number, rank: number }[] }
  | { type: 'RESET_FILTERS' };

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getInitialTheme = (): ThemePreference => {
  const savedTheme = localStorage.getItem('f1-theme');
  if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
    return savedTheme;
  }
  return getSystemTheme();
};

const initialState: F1State = {
  drivers: [],
  teams: [],
  raceResults: [],
  schedule: [],
  raceInfo: [],
  loading: false,
  error: null,
  selectedDriver: null,
  selectedTeam: null,
  selectedSeason: null,
  searchQuery: '',
  viewMode: 'grid',
  theme: getInitialTheme(),
  photosIndex: [],
  driverChampionships: [],
};

function f1Reducer(state: F1State, action: F1Action): F1State {
  switch (action.type) {
    case 'SET_DRIVERS':
      return { ...state, drivers: action.payload };
    case 'SET_TEAMS':
      return { ...state, teams: action.payload };
    case 'SET_RACE_RESULTS':
      return { ...state, raceResults: action.payload };
    case 'SET_SCHEDULE':
      return { ...state, schedule: action.payload };
    case 'SET_RACE_INFO':
      return { ...state, raceInfo: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SELECT_DRIVER':
      return { ...state, selectedDriver: action.payload };
    case 'SELECT_TEAM':
      return { ...state, selectedTeam: action.payload };
    case 'SELECT_SEASON':
      return { ...state, selectedSeason: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_PHOTOS_INDEX':
      return { ...state, photosIndex: action.payload };
    case 'SET_DRIVER_CHAMPIONSHIPS':
      return { ...state, driverChampionships: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        selectedDriver: null,
        selectedTeam: null,
        selectedSeason: null,
        searchQuery: '',
      };
    default:
      return state;
  }
}

interface IF1ContextType {
  state: F1State;
  dispatch: React.Dispatch<F1Action>;
  resolvedTheme: ResolvedTheme;
}

const F1Context = createContext<IF1ContextType | undefined>(undefined);

export function F1Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(f1Reducer, initialState);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? 'dark' : 'light');
    };

    syncSystemTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSystemTheme(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    return state.theme === 'system' ? systemTheme : state.theme;
  }, [state.theme, systemTheme]);

  // 持久化主题并应用类名
  useEffect(() => {
    localStorage.setItem('f1-theme', state.theme);
    updateThemeClass(resolvedTheme);
  }, [resolvedTheme, state.theme]);

  return (
    <F1Context.Provider value={{ state, dispatch, resolvedTheme }}>
      {children}
    </F1Context.Provider>
  );
}

const updateThemeClass = (theme: ResolvedTheme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export function useF1() {
  const context = useContext(F1Context);
  if (context === undefined) {
    throw new Error('useF1 must be used within a F1Provider');
  }
  return context;
}

export type { F1State, F1Action, ThemePreference, ResolvedTheme };
