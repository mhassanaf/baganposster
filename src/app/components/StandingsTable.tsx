'use client';

import React from 'react';
import { Trophy, Award, BarChart2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  groupName?: string;
}

interface Match {
  id: string;
  stage: 'group' | 'knockout';
  groupName?: string;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  isWO: boolean;
  winnerId: string | null;
}

interface StandingsTableProps {
  sport: string;
  teams: Team[];
  matches: Match[];
  groupCount: number;
}

interface RowStats {
  teamId: string;
  teamName: string;
  main: number; // Played
  w: number; // Wins
  d: number; // Draws
  l: number; // Losses
  poin: number;
  // Voli & Tenis Meja
  sw: number; // Sets Win
  sl: number; // Sets Lost
  sr: number; // Sets Difference (SW - SL as shown in PDF)
  // Basket
  sc: number; // Skor Cetak
  sk: number; // Skor Kemasukan
  ss: number; // Selisih Skor (SC - SK)
  // Futsal
  gm: number; // Gol Masuk
  gk: number; // Gol Kebobolan
  sg: number; // Selisih Gol
  // Catur
  winHitam: number; // Bidak Hitam Wins
}

export default function StandingsTable({
  sport,
  teams,
  matches,
  groupCount
}: StandingsTableProps) {
  const sportLower = sport.toLowerCase();

  // Helper to partition teams into groups
  // We can assign teams to groups based on index: team index % groupCount
  const getGroupTeams = (groupIndex: number) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const targetGroup = alphabet[groupIndex] || `Grup ${groupIndex + 1}`;
    return teams.filter((t, idx) => {
      const defaultGroup = alphabet[idx % groupCount] || `Grup ${(idx % groupCount) + 1}`;
      const actualGroup = t.groupName || defaultGroup;
      return actualGroup === targetGroup;
    });
  };

  const calculateGroupStandings = (groupName: string, groupTeams: Team[]) => {
    const standings: Record<string, RowStats> = {};

    // Initialize stats for all teams in the group
    groupTeams.forEach((t) => {
      standings[t.id] = {
        teamId: t.id,
        teamName: t.name,
        main: 0,
        w: 0,
        d: 0,
        l: 0,
        poin: 0,
        sw: 0,
        sl: 0,
        sr: 0,
        sc: 0,
        sk: 0,
        ss: 0,
        gm: 0,
        gk: 0,
        sg: 0,
        winHitam: 0
      };
    });

    // Filter matches belonging to this group
    const groupMatches = matches.filter(
      (m) => m.stage === 'group' && m.groupName === groupName
    );

    // Calculate match statistics
    groupMatches.forEach((m) => {
      if (m.teamAId === null || m.teamBId === null) return;
      
      const statsA = standings[m.teamAId];
      const statsB = standings[m.teamBId];
      if (!statsA || !statsB) return; // Team not in this group

      const scoreA = m.scoreA;
      const scoreB = m.scoreB;

      // Only calculate if score is inputted or is WO
      if (m.isWO) {
        statsA.main += 1;
        statsB.main += 1;

        if (m.winnerId === m.teamAId) {
          statsA.w += 1;
          statsB.l += 1;
          
          if (sportLower.includes('voly') || sportLower.includes('tenis')) {
            statsA.poin += 3;
            statsA.sw += 2;
            statsB.sl += 2;
          } else if (sportLower.includes('basket')) {
            statsA.poin += 2;
            statsA.sc += 20;
            statsB.sk += 20;
          } else if (sportLower.includes('gateball')) {
            statsA.poin += 2;
          } else if (sportLower.includes('futsal')) {
            statsA.poin += 3;
            statsA.gm += 3; // WO standard 3-0
            statsB.gk += 3;
          } else {
            statsA.poin += 1; // Chess/Esport WO
          }
        } else {
          statsB.w += 1;
          statsA.l += 1;

          if (sportLower.includes('voly') || sportLower.includes('tenis')) {
            statsB.poin += 3;
            statsB.sw += 2;
            statsA.sl += 2;
          } else if (sportLower.includes('basket')) {
            statsB.poin += 2;
            statsB.sc += 20;
            statsA.sk += 20;
          } else if (sportLower.includes('gateball')) {
            statsB.poin += 2;
          } else if (sportLower.includes('futsal')) {
            statsB.poin += 3;
            statsB.gm += 3;
            statsA.gk += 3;
          } else {
            statsB.poin += 1;
          }
        }
      } else if (scoreA !== null && scoreB !== null) {
        statsA.main += 1;
        statsB.main += 1;

        if (sportLower.includes('voly') || sportLower.includes('tenis')) {
          // Volley scoring rules:
          // 2-0 = 3 Points
          // 2-1 = 2 Points for winner, 1 Point for loser
          statsA.sw += scoreA;
          statsA.sl += scoreB;
          statsB.sw += scoreB;
          statsB.sl += scoreA;

          if (scoreA === 2 && scoreB === 0) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 3;
          } else if (scoreA === 2 && scoreB === 1) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 2;
            statsB.poin += 1;
          } else if (scoreB === 2 && scoreA === 0) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 3;
          } else if (scoreB === 2 && scoreA === 1) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 2;
            statsA.poin += 1;
          }
        } else if (sportLower.includes('basket')) {
          // Basketball rules
          statsA.sc += scoreA;
          statsA.sk += scoreB;
          statsB.sc += scoreB;
          statsB.sk += scoreA;

          if (scoreA > scoreB) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 2;
            statsB.poin += 1;
          } else if (scoreB > scoreA) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 2;
            statsA.poin += 1;
          } else {
            // Draw (if any)
            statsA.d += 1;
            statsB.d += 1;
            statsA.poin += 1;
            statsB.poin += 1;
          }
        } else if (sportLower.includes('futsal')) {
          // Futsal rules
          statsA.gm += scoreA;
          statsA.gk += scoreB;
          statsB.gm += scoreB;
          statsB.gk += scoreA;

          if (scoreA > scoreB) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 3;
          } else if (scoreB > scoreA) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 3;
          } else {
            statsA.d += 1;
            statsB.d += 1;
            statsA.poin += 1;
            statsB.poin += 1;
          }
        } else if (sportLower.includes('gateball')) {
          statsA.sc += scoreA; // Skor diperoleh
          statsB.sc += scoreB;

          if (scoreA > scoreB) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 2;
          } else if (scoreB > scoreA) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 2;
          } else {
            statsA.d += 1;
            statsB.d += 1;
            statsA.poin += 1;
            statsB.poin += 1;
          }
        } else if (sportLower.includes('catur')) {
          // Chess: Winner gets 1 point
          if (scoreA > scoreB) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 1;
          } else if (scoreB > scoreA) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 1;
          }
        } else {
          // Default scoring (Esport etc)
          if (scoreA > scoreB) {
            statsA.w += 1;
            statsB.l += 1;
            statsA.poin += 3;
          } else if (scoreB > scoreA) {
            statsB.w += 1;
            statsA.l += 1;
            statsB.poin += 3;
          } else {
            statsA.d += 1;
            statsB.d += 1;
            statsA.poin += 1;
            statsB.poin += 1;
          }
        }
      }
    });

    // Post-calculations (Diffs, rates)
    Object.values(standings).forEach((row) => {
      row.sr = row.sw - row.sl; // Sets rate/diff
      row.ss = row.sc - row.sk; // Score diff
      row.sg = row.gm - row.gk; // Goal diff
    });

    // Sort function based on points, then goal difference / score diff / set rate
    return Object.values(standings).sort((a, b) => {
      if (b.poin !== a.poin) return b.poin - a.poin;

      if (sportLower.includes('voly') || sportLower.includes('tenis')) {
        return b.sr - a.sr; // Selisih Set
      }
      if (sportLower.includes('futsal')) {
        if (b.sg !== a.sg) return b.sg - a.sg;
        return b.gm - a.gm; // Goals scored
      }
      if (sportLower.includes('basket')) {
        return b.ss - a.ss; // Score diff
      }
      if (sportLower.includes('gateball')) {
        return b.sc - a.sc; // Score obtained
      }
      return b.w - a.w; // Wins
    });
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <Trophy className="w-5 h-5 text-violet-400" />
        <h2 className="text-md font-bold uppercase tracking-wider text-zinc-300">Klasemen Sementara</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: groupCount }).map((_, gIdx) => {
          const groupName = alphabet[gIdx] || `Grup ${gIdx + 1}`;
          const groupTeams = getGroupTeams(gIdx);
          const sortedRows = calculateGroupStandings(groupName, groupTeams);

          return (
            <div key={gIdx} className="glass-card rounded-2xl p-5 relative overflow-hidden">
              {/* Decorative gradient corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500/10 to-transparent pointer-events-none rounded-tr-2xl" />

              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                <span className="text-sm font-extrabold tracking-wider bg-violet-950/40 text-violet-300 px-3 py-1 rounded-lg border border-violet-850">
                  GRUP {groupName}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">{sortedRows.length} Tim</span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-850">
                      <th className="py-1 px-1.5 text-center w-6 whitespace-nowrap">#</th>
                      <th className="py-1 px-1.5 whitespace-nowrap">Nama Tim</th>
                      <th className="py-1 px-1.5 text-center w-8 whitespace-nowrap">M</th>
                      <th className="py-1 px-1.5 text-center w-8 whitespace-nowrap">W</th>
                      {!(sportLower.includes('voly') || sportLower.includes('tenis') || sportLower.includes('catur') || sportLower.includes('basket')) && (
                        <th className="py-1 px-1.5 text-center w-8 whitespace-nowrap">D</th>
                      )}
                      <th className="py-1 px-1.5 text-center w-8 whitespace-nowrap">L</th>
                      
                      {/* Voli / Tenis Meja specific columns */}
                      {(sportLower.includes('voly') || sportLower.includes('tenis')) && (
                        <>
                          <th className="py-1 px-1.5 text-center w-10 text-violet-400 whitespace-nowrap">SW</th>
                          <th className="py-1 px-1.5 text-center w-10 text-rose-400 whitespace-nowrap">SL</th>
                          <th className="py-1 px-1.5 text-center w-10 text-emerald-400 whitespace-nowrap">SR</th>
                        </>
                      )}

                      {/* Futsal specific columns */}
                      {sportLower.includes('futsal') && (
                        <>
                          <th className="py-1 px-1.5 text-center w-10 text-zinc-300 whitespace-nowrap">GM</th>
                          <th className="py-1 px-1.5 text-center w-10 text-zinc-500 whitespace-nowrap">GK</th>
                          <th className="py-1 px-1.5 text-center w-10 text-emerald-400 whitespace-nowrap">SG</th>
                        </>
                      )}

                      {/* Basket specific columns */}
                      {sportLower.includes('basket') && (
                        <>
                          <th className="py-1 px-1.5 text-center w-10 text-violet-400 whitespace-nowrap">SC</th>
                          <th className="py-1 px-1.5 text-center w-10 text-rose-400 whitespace-nowrap">SK</th>
                          <th className="py-1 px-1.5 text-center w-10 text-emerald-400 whitespace-nowrap">SS</th>
                        </>
                      )}

                      {/* Gateball specific columns */}
                      {sportLower.includes('gateball') && (
                        <th className="py-1 px-1.5 text-center w-12 text-zinc-300 whitespace-nowrap">Skor</th>
                      )}

                      <th className="py-1 px-1.5 text-center w-10 font-bold text-zinc-200 whitespace-nowrap">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/50">
                    {sortedRows.map((row, idx) => (
                      <tr 
                        key={row.teamId} 
                        className={`hover:bg-zinc-800/20 transition-colors ${
                          idx < 2 ? 'bg-violet-950/5' : ''
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center font-bold">
                          {idx === 0 && <Award className="w-3.5 h-3.5 text-yellow-500 mx-auto" />}
                          {idx === 1 && <Award className="w-3.5 h-3.5 text-slate-400 mx-auto" />}
                          {idx > 1 && <span className="text-zinc-650 text-[10px]">{idx + 1}</span>}
                        </td>
                        <td className="py-1 px-1.5 font-semibold text-zinc-100 max-w-[110px] truncate" title={row.teamName}>
                          {row.teamName}
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono text-zinc-300">{row.main}</td>
                        <td className="py-1 px-1.5 text-center font-mono text-emerald-400">{row.w}</td>
                        {!(sportLower.includes('voly') || sportLower.includes('tenis') || sportLower.includes('catur') || sportLower.includes('basket')) && (
                          <td className="py-1 px-1.5 text-center font-mono text-zinc-400">{row.d}</td>
                        )}
                        <td className="py-1 px-1.5 text-center font-mono text-rose-400">{row.l}</td>

                        {/* Voli / Tenis Meja values */}
                        {(sportLower.includes('voly') || sportLower.includes('tenis')) && (
                          <>
                            <td className="py-1 px-1.5 text-center font-mono text-violet-400">{row.sw}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-rose-400">{row.sl}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-emerald-400">{row.sr >= 0 ? `+${row.sr}` : row.sr}</td>
                          </>
                        )}

                        {/* Futsal values */}
                        {sportLower.includes('futsal') && (
                          <>
                            <td className="py-1 px-1.5 text-center font-mono text-zinc-300">{row.gm}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-zinc-500">{row.gk}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-emerald-400">{row.sg >= 0 ? `+${row.sg}` : row.sg}</td>
                          </>
                        )}

                        {/* Basket values */}
                        {sportLower.includes('basket') && (
                          <>
                            <td className="py-1 px-1.5 text-center font-mono text-violet-400">{row.sc}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-rose-400">{row.sk}</td>
                            <td className="py-1 px-1.5 text-center font-mono text-emerald-400">{row.ss >= 0 ? `+${row.ss}` : row.ss}</td>
                          </>
                        )}

                        {/* Gateball values */}
                        {sportLower.includes('gateball') && (
                          <td className="py-1 px-1.5 text-center font-mono text-zinc-300">{row.sc}</td>
                        )}

                        <td className="py-1 px-1.5 text-center font-extrabold text-zinc-50 bg-zinc-800/20 rounded font-mono">
                          {row.poin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
