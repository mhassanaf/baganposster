'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Users, Calendar, Settings, Database, 
  ChevronRight, RefreshCw, UserCheck, ShieldAlert, Award,
  Target, Activity, Radio, Swords, Gamepad2, Layers, CheckCircle,
  FileSpreadsheet, Lock, Unlock
} from 'lucide-react';

import SportConfigPanel from './SportConfigPanel';
import StandingsTable from './StandingsTable';
import MatchList from './MatchList';
import BracketView from './BracketView';
import SupabaseSyncPanel from './SupabaseSyncPanel';
import { getSupabaseClient, saveStateToSupabase, fetchStateFromSupabase, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../lib/supabase';

interface Team {
  id: string;
  name: string;
  groupName?: string;
}

interface Match {
  id: string;
  stage: 'group' | 'knockout';
  groupName?: string;
  roundIndex?: number;
  matchIndex?: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  isWO: boolean;
  winnerId: string | null;
  time?: string;
  date?: string;
  venue?: string;
}

interface SportCategoryState {
  sport: string;
  gender: 'putra' | 'putri';
  format: 'grup' | 'gugur' | 'grup_gugur';
  teamCount: number;
  groupCount: number;
  teams: Team[];
  matches: Match[];
  completed: boolean;
}

interface AppState {
  version: string;
  sportsState: Record<string, SportCategoryState>;
  supabaseConfig: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };
}

const SPORTS_LIST = [
  { id: 'futsal', name: 'Futsal', icon: Target },
  { id: 'basket', name: 'Basket', icon: Activity },
  { id: 'volly', name: 'Volly', icon: Radio },
  { id: 'gateball', name: 'Gateball', icon: Layers },
  { id: 'tenis', name: 'Tenis', icon: Trophy },
  { id: 'ml', name: 'Mobile Legends', icon: Swords },
  { id: 'pes', name: 'PES (Esports)', icon: Gamepad2 },
  { id: 'catur', name: 'Catur', icon: Award },
  { id: 'badminton', name: 'Badminton', icon: Radio }
];

