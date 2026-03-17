const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.F1_DB_PATH || path.join(__dirname, '..', '..', 'public', 'data', 'f1.db');
const db = new Database(dbPath);

// 读取特殊事件配置
const specialEventsPath = path.join(__dirname, 'special_events.json');
const specialEvents = JSON.parse(fs.readFileSync(specialEventsPath, 'utf8'));

// Complete historical F1 scoring rules based on Wikipedia
const scoringRules = {
    // 1950s - Early era with fastest lap bonus
    1950: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 4 },
    1951: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 4 },
    1952: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 4 },
    1953: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 4 },
    1954: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 5 }, // Fixed: was 4
    1955: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 5 }, // Fixed: was 4
    1956: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 5 }, // Fixed: was 4
    1957: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 5 }, // Fixed: was 4
    1958: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 6 },
    1959: { positions: 5, points: [8, 6, 4, 3, 2], bestResults: 5 }, // Fixed: was 'all'
    1960: { positions: 6, points: [8, 6, 4, 3, 2, 1], bestResults: 6 }, // Fixed: 6th place gets 1 point

    // 1960s - Introduction of 6th place points
    1961: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 5 }, // Fixed: was 6
    1962: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 5 }, // Fixed: was 6
    1963: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 6 },
    1964: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 6 },
    1965: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 6 },
    1966: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 5 },

    // 1967-1980 - Split scoring era (best X from first Y, best Z from last W)
    1967: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [6, 5], last: [5, 4] } },
    1968: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [6, 5], last: [6, 5] } },
    1969: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [6, 5], last: [5, 4] } },
    1970: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [7, 6], last: [6, 5] } },
    1971: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [6, 5], last: [5, 4] } },
    1972: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [6, 5], last: [6, 5] } },
    1973: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [8, 7], last: [7, 6] } },
    1974: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [8, 7], last: [7, 6] } },
    1975: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [7, 6], last: [7, 6] } },
    1976: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [8, 7], last: [8, 7] } },
    1977: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [9, 8], last: [8, 7] } },
    1978: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [8, 7], last: [8, 7] } },
    1979: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [7, 4], last: [8, 4] } },
    1980: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: { type: 'split', first: [7, 5], last: [7, 5] } },

    // 1981-1990 - Best 11 results
    1981: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1982: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1983: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1984: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1985: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1986: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1987: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1988: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1989: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },
    1990: { positions: 6, points: [9, 6, 4, 3, 2, 1], bestResults: 11 },

    // 1991-2002 - All results count
    1991: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' }, // Fixed: was 11
    1992: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1993: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1994: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1995: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1996: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1997: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1998: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    1999: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    2000: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    2001: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },
    2002: { positions: 6, points: [10, 6, 4, 3, 2, 1], bestResults: 'all' },

    // 2003-2009 - 8 positions score
    2003: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' }, // Fixed: was 18
    2004: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },
    2005: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },
    2006: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },
    2007: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },
    2008: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },
    2009: { positions: 8, points: [10, 8, 6, 5, 4, 3, 2, 1], bestResults: 'all' },

    // 2010+ - Modern era
    2010: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2011: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2012: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2013: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2014: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2015: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2016: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2017: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2018: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2019: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2020: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2021: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2022: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2023: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2024: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
    2025: { positions: 10, points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], bestResults: 'all' },
};

function getPointsForPosition(position, season) {
    if (!position || position === 'DNF' || position === 'NC' || position === 'DNS') {
        return 0;
    }
    const rules = scoringRules[season] || scoringRules[2020];
    if (position <= rules.positions) {
        return rules.points[position - 1];
    }
    return 0;
}

function getBestResultsLimit(season) {
    const rules = scoringRules[season] || scoringRules[2020];
    return rules.bestResults;
}

// Calculate split points for 1967-1980 era
function calculateSplitPoints(races, splitRule) {
    const [firstN, bestFirst] = splitRule.first;
    const [lastN, bestLast] = splitRule.last;

    const firstRaces = races.slice(0, firstN).map(r => r.points).sort((a, b) => b - a);
    const lastRaces = races.slice(firstN).map(r => r.points).sort((a, b) => b - a);

    const firstPoints = firstRaces.slice(0, bestFirst).reduce((sum, p) => sum + p, 0);
    const lastPoints = lastRaces.slice(0, bestLast).reduce((sum, p) => sum + p, 0);

    return firstPoints + lastPoints;
}

console.log('=== F1 Championships Calculator (Corrected Historical Rules) ===\n');

