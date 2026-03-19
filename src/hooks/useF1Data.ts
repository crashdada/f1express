import { useEffect, useCallback } from 'react';
import { useF1 } from '../context/F1Context';
import { loadF1Data } from '../utils/f1Data';

export function useF1Data() {
  const { state, dispatch } = useF1();

  const fetchData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const data = await loadF1Data();
      dispatch({ type: 'SET_DRIVERS', payload: data.drivers });
      dispatch({ type: 'SET_TEAMS', payload: data.teams });
      dispatch({ type: 'SET_RACE_RESULTS', payload: data.raceResults });
      dispatch({ type: 'SET_SCHEDULE', payload: data.schedule });
      dispatch({ type: 'SET_RACE_INFO', payload: data.raceInfo });
      dispatch({ type: 'SET_PHOTOS_INDEX', payload: data.photosIndex });
      dispatch({ type: 'SET_DRIVER_CHAMPIONSHIPS', payload: data.driverChampionships });
    } catch (error) {
      console.error('Error fetching F1 data:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '加载数据失败',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    if (state.drivers.length === 0 && !state.loading && !state.error) {
      fetchData();
    }
  }, [state.drivers.length, state.loading, state.error, fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}

export function useFilteredDrivers() {
  const { state } = useF1();

  return state.drivers.filter((driver) => {
    const matchesSearch =
      !state.searchQuery ||
      driver.firstName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      driver.lastName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      driver.code.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      driver.team.toLowerCase().includes(state.searchQuery.toLowerCase());

    return matchesSearch;
  });
}

export function useFilteredRaces() {
  const { state } = useF1();

  return state.raceResults.filter((result) => {
    const matchesSearch =
      !state.searchQuery ||
      result.grandPrix?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      result.circuit?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      result.firstName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      result.lastName.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesSeason = !state.selectedSeason || result.season === state.selectedSeason;

    return matchesSearch && matchesSeason;
  });
}

export function useTopDrivers(limit: number = 5) {
  const { state } = useF1();
  return state.drivers.slice(0, limit);
}

export function useTopTeams(limit: number = 5) {
  const { state } = useF1();
  return state.teams.slice(0, limit);
}
