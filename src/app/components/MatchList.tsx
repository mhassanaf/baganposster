'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Edit2, Check, X, ShieldAlert, Award } from 'lucide-react';

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

interface MatchListProps {
  sport: string;
  teams: Team[];
  matches: Match[];
  onUpdateMatch: (updatedMatch: Match) => void;
  isAdmin?: boolean;
}

export default function MatchList({
  sport,
  teams,
  matches,
  onUpdateMatch,
  isAdmin = false
}: MatchListProps) {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // Form states for the currently edited match
  const [editScoreA, setEditScoreA] = useState<string>('');
  const [editScoreB, setEditScoreB] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editVenue, setEditVenue] = useState<string>('');
  const [editIsWO, setEditIsWO] = useState<boolean>(false);
  const [editWinnerId, setEditWinnerId] = useState<string>('');

  // Gateball specific edit states
  const [gateballWinnerId, setGateballWinnerId] = useState<string>('');
  const [gateballScore, setGateballScore] = useState<string>('');

  // Filtering states
  const [stageFilter, setStageFilter] = useState<'all' | 'group' | 'knockout'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const getTeamName = (id: string | null) => {
    if (!id) return 'Belum Ada Tim';
    const team = teams.find((t) => t.id === id);
    return team ? team.name : 'Belum Ada Tim';
  };

  const handleStartEdit = (m: Match) => {
    setEditingMatchId(m.id);
    setEditScoreA(m.scoreA !== null ? m.scoreA.toString() : '');
    setEditScoreB(m.scoreB !== null ? m.scoreB.toString() : '');
    setEditDate(m.date || '');
    setEditTime(m.time || '');
    setEditVenue(m.venue || '');
    setEditIsWO(m.isWO);
    setEditWinnerId(m.winnerId || '');

    if (sport.toLowerCase().includes('gateball')) {
      if (m.scoreA !== null && m.scoreB !== null) {
        if (m.scoreA > m.scoreB) {
          setGateballWinnerId(m.teamAId || '');
          setGateballScore(m.scoreA.toString());
        } else {
          setGateballWinnerId(m.teamBId || '');
          setGateballScore(m.scoreB.toString());
        }
      } else {
        setGateballWinnerId('');
        setGateballScore('');
      }
    }
  };

  const handleSaveEdit = (m: Match) => {
    let scA = null;
    let scB = null;
    let winId = '';

    if (sport.toLowerCase().includes('gateball') && !editIsWO) {
      if (gateballWinnerId && gateballScore !== '') {
        const scoreVal = parseInt(gateballScore) || 0;
        winId = gateballWinnerId;
        if (gateballWinnerId === m.teamAId) {
          scA = scoreVal;
          scB = 0;
        } else if (gateballWinnerId === m.teamBId) {
          scA = 0;
          scB = scoreVal;
        }
      }
    } else {
      scA = editScoreA === '' ? null : parseInt(editScoreA);
      scB = editScoreB === '' ? null : parseInt(editScoreB);
      winId = editWinnerId;
      
      if (editIsWO) {
        // If WO, enforce score and winner
        if (!winId && m.teamAId && m.teamBId) {
          winId = m.teamAId; // default winner A
        }
      } else if (scA !== null && scB !== null) {
        if (scA > scB && m.teamAId) winId = m.teamAId;
        else if (scB > scA && m.teamBId) winId = m.teamBId;
        else winId = ''; // draw
      } else {
        winId = '';
      }
    }

    onUpdateMatch({
      ...m,
      scoreA: scA,
      scoreB: scB,
      date: editDate,
      time: editTime,
      venue: editVenue,
      isWO: editIsWO,
      winnerId: winId || null
    });

    setEditingMatchId(null);
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
  };

  const handleClearScore = (m: Match) => {
    onUpdateMatch({
      ...m,
      scoreA: null,
      scoreB: null,
      isWO: false,
      winnerId: null
    });
  };

  // Get list of unique groups for filtering
  const groups = Array.from(
    new Set(matches.map((m) => m.groupName).filter(Boolean))
  ) as string[];

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    if (stageFilter !== 'all' && m.stage !== stageFilter) return false;
    if (stageFilter === 'group' && groupFilter !== 'all' && m.groupName !== groupFilter) return false;
    return true;
  });

  return (
    <div className="glass-card rounded-2xl p-6 text-zinc-100 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Jadwal & Hasil Pertandingan</h2>
          <p className="text-xs text-zinc-500">Kelola dan input skor pertandingan secara langsung</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => { setStageFilter('all'); setGroupFilter('all'); }}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stageFilter === 'all'
                ? 'bg-violet-600 border-violet-500 text-white font-semibold'
                : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStageFilter('group')}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stageFilter === 'group'
                ? 'bg-violet-600 border-violet-500 text-white font-semibold'
                : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            Fase Grup
          </button>
          <button
            onClick={() => setStageFilter('knockout')}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stageFilter === 'knockout'
                ? 'bg-violet-600 border-violet-500 text-white font-semibold'
                : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            Sistem Gugur
          </button>

          {stageFilter === 'group' && groups.length > 0 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-zinc-300 outline-none text-xs"
            >
              <option value="all">Semua Grup</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  Grup {g}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          Belum ada jadwal pertandingan untuk filter ini. Silakan buat turnamen terlebih dahulu.
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          {filteredMatches.map((m, idx) => {
            const isEditing = editingMatchId === m.id;
            const hasScore = m.scoreA !== null && m.scoreB !== null;
            const isWinnerA = m.winnerId === m.teamAId && (hasScore || m.isWO);
            const isWinnerB = m.winnerId === m.teamBId && (hasScore || m.isWO);

            return (
              <div
                key={m.id}
                className={`glass-card rounded-xl p-4 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isEditing ? 'border-violet-500/50 bg-violet-950/5' : 'border-zinc-850 hover:border-zinc-800'
                }`}
              >
                {/* Match Info Header */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {m.stage === 'group' ? `Grup ${m.groupName}` : `Sistem Gugur`}
                    </span>
                    {m.isWO && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-950/30 text-rose-400 border border-rose-850/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> WO
                      </span>
                    )}
                  </div>
                  
                  {/* Date, Time, Venue Inline Inputs / Labels */}
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Hari, Tanggal (misal: Senin, 23 Juni)"
                        className="glass-input text-xs py-1 px-2 w-48"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Waktu (misal: 08.00-08.30)"
                        className="glass-input text-xs py-1 px-2 w-36"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Lokasi/Venue"
                        className="glass-input text-xs py-1 px-2 w-32"
                        value={editVenue}
                        onChange={(e) => setEditVenue(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1 font-medium">
                      {m.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {m.date}
                        </span>
                      )}
                      {m.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" /> {m.time} WIB
                        </span>
                      )}
                      {m.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {m.venue}
                        </span>
                      )}
                      {!m.date && !m.time && !m.venue && (
                        <span className="text-zinc-650 italic">Jadwal & tempat belum diatur</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Team Matchup and Scores */}
                <div className="flex items-center justify-center gap-4 flex-1">
                  {/* Team A */}
                  <div className="flex-1 text-right max-w-[140px] md:max-w-[180px] truncate">
                    <span className={`text-sm font-semibold transition-colors ${
                      isWinnerA ? 'text-violet-400 font-bold' : m.winnerId && m.winnerId !== m.teamAId ? 'text-zinc-500' : 'text-zinc-200'
                    }`}>
                      {getTeamName(m.teamAId)}
                    </span>
                  </div>

                  {/* Scores Input / Display */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      sport.toLowerCase().includes('gateball') && !editIsWO ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <select
                            value={gateballWinnerId}
                            onChange={(e) => setGateballWinnerId(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-lg p-1.5 text-xs text-zinc-200 outline-none font-bold min-w-[120px]"
                          >
                            <option value="">Pilih Pemenang</option>
                            {m.teamAId && <option value={m.teamAId}>{getTeamName(m.teamAId)}</option>}
                            {m.teamBId && <option value={m.teamBId}>{getTeamName(m.teamBId)}</option>}
                          </select>
                          <input
                            type="number"
                            placeholder="Skor"
                            className="w-16 h-8 text-center font-bold glass-input text-xs py-0 px-1 focus:ring-violet-400 font-mono"
                            value={gateballScore}
                            onChange={(e) => setGateballScore(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            disabled={editIsWO}
                            placeholder="0"
                            className="w-12 h-10 text-center font-bold glass-input text-base py-0 px-1 focus:ring-violet-400 font-mono"
                            value={editIsWO ? (editWinnerId === m.teamAId ? '20' : '0') : editScoreA}
                            onChange={(e) => setEditScoreA(e.target.value)}
                          />
                          <span className="text-zinc-500 font-bold">-</span>
                          <input
                            type="number"
                            disabled={editIsWO}
                            placeholder="0"
                            className="w-12 h-10 text-center font-bold glass-input text-base py-0 px-1 focus:ring-violet-400 font-mono"
                            value={editIsWO ? (editWinnerId === m.teamBId ? '20' : '0') : editScoreB}
                            onChange={(e) => setEditScoreB(e.target.value)}
                          />
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-850 font-mono font-extrabold text-sm min-w-[64px] justify-center">
                        {hasScore || m.isWO ? (
                          <>
                            <span className={isWinnerA ? 'text-violet-400' : 'text-zinc-400'}>
                              {m.isWO ? (m.winnerId === m.teamAId ? '20' : '0') : m.scoreA}
                            </span>
                            <span className="text-zinc-650">:</span>
                            <span className={isWinnerB ? 'text-violet-400' : 'text-zinc-400'}>
                              {m.isWO ? (m.winnerId === m.teamBId ? '20' : '0') : m.scoreB}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-600 text-xs font-bold font-sans">VS</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Team B */}
                  <div className="flex-1 text-left max-w-[140px] md:max-w-[180px] truncate">
                    <span className={`text-sm font-semibold transition-colors ${
                      isWinnerB ? 'text-violet-400 font-bold' : m.winnerId && m.winnerId !== m.teamBId ? 'text-zinc-500' : 'text-zinc-200'
                    }`}>
                      {getTeamName(m.teamBId)}
                    </span>
                  </div>
                </div>

                {/* Edit Controls */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      {/* Winner selection for WO */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Pilihan WO:
                        </label>
                        <input
                          type="checkbox"
                          id={`wo-${m.id}`}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-violet-600"
                          checked={editIsWO}
                          onChange={(e) => {
                            setEditIsWO(e.target.checked);
                            if (e.target.checked && m.teamAId) {
                              setEditWinnerId(m.teamAId);
                            }
                          }}
                        />
                        <label htmlFor={`wo-${m.id}`} className="text-xs text-zinc-400">WO</label>

                        {editIsWO && (
                          <select
                            value={editWinnerId}
                            onChange={(e) => setEditWinnerId(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 font-bold"
                          >
                            {m.teamAId && <option value={m.teamAId}>{getTeamName(m.teamAId)} (Win)</option>}
                            {m.teamBId && <option value={m.teamBId}>{getTeamName(m.teamBId)} (Win)</option>}
                          </select>
                        )}
                      </div>

                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleSaveEdit(m)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                          title="Simpan"
                          aria-label="Simpan perubahan skor"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-355 rounded-lg transition-colors cursor-pointer"
                          title="Batal"
                          aria-label="Batal mengedit skor"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                   ) : isAdmin ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-100 rounded-lg transition-all cursor-pointer"
                        title="Edit Skor/Jadwal"
                        aria-label="Edit skor dan jadwal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {(hasScore || m.isWO) && (
                        <button
                          onClick={() => handleClearScore(m)}
                          className="p-2 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/20 text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          title="Hapus Skor"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