// Get all race results
const results = db.prepare(`
  SELECT rr.driver_id, t.team_id, r.season, r.round_number, rr.position, rr.points
  FROM race_results rr
  JOIN races r ON rr.race_id = r.race_id
  JOIN teams t ON rr.team_id = t.team_id
  ORDER BY r.season, r.round_number, rr.position
`).all();

console.log(`Total results: ${results.length}\n`);

// Get teams
const teams = db.prepare('SELECT team_id, name, full_name FROM teams').all();
const teamMap = {};
teams.forEach(t => {
    teamMap[t.team_id] = t.name;
});

// Get drivers
const drivers = db.prepare('SELECT driver_id, first_name, last_name FROM drivers').all();
const driverMap = {};
drivers.forEach(d => driverMap[d.driver_id] = d.first_name + ' ' + d.last_name);

// Calculate driver points by season
const driverSeasons = {};
results.forEach(r => {
    const key = `${r.driver_id}_${r.season}`;
    if (!driverSeasons[key]) {
        driverSeasons[key] = { driver_id: r.driver_id, season: r.season, races: [], team_id: r.team_id };
    }

    let points = r.points;
    if (points === null || points === undefined) {
        points = getPointsForPosition(r.position, r.season);
    }

    driverSeasons[key].races.push({ position: r.position, points, team_id: r.team_id });
});

// Calculate final driver standings
const driverStandings = [];
Object.values(driverSeasons).forEach(ds => {
    const limit = getBestResultsLimit(ds.season);
    let totalPoints = 0;

    // Handle split scoring (1967-1980)
    if (limit && typeof limit === 'object' && limit.type === 'split') {
        totalPoints = calculateSplitPoints(ds.races, limit);
    } else {
        ds.races.sort((a, b) => b.points - a.points);

        if (limit === 'all') {
            totalPoints = ds.races.reduce((sum, r) => sum + r.points, 0);
        } else {
            totalPoints = ds.races.slice(0, limit).reduce((sum, r) => sum + r.points, 0);
        }
    }

    driverStandings.push({
        driver_id: ds.driver_id,
        season: ds.season,
        points: totalPoints,
        team_id: ds.team_id
    });
});

// Calculate team points by season
const teamSeasons = {};
results.forEach(r => {
    if (!r.team_id) return;

    const key = `${r.team_id}_${r.season}`;
    if (!teamSeasons[key]) {
        teamSeasons[key] = { team_id: r.team_id, season: r.season, races: {} };
    }

    // Group by round_number
    if (!teamSeasons[key].races[r.round_number]) {
        teamSeasons[key].races[r.round_number] = [];
    }

    let points = r.points;
    if (points === null || points === undefined) {
        points = getPointsForPosition(r.position, r.season);
    }

    teamSeasons[key].races[r.round_number].push({ points });
});

// Calculate final team standings (WCC started in 1958)
const teamStandings = [];
Object.values(teamSeasons).forEach(ts => {
    // Skip seasons before 1958 - Constructor's Championship didn't exist yet
    if (ts.season < 1958) {
        return;
    }

    const seasonPoints = [];

    // Calculate points for each race based on rules
    Object.values(ts.races).forEach(racePoints => {
        let raceTotal = 0;

        // Rule: Before 1979, only the best car counts towards Constructor's Championship
        if (ts.season < 1979) {
            raceTotal = Math.max(...racePoints.map(p => p.points));
        } else {
            // From 1979 onwards, all cars count (sum)
            raceTotal = racePoints.reduce((sum, p) => sum + p.points, 0);
        }

        if (raceTotal > 0) {
            seasonPoints.push(raceTotal);
        }
    });

    // Apply "Best N Results" rule to team points (same as drivers)
    const limit = getBestResultsLimit(ts.season);
    let totalPoints = 0;

    // Handle split scoring (1967-1980)
    if (limit && typeof limit === 'object' && limit.type === 'split') {
        const races = seasonPoints.map(p => ({ points: p }));
        totalPoints = calculateSplitPoints(races, limit);
    } else {
        seasonPoints.sort((a, b) => b - a);

        if (limit === 'all') {
            totalPoints = seasonPoints.reduce((sum, p) => sum + p, 0);
        } else {
            totalPoints = seasonPoints.slice(0, limit).reduce((sum, p) => sum + p, 0);
        }
    }

    teamStandings.push({
        team_id: ts.team_id,
        season: ts.season,
        points: totalPoints
    });
});

// Group by season for display
const driverBySeason = {};
driverStandings.forEach(ds => {
    if (!driverBySeason[ds.season]) driverBySeason[ds.season] = [];
    driverBySeason[ds.season].push(ds);
});