export default function SportsDashboard() {
  const [activeTab, setActiveTab] = useState<string>('futsal');
  const [activeGender, setActiveGender] = useState<'putra' | 'putri'>('putra');
  const [showConfig, setShowConfig] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'info' | 'klasemen' | 'jadwal' | 'bagan' | 'database'>('info');
  const [advancingCount, setAdvancingCount] = useState<number>(2);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [state, setState] = useState<AppState>({
    version: '1.0.0',
    sportsState: {},
    supabaseConfig: {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      enabled: true // pre-enable so user syncs automatically with provided details
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const categoryKey = `${activeTab}-${activeGender}`;
  const currentSportState = state.sportsState[categoryKey];

  // Check login status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(data.isLoggedIn);
        }
      } catch (e) {
        console.error("Gagal memeriksa status login:", e);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      if (res.ok) {
        setIsLoggedIn(true);
        setIsLoginModalOpen(false);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        const data = await res.json();
        setLoginError(data.message || 'Username atau password salah.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Terjadi kesalahan sistem. Coba lagi nanti.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setActiveView('info');
    } catch (e) {
      console.error("Gagal logout:", e);
    }
  };

  // Load state from LocalStorage on mount and fetch latest from cloud
  useEffect(() => {
    const initLoad = async () => {
      let loadedState: AppState | null = null;
      try {
        const stored = localStorage.getItem('posster_tournament_state');
        if (stored) {
          loadedState = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Gagal memuat state lokal:", e);
      }

      const defaultState: AppState = {
        version: "1.0",
        sportsState: {},
        supabaseConfig: {
          url: DEFAULT_SUPABASE_URL,
          anonKey: DEFAULT_SUPABASE_ANON_KEY,
          enabled: true
        }
      };

      const finalState = loadedState || defaultState;
      setState(finalState);

      // Try to fetch latest from Cloud automatically on load
      if (finalState.supabaseConfig.enabled) {
        try {
          const client = getSupabaseClient(finalState.supabaseConfig.url, finalState.supabaseConfig.anonKey);
          if (client) {
            setSyncStatus('syncing');
            const cloudData = await fetchStateFromSupabase(client);
            if (cloudData) {
              setState(cloudData);
              localStorage.setItem('posster_tournament_state', JSON.stringify(cloudData));
              setSyncStatus('success');
              setTimeout(() => setSyncStatus('idle'), 2000);
            } else {
              setSyncStatus('idle');
            }
          }
        } catch (err) {
          console.error("Gagal melakukan auto-pull dari cloud:", err);
          setSyncStatus('error');
        }
      }
      setIsLoading(false);
    };

    initLoad();
  }, []);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Sync state to Supabase helper with 1.5s debounce to prevent network congestions & input lags
  const syncToCloud = useCallback((currentState: AppState) => {
    if (!currentState.supabaseConfig.enabled) return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    setSyncStatus('syncing');

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/sync/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ state: currentState })
        });
        if (res.ok) {
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } else {
          setSyncStatus('error');
        }
      } catch (e) {
        console.error("Auto Sync Cloud failed:", e);
        setSyncStatus('error');
      }
    }, 1500);
  }, []);

  // Save state to LocalStorage and trigger cloud sync
  const updateState = (newState: AppState) => {
    setState(newState);
    localStorage.setItem('posster_tournament_state', JSON.stringify(newState));
    syncToCloud(newState);
  };

  // Helper to generate Round-Robin match schedule (staggered round-by-round circle method)
  const generateRoundRobinMatches = (
    sport: string,
    gender: string,
    teams: Team[],
    groupCount: number
  ): Match[] => {
    const matches: Match[] = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Distribute teams to groups by manual groupName or fallback index % groupCount
    const groups: Record<string, Team[]> = {};
    for (let g = 0; g < groupCount; g++) {
      const gName = alphabet[g] || `Grup ${g + 1}`;
      groups[gName] = [];
    }

    teams.forEach((t, idx) => {
      const defaultGroup = alphabet[idx % groupCount] || `Grup ${(idx % groupCount) + 1}`;
      const gName = t.groupName || defaultGroup;
      if (groups[gName]) {
        groups[gName].push(t);
      } else {
        const fallbackGroup = alphabet[0] || 'A';
        if (groups[fallbackGroup]) {
          groups[fallbackGroup].push(t);
        } else {
          groups[gName] = [t];
        }
      }
    });

    // Generate rounds for each group
    const groupRounds: Record<string, Match[][]> = {};
    let maxRoundsCount = 0;

    Object.entries(groups).forEach(([groupName, groupTeams]) => {
      let n = groupTeams.length;
      if (n < 2) return;

      const list = [...groupTeams];
      const hasBye = n % 2 !== 0;
      if (hasBye) {
        list.push(null as any);
        n++;
      }

      const roundsCount = n - 1;
      const matchesPerRound = n / 2;
      if (roundsCount > maxRoundsCount) {
        maxRoundsCount = roundsCount;
      }

      groupRounds[groupName] = Array.from({ length: roundsCount }, () => []);

      for (let round = 0; round < roundsCount; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
          const home = list[match];
          const away = list[n - 1 - match];

          // Skip if one of them is the BYE/null placeholder
          if (home === null || away === null) continue;

          groupRounds[groupName][round].push({
            id: `match-${sport}-${gender}-g-${groupName}-${home.id}-${away.id}`,
            stage: 'group',
            groupName,
            teamAId: home.id,
            teamBId: away.id,
            scoreA: null,
            scoreB: null,
            isWO: false,
            winnerId: null
          });
        }

        // Rotate list (keep first fixed, shift others)
        const last = list.pop()!;
        list.splice(1, 0, last);
      }
    });

    // Interleave rounds: Round 0 of Group A, Round 0 of Group B, etc.
    // This spreads matches so that teams get maximum rest in between.
    for (let r = 0; r < maxRoundsCount; r++) {
      Object.keys(groupRounds).forEach((groupName) => {
        const rounds = groupRounds[groupName];
        if (r < rounds.length) {
          matches.push(...rounds[r]);
        }
      });
    }

    return matches;
  };

  // Helper to generate Knockout bracket matches
  const generateKnockoutMatches = (
    sport: string,
    gender: string,
    teams: Team[]
  ): Match[] => {
    const matches: Match[] = [];
    
    // Pad teams to nearest power of 2 with BYEs
    const n = teams.length;
    let power = 2;
    while (power < n) {
      power *= 2;
    }

    // Standard recursive tournament seeding generator (e.g. for P=8: [1, 8, 4, 5, 2, 7, 3, 6])
    let seeds: number[] = [1, 2];
    while (seeds.length < power) {
      const nextSeeds: number[] = [];
      const target = seeds.length * 2 + 1;
      for (let i = 0; i < seeds.length; i++) {
        nextSeeds.push(seeds[i]);
        nextSeeds.push(target - seeds[i]);
      }
      seeds = nextSeeds;
    }

    const firstRoundMatchesCount = power / 2;
    const firstRoundPairs: { teamA: Team | null; teamB: Team | null }[] = [];

    for (let m = 0; m < firstRoundMatchesCount; m++) {
      const seedA = seeds[m * 2];
      const seedB = seeds[m * 2 + 1];

      // Seed values are 1-indexed. If seed <= n, it points to a real team. Otherwise, it is a BYE (null).
      const teamA = seedA <= n ? teams[seedA - 1] : null;
      const teamB = seedB <= n ? teams[seedB - 1] : null;

      firstRoundPairs.push({ teamA, teamB });
    }

    // Number of rounds
    const rounds = Math.log2(power);

    // Generate matches for each round
    let matchesInRound = firstRoundMatchesCount;
    for (let r = 0; r < rounds; r++) {
      for (let m = 0; m < matchesInRound; m++) {
        let tAId: string | null = null;
        let tBId: string | null = null;
        let scoreA: number | null = null;
        let scoreB: number | null = null;
        let winnerId: string | null = null;

        // Populate first round teams from our pairs
        if (r === 0) {
          const pair = firstRoundPairs[m];
          tAId = pair.teamA ? pair.teamA.id : null;
          tBId = pair.teamB ? pair.teamB.id : null;

          // If one team plays a BYE (null), they automatically advance
          if (tAId && !tBId) {
            scoreA = 1;
            scoreB = 0;
            winnerId = tAId;
          } else if (!tAId && tBId) {
            scoreA = 0;
            scoreB = 1;
            winnerId = tBId;
          }
        }

        matches.push({
          id: `match-${sport}-${gender}-ko-${r}-${m}`,
          stage: 'knockout',
          roundIndex: r,
          matchIndex: m,
          teamAId: tAId,
          teamBId: tBId,
          scoreA,
          scoreB,
          isWO: false,
          winnerId
        });
      }
      matchesInRound /= 2;
    }

    // Add Third Place match if total matches in first round is at least 2
    if (power >= 4) {
      matches.push({
        id: `match-${sport}-${gender}-ko-thirdplace`,
        stage: 'knockout',
        roundIndex: -1, // Special code for Third Place match
        matchIndex: 0,
        teamAId: null,
        teamBId: null,
        scoreA: null,
        scoreB: null,
        isWO: false,
        winnerId: null
      });
    }

    // Auto-progress first round BYEs downstream
    let currentMatches = [...matches];
    currentMatches.forEach((m) => {
      if (m.stage === 'knockout' && m.roundIndex === 0 && m.winnerId) {
        currentMatches = propagateWinnerDownstream(m, currentMatches, r => rounds);
      }
    });

    return currentMatches;
  };

  const propagateWinnerDownstream = (
    match: Match,
    allMatches: Match[],
    getTotalRounds: (maxRound: number) => number
  ): Match[] => {
    const updated = [...allMatches];
    const rIdx = match.roundIndex;
    const mIdx = match.matchIndex;
    
    if (rIdx === undefined || mIdx === undefined || rIdx === -1) return updated;

    const winner = match.winnerId;
    const loser = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;

    const maxRoundIdx = updated.reduce((max, m) => {
      return m.stage === 'knockout' && m.roundIndex !== undefined && m.roundIndex > max ? m.roundIndex : max;
    }, 0);
    const totalRounds = maxRoundIdx + 1;

    // If this is the semifinal, progress the loser to the third-place match
    if (rIdx === totalRounds - 2) {
      const thirdPlace = updated.find((m) => m.stage === 'knockout' && m.roundIndex === -1);
      if (thirdPlace) {
        const tpIndex = updated.indexOf(thirdPlace);
        const newTP = { ...thirdPlace };
        if (mIdx === 0) {
          newTP.teamAId = loser;
        } else {
          newTP.teamBId = loser;
        }
        // If loser was cleared, reset score
        if (!loser) {
          newTP.scoreA = null;
          newTP.scoreB = null;
          newTP.winnerId = null;
        }
        updated[tpIndex] = newTP;
      }
    }

    // Next round progression
    const nextRound = rIdx + 1;
    if (nextRound < totalRounds) {
      const nextMatchIdx = Math.floor(mIdx / 2);
      const isTeamA = mIdx % 2 === 0;

      const targetMatch = updated.find(
        (m) => m.stage === 'knockout' && m.roundIndex === nextRound && m.matchIndex === nextMatchIdx
      );

      if (targetMatch) {
        const tmIndex = updated.indexOf(targetMatch);
        const newTM = { ...targetMatch };

        if (isTeamA) {
          newTM.teamAId = winner;
        } else {
          newTM.teamBId = winner;
        }

        // If the winner was cleared, we must clear this match's scores and winner recursively!
        if (!winner) {
          newTM.scoreA = null;
          newTM.scoreB = null;
          newTM.winnerId = null;
        }

        updated[tmIndex] = newTM;

        // Recursive call
        return propagateWinnerDownstream(newTM, updated, getTotalRounds);
      }
    }

    return updated;
  };

  // Generate Group + Knockout format
  // This first generates the group stage matches
  const handleGenerateTournament = (config: {
    format: 'grup' | 'gugur' | 'grup_gugur';
    teamCount: number;
    groupCount: number;
    teams: Team[];
  }) => {
    if (!isLoggedIn) return;
    let generatedMatches: Match[] = [];

    if (config.format === 'gugur') {
      generatedMatches = generateKnockoutMatches(activeTab, activeGender, config.teams);
      setActiveView('bagan');
    } else {
      generatedMatches = generateRoundRobinMatches(
        activeTab,
        activeGender,
        config.teams,
        config.groupCount
      );
      setActiveView('klasemen');
    }

    const updatedSportsState = {
      ...state.sportsState,
      [categoryKey]: {
        sport: activeTab,
        gender: activeGender,
        format: config.format,
        teamCount: config.teamCount,
        groupCount: config.groupCount,
        teams: config.teams,
        matches: generatedMatches,
        completed: false
      }
    };

    updateState({
      ...state,
      sportsState: updatedSportsState
    });

    setShowConfig(false);
  };

  // Generate Knockout bracket from Group Stage winners (Advanced stage)
  const handleAdvanceToKnockout = (count: number) => {
    if (!isLoggedIn) return;
    if (!currentSportState) return;

    // 1. Calculate Standings for all groups
    const standingsByGroup: Record<string, string[]> = {}; // key: groupName, value: sorted teamIds
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Compute standings for each group
    for (let g = 0; g < currentSportState.groupCount; g++) {
      const gName = alphabet[g] || `Grup ${g + 1}`;
      const groupTeams = currentSportState.teams.filter((t, idx) => {
        const defaultGroup = alphabet[idx % currentSportState.groupCount] || `Grup ${(idx % currentSportState.groupCount) + 1}`;
        const actualGroup = t.groupName || defaultGroup;
        return actualGroup === gName;
      });
      
      // Standings calculation simulation
      const groupMatches = currentSportState.matches.filter(
        (m) => m.stage === 'group' && m.groupName === gName
      );

      const stats: Record<string, number> = {};
      groupTeams.forEach((t) => { stats[t.id] = 0; });

      groupMatches.forEach((m) => {
        if (m.scoreA !== null && m.scoreB !== null && m.teamAId && m.teamBId) {
          if (m.scoreA > m.scoreB) stats[m.teamAId] += 3;
          else if (m.scoreB > m.scoreA) stats[m.teamBId] += 3;
          else { stats[m.teamAId] += 1; stats[m.teamBId] += 1; }
        } else if (m.isWO && m.winnerId) {
          stats[m.winnerId] += 3;
        }
      });

      const sortedIds = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
      standingsByGroup[gName] = sortedIds;
    }

    // 2. Select top "count" teams from each group to advance
    const advancingTeams: Team[] = [];
    Object.entries(standingsByGroup).forEach(([gName, sortedIds]) => {
      const topIds = sortedIds.slice(0, count);
      topIds.forEach((id) => {
        const team = currentSportState.teams.find((t) => t.id === id);
        if (team) advancingTeams.push(team);
      });
    });

    if (advancingTeams.length < 2) {
      alert('Minimal harus ada 2 tim yang lolos dari fase grup untuk membuat babak gugur.');
      return;
    }

    // 3. Generate Knockout bracket matches
    const koMatches = generateKnockoutMatches(activeTab, activeGender, advancingTeams);

    // 4. Merge matches (keep group matches and append knockout matches)
    const mergedMatches = [
      ...currentSportState.matches.filter((m) => m.stage === 'group'),
      ...koMatches
    ];

    const updatedSportsState = {
      ...state.sportsState,
      [categoryKey]: {
        ...currentSportState,
        matches: mergedMatches
      }
    };

    updateState({
      ...state,
      sportsState: updatedSportsState
    });

    setActiveView('bagan');
  };

  const handleUpdateMatch = (updatedMatch: Match) => {
    if (!isLoggedIn) return;
    if (!currentSportState) return;

    let updatedMatches = currentSportState.matches.map((m) =>
      m.id === updatedMatch.id ? updatedMatch : m
    );

    // If knockout match, propagate winner downstream
    if (updatedMatch.stage === 'knockout') {
      const maxRoundIdx = updatedMatches.reduce((max, m) => {
        return m.stage === 'knockout' && m.roundIndex !== undefined && m.roundIndex > max ? m.roundIndex : max;
      }, 0);
      updatedMatches = propagateWinnerDownstream(updatedMatch, updatedMatches, r => maxRoundIdx + 1);
    }

    const updatedSportsState = {
      ...state.sportsState,
      [categoryKey]: {
        ...currentSportState,
        matches: updatedMatches
      }
    };

    updateState({
      ...state,
      sportsState: updatedSportsState
    });
  };

  const handleExportCSV = () => {
    if (!currentSportState) return;
    
    const sportName = SPORTS_LIST.find((s) => s.id === activeTab)?.name || activeTab;
    const genderName = activeGender === 'putra' ? 'PUTRA' : 'PUTRI';
    const sportLower = activeTab.toLowerCase();
    
    let csv = "sep=,\n"; // Excel separator helper
    csv += `LAPORAN PERTANDINGAN ${sportName.toUpperCase()} ${genderName} - POSSTER 2025\n`;
    csv += `Dibuat pada: ${new Date().toLocaleString('id-ID')}\n\n`;
    
    // Group Standings if applicable
    if (currentSportState.format === 'grup' || currentSportState.format === 'grup_gugur') {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (let g = 0; g < currentSportState.groupCount; g++) {
        const groupName = alphabet[g] || `Grup ${g + 1}`;
        csv += `KLASEMEN - GRUP ${groupName}\n`;
        
        const isVoli = sportLower.includes('voly') || sportLower.includes('tenis');
        const isBasket = sportLower.includes('basket');
        const isFutsal = sportLower.includes('futsal');
        const isGateball = sportLower.includes('gateball');
        
        let headers = "Pos,Nama Tim,Main,Menang,";
        if (!isVoli && !isGateball) headers += "Seri,";
        headers += "Kalah,";
        
        if (isVoli) headers += "Sets Win (SW),Sets Lost (SL),Sets Rate (SR),";
        if (isFutsal) headers += "Gol Masuk (GM),Gol Kebobolan (GK),Selisih Gol (SG),";
        if (isBasket) headers += "Skor Cetak (SC),Skor Kemasukan (SK),Selisih Skor (SS),";
        if (isGateball) headers += "Skor Diperoleh,";
        
        headers += "Poin\n";
        csv += headers;

        // Calculate Standings
        const groupTeams = currentSportState.teams.filter((t, idx) => {
          const defaultGroup = alphabet[idx % currentSportState.groupCount] || `Grup ${(idx % currentSportState.groupCount) + 1}`;
          const actualGroup = t.groupName || defaultGroup;
          return actualGroup === groupName;
        });
        const groupMatches = currentSportState.matches.filter(m => m.stage === 'group' && m.groupName === groupName);
        
        const stats = groupTeams.map(t => {
          let main = 0, w = 0, d = 0, l = 0, poin = 0, sw = 0, sl = 0, sc = 0, sk = 0, gm = 0, gk = 0;
          groupMatches.forEach(m => {
            if (m.teamAId !== t.id && m.teamBId !== t.id) return;
            const isTeamA = m.teamAId === t.id;
            const oppId = isTeamA ? m.teamBId : m.teamAId;
            if (!oppId) return;

            if (m.isWO) {
              main++;
              if (m.winnerId === t.id) {
                w++;
                if (isVoli) { poin += 3; sw += 2; }
                else if (isBasket) { poin += 3; sc += 20; }
                else if (isGateball) { poin += 2; }
                else if (isFutsal) { poin += 3; gm += 3; }
                else { poin += 1; }
              } else {
                l++;
                if (isVoli) { sl += 2; }
                else if (isBasket) { sk += 20; }
              }
            } else if (m.scoreA !== null && m.scoreB !== null) {
              main++;
              const scoreT = isTeamA ? m.scoreA : m.scoreB;
              const scoreO = isTeamA ? m.scoreB : m.scoreA;
              
              if (isVoli) {
                sw += scoreT;
                sl += scoreO;
                if (scoreT === 2 && scoreO === 0) { w++; poin += 3; }
                else if (scoreT === 2 && scoreO === 1) { w++; poin += 2; }
                else if (scoreO === 2 && scoreT === 0) { l++; }
                else if (scoreO === 2 && scoreT === 1) { l++; poin += 1; }
              } else if (isBasket) {
                sc += scoreT;
                sk += scoreO;
                if (scoreT > scoreO) { w++; poin += 3; }
                else if (scoreO > scoreT) { l++; }
                else { d++; poin += 1; }
              } else if (isFutsal) {
                gm += scoreT;
                gk += scoreO;
                if (scoreT > scoreO) { w++; poin += 3; }
                else if (scoreO > scoreT) { l++; }
                else { d++; poin += 1; }
              } else if (isGateball) {
                sc += scoreT;
                if (scoreT > scoreO) { w++; poin += 2; }
                else if (scoreO > scoreT) { l++; }
                else { d++; poin += 1; }
              } else {
                if (scoreT > scoreO) { w++; poin += 1; }
                else if (scoreO > scoreT) { l++; }
              }
            }
          });
          
          return {
            name: t.name,
            main, w, d, l, poin,
            sw, sl, sr: sw - sl,
            sc, sk, ss: sc - sk,
            gm, gk, sg: gm - gk
          };
        }).sort((a, b) => {
          if (b.poin !== a.poin) return b.poin - a.poin;
          if (isVoli) return b.sr - a.sr;
          if (isFutsal) return b.sg - a.sg;
          if (isBasket) return b.ss - a.ss;
          if (isGateball) return b.sc - a.sc;
          return b.w - a.w;
        });

        stats.forEach((row, idx) => {
          let line = `"${idx + 1}","${row.name.replace(/"/g, '""')}",${row.main},${row.w},`;
          if (!isVoli && !isGateball) line += `${row.d},`;
          line += `${row.l},`;
          
          if (isVoli) line += `${row.sw},${row.sl},${row.sr >= 0 ? `+${row.sr}` : row.sr},`;
          if (isFutsal) line += `${row.gm},${row.gk},${row.sg >= 0 ? `+${row.sg}` : row.sg},`;
          if (isBasket) line += `${row.sc},${row.sk},${row.ss >= 0 ? `+${row.ss}` : row.ss},`;
          if (isGateball) line += `${row.sc},`;
          
          line += `${row.poin}\n`;
          csv += line;
        });
        csv += "\n";
      }
    }

    // Knockout Bracket if applicable
    const knockoutMatches = currentSportState.matches.filter(m => m.stage === 'knockout');
    if (knockoutMatches.length > 0) {
      csv += "BAGAN SISTEM GUGUR (KNOCKOUT BRACKET)\n";

      // Find maximum roundIndex to know the total rounds
      const totalRounds = knockoutMatches.reduce((max, m) => {
        return m.roundIndex !== undefined && m.roundIndex > max ? m.roundIndex : max;
      }, 0) + 1;

      // Organize main matches by roundIndex (filter out roundIndex === -1 which is third place)
      const mainKnockoutMatches = knockoutMatches.filter(m => m.roundIndex !== -1);
      const thirdPlaceMatch = knockoutMatches.find(m => m.roundIndex === -1);

      // Find number of matches in Round 0 to determine grid size
      const round0Matches = mainKnockoutMatches.filter(m => m.roundIndex === 0);
      const M0 = round0Matches.length || 1;
      const totalRows = 4 * M0 - 1;
      const totalCols = 2 * totalRounds + 1;

      // Initialize grid
      const grid: string[][] = Array.from({ length: totalRows }, () => Array.from({ length: totalCols }, () => ''));

      // Helper function to get team name
      const getTeamNameLocal = (id: string | null, match?: any) => {
        if (!id) {
          if (match && match.stage === 'knockout' && match.roundIndex === 0) {
            if (match.teamAId || match.teamBId) {
              return 'BYE';
            }
          }
          return '-';
        }
        const team = currentSportState.teams.find((t) => t.id === id);
        return team ? team.name : '-';
      };

      // Round naming helper
      const getRoundNameLocal = (rIdx: number, total: number) => {
        const roundsLeft = total - rIdx;
        if (roundsLeft === 1) return 'Final';
        if (roundsLeft === 2) return 'Semifinal';
        if (roundsLeft === 3) return 'Perempat Final';
        if (roundsLeft === 4) return '16 Besar';
        return `Babak ${rIdx + 1}`;
      };

      // Populate grid for each round
      for (let r = 0; r < totalRounds; r++) {
        const roundMatches = mainKnockoutMatches
          .filter(m => m.roundIndex === r)
          .sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));

        roundMatches.forEach((m) => {
          const mIdx = m.matchIndex || 0;
          const spacing = Math.pow(2, r);
          const rowA = spacing * 4 * mIdx + (spacing - 1);
          const rowB = spacing * 4 * mIdx + 3 * spacing - 1;
          const rowMid = spacing * 4 * mIdx + 2 * spacing - 1;

          const teamAName = getTeamNameLocal(m.teamAId, m);
          const teamBName = getTeamNameLocal(m.teamBId, m);

          const scA = m.isWO ? (m.winnerId === m.teamAId ? '20' : '0') : m.scoreA !== null ? String(m.scoreA) : '-';
          const scB = m.isWO ? (m.winnerId === m.teamBId ? '20' : '0') : m.scoreB !== null ? String(m.scoreB) : '-';

          // Put teams in the grid
          if (rowA < totalRows) {
            grid[rowA][2 * r] = teamAName;
            grid[rowA][2 * r + 1] = scA;
          }

          if (rowMid < totalRows) {
            grid[rowMid][2 * r] = 'vs';
            grid[rowMid][2 * r + 1] = '──>';
          }

          if (rowB < totalRows) {
            grid[rowB][2 * r] = teamBName;
            grid[rowB][2 * r + 1] = scB;
          }

          // Draw vertical connector lines in the grid
          if (r > 0) {
            for (let row = rowA + 1; row < rowMid; row++) {
              if (row < totalRows) grid[row][2 * r] = '│';
            }
            for (let row = rowMid + 1; row < rowB; row++) {
              if (row < totalRows) grid[row][2 * r] = '│';
            }
          }

          // Winner of the final match
          if (r === totalRounds - 1 && rowMid < totalRows) {
            let winnerName = '-';
            if (m.winnerId) {
              winnerName = getTeamNameLocal(m.winnerId);
            } else if (m.scoreA !== null && m.scoreB !== null) {
              if (m.scoreA > m.scoreB) winnerName = getTeamNameLocal(m.teamAId);
              else if (m.scoreB > m.scoreA) winnerName = getTeamNameLocal(m.teamBId);
            }
            grid[rowMid][2 * totalRounds] = winnerName;
          }
        });
      }

      // Add Headers Row for the bracket
      let headerParts: string[] = [];
      for (let r = 0; r < totalRounds; r++) {
        headerParts.push(`"${getRoundNameLocal(r, totalRounds)}"`, '"Skor"');
      }
      headerParts.push('"Juara 1"');
      csv += headerParts.join(',') + '\n';

      // Add grid to CSV string
      for (let i = 0; i < totalRows; i++) {
        const rowData = grid[i].map(val => `"${val.replace(/"/g, '""')}"`);
        csv += rowData.join(',') + '\n';
      }
      csv += "\n";

      // Print Third Place match if exists
      if (thirdPlaceMatch) {
        csv += "PEREBUTAN JUARA 3\n";
        csv += "Tim A,Skor A,Skor B,Tim B,Pemenang Juara 3\n";
        
        const teamAName = getTeamNameLocal(thirdPlaceMatch.teamAId, thirdPlaceMatch);
        const teamBName = getTeamNameLocal(thirdPlaceMatch.teamBId, thirdPlaceMatch);
        const scA = thirdPlaceMatch.isWO ? (thirdPlaceMatch.winnerId === thirdPlaceMatch.teamAId ? '20' : '0') : thirdPlaceMatch.scoreA !== null ? String(thirdPlaceMatch.scoreA) : '-';
        const scB = thirdPlaceMatch.isWO ? (thirdPlaceMatch.winnerId === thirdPlaceMatch.teamBId ? '20' : '0') : thirdPlaceMatch.scoreB !== null ? String(thirdPlaceMatch.scoreB) : '-';
        
        let winnerName = '-';
        if (thirdPlaceMatch.winnerId) {
          winnerName = getTeamNameLocal(thirdPlaceMatch.winnerId);
        } else if (thirdPlaceMatch.scoreA !== null && thirdPlaceMatch.scoreB !== null) {
          if (thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB) winnerName = getTeamNameLocal(thirdPlaceMatch.teamAId);
          else if (thirdPlaceMatch.scoreB > thirdPlaceMatch.scoreA) winnerName = getTeamNameLocal(thirdPlaceMatch.teamBId);
        }
        
        csv += `"${teamAName.replace(/"/g, '""')}",${scA},${scB},"${teamBName.replace(/"/g, '""')}","${winnerName.replace(/"/g, '""')}"\n\n`;
      }
    }

    // Schedule and Match Results
    csv += "JADWAL DAN HASIL PERTANDINGAN\n";
    csv += "Tahap,Grup/Babak,Tim A,Skor A,Skor B,Tim B,Tanggal,Waktu,Lokasi,Keterangan\n";
    
    currentSportState.matches.forEach((m) => {
      const stageName = m.stage === 'group' ? 'Fase Grup' : 'Sistem Gugur';
      const roundName = m.stage === 'group' 
        ? `Grup ${m.groupName || ''}` 
        : m.roundIndex === -1 ? 'Perebutan Juara 3' : `Babak Gugur ${m.roundIndex !== undefined ? m.roundIndex + 1 : 1}`;
        
      const tAName = m.teamAId 
        ? (currentSportState.teams.find(t => t.id === m.teamAId)?.name || 'BYE') 
        : (m.stage === 'knockout' && m.roundIndex === 0 ? 'BYE (Istirahat)' : 'Belum Ada Tim');
        
      const tBName = m.teamBId 
        ? (currentSportState.teams.find(t => t.id === m.teamBId)?.name || 'BYE') 
        : (m.stage === 'knockout' && m.roundIndex === 0 ? 'BYE (Istirahat)' : 'Belum Ada Tim');
      
      const scA = m.isWO ? (m.winnerId === m.teamAId ? '20' : '0') : m.scoreA !== null ? m.scoreA : '-';
      const scB = m.isWO ? (m.winnerId === m.teamBId ? '20' : '0') : m.scoreB !== null ? m.scoreB : '-';
      
      let note = "";
      if (m.isWO) note = `WO (Pemenang: ${m.winnerId ? (currentSportState.teams.find(t => t.id === m.winnerId)?.name || '') : ''})`;
      
      csv += `"${stageName}","${roundName}","${tAName.replace(/"/g, '""')}",${scA},${scB},"${tBName.replace(/"/g, '""')}","${(m.date || '-').replace(/"/g, '""')}","${(m.time || '-').replace(/"/g, '""')}","${(m.venue || '-').replace(/"/g, '""')}","${note.replace(/"/g, '""')}"\n`;
    });
    
    // Download Blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_${sportName.replace(/\s+/g, '_')}_${genderName}_POSSTER.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetTournament = () => {
    if (!isLoggedIn) return;
    if (window.confirm('Apakah Anda yakin ingin meriset turnamen cabang olahraga ini? Semua data skor dan tim akan dihapus.')) {
      const updatedSportsState = { ...state.sportsState };
      delete updatedSportsState[categoryKey];

      updateState({
        ...state,
        sportsState: updatedSportsState
      });
      setShowConfig(true);
      setActiveView('info');
    }
  };

  const handleConfigChange = (newConfig: { url: string; anonKey: string; enabled: boolean }) => {
    const updatedState = {
      ...state,
      supabaseConfig: newConfig
    };
    updateState(updatedState);
  };

  const handlePullState = (cloudState: any) => {
    setState(cloudState);
    localStorage.setItem('posster_tournament_state', JSON.stringify(cloudState));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-zinc-100 bg-zinc-950">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider uppercase">Memuat dasbor POSSTER...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 w-full min-h-screen text-zinc-100 bg-[#050508]">
      
      {/* Mobile Top Header & Navigation */}
      <nav className="flex md:hidden flex-col bg-zinc-950 border-b border-zinc-900 p-4 gap-3 w-full shrink-0 animate-fade-in">
        {/* Top Row: Logo & Gender & DB */}
        <div className="flex items-center justify-between gap-3">
          {/* Logo & title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center font-extrabold text-white text-sm tracking-wider glow-purple">
              P
            </div>
            <span className="text-xs font-black tracking-wider bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent">
              POSSTER
            </span>
          </div>

          {/* Login/Logout Button for Mobile */}
          <button
            onClick={() => isLoggedIn ? handleLogout() : setIsLoginModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700 rounded-lg text-[9px] text-zinc-300 font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0"
          >
            {isLoggedIn ? (
              <>
                <Unlock className="w-3 h-3 text-emerald-400" />
                <span>Logout</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-violet-400" />
                <span>Login</span>
              </>
            )}
          </button>

          {/* Mini Gender Selector */}
          <div className="flex bg-zinc-900/60 rounded-lg border border-zinc-850 p-0.5 text-[10px]">
            {(['putra', 'putri'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => {
                  setActiveGender(gender);
                  setActiveView('info');
                }}
                className={`px-3 py-1 rounded-md font-bold uppercase tracking-wider transition-all select-none ${
                  activeGender === gender
                    ? gender === 'putra'
                      ? 'bg-violet-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {gender === 'putra' ? 'Putra' : 'Putri'}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Row: Horizontal Scroll Sports Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full scroll-smooth select-none">
          {SPORTS_LIST.map((sp) => {
            const Icon = sp.icon;
            const isSelected = activeTab === sp.id;
            const isConfigured = !!state.sportsState[`${sp.id}-${activeGender}`];
            
            return (
              <button
                key={sp.id}
                onClick={() => {
                  setActiveTab(sp.id);
                  setActiveView('info');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition-all select-none ${
                  isSelected
                    ? activeGender === 'putra'
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300 font-bold'
                      : 'bg-rose-600/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-zinc-900/30 border-zinc-850 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sp.name}</span>
                {isConfigured && (
                  <span className={`w-1.5 h-1.5 rounded-full block ${activeGender === 'putra' ? 'bg-violet-400' : 'bg-rose-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-80 shrink-0 bg-zinc-950/60 border-r border-zinc-900/60 p-5 flex-col justify-between">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 py-1 relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center font-extrabold text-white text-lg tracking-wider glow-purple">
              P
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-wider bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent">
                POSSTER ARENA
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Tournament Hub
              </p>
            </div>
            {/* Sync Badge */}
            {state.supabaseConfig.enabled && (
              <div className="absolute right-0 top-0.5" title={`Auto Sync: ${syncStatus}`}>
                <span className={`w-2.5 h-2.5 rounded-full block border ${
                  syncStatus === 'syncing' ? 'bg-amber-400 border-amber-500 animate-pulse' :
                  syncStatus === 'success' ? 'bg-emerald-400 border-emerald-500' :
                  syncStatus === 'error' ? 'bg-rose-400 border-rose-500' :
                  'bg-violet-400 border-violet-500'
                }`} />
              </div>
            )}
          </div>

          {/* Gender Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/40 rounded-xl border border-zinc-850">
            {(['putra', 'putri'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => {
                  setActiveGender(gender);
                  setActiveView('info');
                }}
                className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all select-none ${
                  activeGender === gender
                    ? gender === 'putra'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-950/20'
                      : 'bg-rose-600 text-white shadow-md shadow-rose-950/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {gender === 'putra' ? 'Putra ♂' : 'Putri ♀'}
              </button>
            ))}
          </div>

          {/* Sports List Sidebar */}
          <nav className="space-y-1.5">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-600 px-2.5 mb-2">
              Cabang Olahraga
            </span>
            <div className="space-y-1 max-h-[300px] md:max-h-none overflow-y-auto no-scrollbar pr-1">
              {SPORTS_LIST.map((sp) => {
                const Icon = sp.icon;
                const isSelected = activeTab === sp.id;
                const isConfigured = !!state.sportsState[`${sp.id}-${activeGender}`];
                
                return (
                  <button
                    key={sp.id}
                    onClick={() => {
                      setActiveTab(sp.id);
                      setActiveView('info');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-sm group ${
                      isSelected
                        ? activeGender === 'putra'
                          ? 'bg-violet-600/15 border border-violet-500/35 text-white font-semibold'
                          : 'bg-rose-600/15 border border-rose-500/35 text-white font-semibold'
                        : 'bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isSelected 
                          ? activeGender === 'putra' ? 'text-violet-400' : 'text-rose-400'
                          : 'text-zinc-500 group-hover:text-zinc-300'
                      }`} />
                      <span>{sp.name}</span>
                    </div>
                    {isConfigured && (
                      <CheckCircle className={`w-4 h-4 ${activeGender === 'putra' ? 'text-violet-500' : 'text-rose-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Bottom of Sidebar: Login/Logout & Database button */}
        <div className="pt-4 border-t border-zinc-900/80 space-y-2">
          {isLoggedIn && (
            <button
              onClick={() => setActiveView('database')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all select-none cursor-pointer ${
                activeView === 'database'
                  ? 'bg-violet-600/15 border border-violet-500/35 text-white'
                  : 'bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
              }`}
            >
              <Database className="w-4 h-4 text-violet-400" />
              <span>Database Sync</span>
            </button>
          )}

          <button
            onClick={() => isLoggedIn ? handleLogout() : setIsLoginModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {isLoggedIn ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>Keluar (Logout)</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-violet-400" />
                <span>Login Panitia</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
        {/* Dynamic Sport Header Banner */}
        <header className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-bold ${
              activeGender === 'putra' 
                ? 'bg-violet-950/20 border-violet-850 text-violet-400 glow-purple' 
                : 'bg-rose-950/20 border-rose-850 text-rose-400 glow-coral'
            }`}>
              {SPORTS_LIST.find((s) => s.id === activeTab)?.name.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black uppercase tracking-wider">
                  {SPORTS_LIST.find((s) => s.id === activeTab)?.name}
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border ${
                  activeGender === 'putra' 
                    ? 'bg-violet-950/30 border-violet-850/50 text-violet-300' 
                    : 'bg-rose-950/30 border-rose-850/50 text-rose-300'
                }`}>
                  {activeGender === 'putra' ? 'Putra' : 'Putri'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {currentSportState 
                  ? `Format: ${
                      currentSportState.format === 'gugur' ? 'Sistem Gugur' :
                      currentSportState.format === 'grup' ? 'Fase Grup (Round Robin)' :
                      'Grup & Gugur (Knockout)'
                    } | ${currentSportState.teamCount} Tim`
                  : 'Belum terkonfigurasi. Silakan inisialisasi bagan perlombaan.'
                }
              </p>
            </div>
          </div>

          {/* Sub Navigation Views Tabs & Export button */}
          {currentSportState && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-900/40 rounded-xl border border-zinc-850 text-xs">
                {(currentSportState.format === 'grup' || currentSportState.format === 'grup_gugur') && (
                  <button
                    onClick={() => setActiveView('klasemen')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activeView === 'klasemen' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Klasemen
                  </button>
                )}
                <button
                  onClick={() => setActiveView('jadwal')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeView === 'jadwal' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Jadwal
                </button>
                {(currentSportState.format === 'gugur' || currentSportState.format === 'grup_gugur') && (
                  <button
                    onClick={() => setActiveView('bagan')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activeView === 'bagan' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Bagan Gugur
                  </button>
                )}
              </div>
              
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
                title="Ekspor Laporan ke Excel/Spreadsheet"
                aria-label="Ekspor Laporan ke Excel/Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Ekspor Excel</span>
              </button>
            </div>
          )}
        </header>

        {/* Views content switcher */}
        {activeView === 'database' && isLoggedIn ? (
          <SupabaseSyncPanel
            url={state.supabaseConfig.url}
            anonKey={state.supabaseConfig.anonKey}
            enabled={state.supabaseConfig.enabled}
            onConfigChange={handleConfigChange}
            onPullState={handlePullState}
            getCurrentState={() => state}
          />
        ) : !currentSportState ? (
          isLoggedIn ? (
            <SportConfigPanel
              onGenerate={handleGenerateTournament}
              onReset={handleResetTournament}
              isGenerated={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl text-zinc-400 text-center space-y-4 max-w-xl mx-auto py-16 animate-fade-in">
              <Trophy className="w-12 h-12 text-zinc-700 mx-auto animate-pulse" />
              <div>
                <h3 className="font-bold text-zinc-250 text-sm uppercase tracking-wider">Turnamen Belum Dikonfigurasi</h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto">
                  Cabang olahraga ini belum diinisialisasi oleh panitia POSSTER. Silakan hubungi panitia untuk memulai pertandingan.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6">
             {/* Quick action bar for Crossover Seeding (Group -> Gugur) */}
            {isLoggedIn && currentSportState.format === 'grup_gugur' && 
             !currentSportState.matches.some(m => m.stage === 'knockout') && (
              <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-violet-955/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-violet-300 text-xs font-semibold">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-5 h-5 text-violet-400" />
                    <span>Fase Grup Selesai? Lanjut ke Babak Gugur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Tim lolos per grup:</span>
                    <select
                      value={advancingCount}
                      onChange={(e) => setAdvancingCount(parseInt(e.target.value) || 2)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-bold"
                    >
                      <option value={1}>Top 1</option>
                      <option value={2}>Top 2</option>
                      <option value={3}>Top 3</option>
                      <option value={4}>Top 4</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleAdvanceToKnockout(advancingCount)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Buat Bagan Gugur
                </button>
              </div>
            )}

            {/* Quick config access panel */}
            {isLoggedIn && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-3.5 py-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {showConfig ? 'Sembunyikan Pengaturan Nama Tim' : 'Tampilkan Pengaturan Nama Tim'}
                </button>
              </div>
            )}

            {isLoggedIn && showConfig && (
              <SportConfigPanel
                initialFormat={currentSportState.format}
                initialTeamCount={currentSportState.teamCount}
                initialGroupCount={currentSportState.groupCount}
                initialTeams={currentSportState.teams}
                onGenerate={handleGenerateTournament}
                onReset={handleResetTournament}
                isGenerated={true}
              />
            )}

            {/* Default Landing Page / Specific views */}
            {activeView === 'info' && (
              <div className="glass-card rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto py-12">
                <Award className="w-12 h-12 text-violet-400 mx-auto" />
                <h3 className="text-md font-bold uppercase tracking-wider text-zinc-300">Selamat Datang di Dasbor Perlombaan</h3>
                <p className="text-xs text-zinc-400">
                  Perlombaan olahraga untuk kategori **{SPORTS_LIST.find((s) => s.id === activeTab)?.name} ({activeGender === 'putra' ? 'Putra' : 'Putri'})** telah terinisialisasi. Silakan pilih tab menu **Klasemen**, **Jadwal**, atau **Bagan Gugur** di bagian atas untuk mengelola data.
                </p>
                <div className="flex justify-center gap-2 pt-2 text-xs">
                  {(currentSportState.format === 'grup' || currentSportState.format === 'grup_gugur') && (
                    <button
                      onClick={() => setActiveView('klasemen')}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg font-bold"
                    >
                      Klasemen
                    </button>
                  )}
                  <button
                    onClick={() => setActiveView('jadwal')}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg font-bold"
                  >
                    Jadwal Pertandingan
                  </button>
                  {(currentSportState.format === 'gugur' || currentSportState.format === 'grup_gugur') && (
                    <button
                      onClick={() => setActiveView('bagan')}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg font-bold"
                    >
                      Bagan Gugur
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeView === 'klasemen' && (
              <StandingsTable
                sport={activeTab}
                teams={currentSportState.teams}
                matches={currentSportState.matches}
                groupCount={currentSportState.groupCount}
              />
            )}

            {activeView === 'jadwal' && (
              <MatchList
                sport={activeTab}
                teams={currentSportState.teams}
                matches={currentSportState.matches}
                onUpdateMatch={handleUpdateMatch}
                isAdmin={isLoggedIn}
              />
            )}

            {activeView === 'bagan' && (
              <BracketView
                sport={activeTab}
                teams={currentSportState.teams}
                matches={currentSportState.matches}
                onUpdateMatch={handleUpdateMatch}
                isAdmin={isLoggedIn}
              />
            )}
          </div>
        )}
      </main>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm border border-zinc-850 shadow-2xl relative">
            <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-violet-400" /> Login Panitia
            </h3>
            <p className="text-[11px] text-zinc-500 mb-4 font-semibold uppercase tracking-wider">Masukkan username dan password panitia.</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Username</label>
                <input
                  type="text"
                  required
                  className="w-full glass-input text-xs focus:ring-violet-400 py-2"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="boma2026"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full glass-input text-xs focus:ring-violet-400 py-2"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <p className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider">{loginError}</p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setLoginError('');
                    setLoginUsername('');
                    setLoginPassword('');
                  }}
                  className="px-4 py-2 text-xs font-bold bg-zinc-900 border border-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-955/20"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Masuk...</span>
                    </>
                  ) : (
                    <span>Masuk</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
