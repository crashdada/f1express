import { useState, useEffect } from 'react';
import { IDriver2026, ITeam2026 } from '../types';

export const REMOTE_DATA_BASE_URL = 'https://ghproxy.net/https://raw.githubusercontent.com/crashdada/f1-collector/main/data';

interface F1Event {
    round: string;
    country: string;
    gpName: string;
    dates: string;
    image: string | null;
    flag?: string;
    slug?: string;
    sessions?: { name: string; time: string }[];
}

export interface IRaceResult2026 {
    pos: number | null;
    firstName: string;
    lastName: string;
    firstNameCn: string;
    lastNameCn: string;
    code: string;
    number: number;
    team: string;
    teamCn: string;
    points: number;
    status: string;
}

export interface IRaceRound2026 {
    round: number;
    country: string;
    slug: string;
    date: string;
    polePosition?: {
        time: string;
        code: string;
        firstName: string;
        lastName: string;
        firstNameCn: string;
        lastNameCn: string;
    };
    results: IRaceResult2026[];
}

interface DynamicDataState {
    schedule: F1Event[];
    drivers: IDriver2026[];
    teams: ITeam2026[];
    raceResults: IRaceRound2026[];
    loading: boolean;
    error: Error | null;
}

export function useDynamic2026Data() {
    const [data, setData] = useState<DynamicDataState>({
        schedule: [],
        drivers: [],
        teams: [],
        raceResults: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const timestamp = Date.now();
                // 1. 优先加载本地打包好的基础数据 (Local fallback)
                const [sRes, dRes, tRes, rRes] = await Promise.all([
                    fetch(`/data/schedule_2026.json?t=${timestamp}`),
                    fetch(`/data/drivers_2026.json?t=${timestamp}`),
                    fetch(`/data/teams_2026.json?t=${timestamp}`),
                    fetch(`/data/results_2026.json?t=${timestamp}`).catch(() => null),
                ]);

                const processAssets = (items: any[]) => items.map(item => {
                    const addTs = (url: string | null | undefined) => {
                        if (!url) return url;
                        if (url.startsWith('http')) return url; // Don't add timestamp to remote F1 CDN assets
                        return `${url}?v=${timestamp}`;
                    };
                    return {
                        ...item,
                        image: addTs(item.image),
                        detailedImage: addTs(item.detailedImage),
                        flag: addTs(item.flag),
                        officialImage: addTs(item.officialImage),
                        logo: addTs(item.logo),
                        carImage: addTs(item.carImage)
                    };
                });

                const raceResults: IRaceRound2026[] = (rRes && rRes.ok) ? await rRes.json() : [];

                if (isMounted) {
                    setData({
                        schedule: processAssets(await sRes.json()),
                        drivers: processAssets(await dRes.json()),
                        teams: processAssets(await tRes.json()),
                        raceResults,
                        loading: false,
                        error: null,
                    });
                }

                // 2. 后台静默拉取 GitHub 上的最新数据 (Remote update)
                try {
                    const [sRem, dRem, tRem, rRem] = await Promise.all([
                        fetch(`${REMOTE_DATA_BASE_URL}/schedule_2026.json?t=${timestamp}`),
                        fetch(`${REMOTE_DATA_BASE_URL}/drivers_2026.json?t=${timestamp}`),
                        fetch(`${REMOTE_DATA_BASE_URL}/teams_2026.json?t=${timestamp}`),
                        fetch(`${REMOTE_DATA_BASE_URL}/results_2026.json?t=${timestamp}`).catch(() => null),
                    ]);

                    if (isMounted && sRem.ok && dRem.ok && tRem.ok) {
                        const newSchedule = await sRem.json();
                        const newDrivers = processAssets(await dRem.json());
                        const newTeams = processAssets(await tRem.json());
                        const newResults: IRaceRound2026[] = (rRem && rRem.ok) ? await rRem.json() : [];

                        // 防护机制: 检查远端数据完整性，如果 GitHub Actions 意外抓取了破损的数据，拒绝同步并继续使用本地良好数据
                        if (newSchedule.length < 20 || newDrivers.length === 0 || newTeams.length === 0) {
                            console.warn('⚠️ 远端 GitHub 数据完整性校验失败 (检测到赛程 < 20)，触发保护机制，继续使用本地数据。');
                            return;
                        }

                        if (isMounted) {
                            setData(prev => ({
                                ...prev,
                                schedule: processAssets(newSchedule),
                                drivers: newDrivers,
                                teams: newTeams,
                                raceResults: newResults.length > 0 ? newResults : prev.raceResults,
                            }));
                            console.log('🔄 Data successfully synced and seamlessly updated from GitHub');
                        }
                    }
                } catch (remoteErr) {
                    console.warn('⚠️ 后台数据静默拉取失败，继续使用本地数据', remoteErr);
                }

            } catch (err) {
                console.error('Failed to load local baseline data', err);
                if (isMounted) {
                    setData(prev => ({ ...prev, loading: false, error: err as Error }));
                }
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, []);

    return data;
}