const teamBySeason = {};
teamStandings.forEach(ts => {
    if (!teamBySeason[ts.season]) teamBySeason[ts.season] = [];
    teamBySeason[ts.season].push(ts);
});

console.log('=== Driver Champions by Season (Top 10 Recent) ===\n');
Object.keys(driverBySeason).sort((a, b) => b - a).slice(0, 10).forEach(season => {
    driverBySeason[season].sort((a, b) => b.points - a.points);
    const champion = driverBySeason[season][0];
    const driverName = driverMap[champion.driver_id];
    const teamName = teamMap[champion.team_id];
    console.log(`${season}: ${driverName} (${teamName}) - ${champion.points} pts`);
});

console.log('\n=== Team Champions by Season (Top 10 Recent) ===\n');
Object.keys(teamBySeason).sort((a, b) => b - a).slice(0, 10).forEach(season => {
    teamBySeason[season].sort((a, b) => b.points - a.points);
    const champion = teamBySeason[season][0];
    const teamName = teamMap[champion.team_id];
    console.log(`${season}: ${teamName} - ${champion.points} pts`);
});

// Clear and recreate championships tables
console.log('\n=== Updating Database ===\n');

const insertDriverChamp = db.prepare(`
  INSERT INTO driver_championships (driver_id, season, points, team_id, rank)
  VALUES (?, ?, ?, ?, ?)
`);

const bySeason = {};
driverStandings.forEach(ds => {
    if (!bySeason[ds.season]) bySeason[ds.season] = [];
    bySeason[ds.season].push(ds);
});

const insertTeamChamp = db.prepare(`
  INSERT INTO team_championships (team_id, season, points, rank)
  VALUES (?, ?, ?, ?)
`);

// 包装为一个完整的事务以极大避免 SQLite I/O 引起的写盘瓶颈
const saveChampionshipsTransaction = db.transaction(() => {
    db.exec('DELETE FROM driver_championships');
    db.exec('DELETE FROM team_championships');

    Object.values(bySeason).forEach((seasonData) => {
        seasonData.sort((a, b) => b.points - a.points);

        // 应用特殊事件：车手冠军车队手动指定
        const season = seasonData[0]?.season;
        if (season && specialEvents.driver_championship_overrides) {
            const overrides = specialEvents.driver_championship_overrides.filter(o => o.year === season);
            overrides.forEach(override => {
                const driverRecord = seasonData.find(ds => {
                    const name = driverMap[ds.driver_id];
                    return name === override.driver || name === (override.firstName + ' ' + override.lastName);
                });
                if (driverRecord) {
                    // 找到目标车队ID
                    const targetTeam = teams.find(t => t.name === override.team || t.full_name === override.team_en);
                    if (targetTeam) {
                        console.log(`\n🏆 应用修正: ${season}年 ${override.driver} 的冠军车队设置为 ${override.team}`);
                        driverRecord.team_id = targetTeam.team_id;
                    }
                }
            });
        }

        seasonData.forEach((ds, rank) => {
            insertDriverChamp.run(ds.driver_id, ds.season, ds.points, ds.team_id, rank + 1);
        });
    });

    Object.values(teamBySeason).forEach((seasonData) => {
        seasonData.sort((a, b) => b.points - a.points);

        // 应用特殊事件：车队取消资格
        const season = seasonData[0]?.season;
        if (season && specialEvents.constructor_disqualifications) {
            const disqualification = specialEvents.constructor_disqualifications.find(d => d.year === season);
            if (disqualification) {
                // 找到被取消资格的车队
                const disqualifiedTeam = seasonData.find(ts => teamMap[ts.team_id] === disqualification.team);
                if (disqualifiedTeam) {
                    console.log(`\n⚠️  应用特殊事件: ${season}年 ${disqualification.team} 被取消车队冠军资格`);
                    console.log(`   原因: ${disqualification.reason}`);
                    console.log(`   原积分: ${disqualifiedTeam.points} → 最终积分: ${disqualification.final_points}`);

                    // 将该车队积分设为0并移到最后
                    disqualifiedTeam.points = disqualification.final_points;
                    seasonData = seasonData.filter(ts => ts.team_id !== disqualifiedTeam.team_id);
                    seasonData.push(disqualifiedTeam);
                }
            }
        }

        seasonData.forEach((ts, rank) => {
            insertTeamChamp.run(ts.team_id, ts.season, ts.points, rank + 1);
        });
    });
});

// 执行事务
saveChampionshipsTransaction();

console.log('[OK] Championships calculated and saved!');

db.close();
