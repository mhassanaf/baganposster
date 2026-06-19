'use client';

import React, { useState } from 'react';
import { GitCommit, Edit3, Calendar, Clock, MapPin, Award, Check, X, ShieldAlert } from 'lucide-react';

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

interface BracketViewProps {
  sport: string;
  teams: Team[];
  matches: Match[];
  onUpdateMatch: (updatedMatch: Match) => void;
}

export default function BracketView({
  sport,
  teams,
  matches,
  onUpdateMatch
}: BracketViewProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Modal Edit states
  const [modalScoreA, setModalScoreA] = useState('');
  const [modalScoreB, setModalScoreB] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('');
  const [modalVenue, setModalVenue] = useState('');
  const [modalIsWO, setModalIsWO] = useState(false);
  const [modalWinnerId, setModalWinnerId] = useState('');
  const [modalTeamAId, setModalTeamAId] = useState('');
  const [modalTeamBId, setModalTeamBId] = useState('');

  // Gateball specific edit states
  const [gateballWinnerId, setGateballWinnerId] = useState('');
  const [gateballScore, setGateballScore] = useState('');

  // Extract all knockout matches
  const knockoutMatches = matches.filter((m) => m.stage === 'knockout');
  
  // Find maximum roundIndex to know the total rounds
  const totalRounds = knockoutMatches.reduce((max, m) => {
    return m.roundIndex !== undefined && m.roundIndex > max ? m.roundIndex : max;
  }, 0) + 1;

  const getTeamName = (id: string | null, match?: Match) => {
    if (!id) {
      if (match && match.stage === 'knockout' && match.roundIndex === 0) {
        if (match.teamAId || match.teamBId) {
          return 'BYE (Istirahat)';
        }
      }
      return 'Belum Ada Tim';
    }
    const team = teams.find((t) => t.id === id);
    return team ? team.name : 'Belum Ada Tim';
  };

  const openEditModal = (m: Match) => {
    setSelectedMatch(m);
    setModalScoreA(m.scoreA !== null ? m.scoreA.toString() : '');
    setModalScoreB(m.scoreB !== null ? m.scoreB.toString() : '');
    setModalDate(m.date || '');
    setModalTime(m.time || '');
    setModalVenue(m.venue || '');
    setModalIsWO(m.isWO);
    setModalWinnerId(m.winnerId || '');
    setModalTeamAId(m.teamAId || '');
    setModalTeamBId(m.teamBId || '');

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

  const handleSaveModal = () => {
    if (!selectedMatch) return;

    let scA = null;
    let scB = null;
    let winId = '';

    const nextTeamAId = modalTeamAId || null;
    const nextTeamBId = modalTeamBId || null;

    if (sport.toLowerCase().includes('gateball') && !modalIsWO) {
      if (gateballWinnerId && gateballScore !== '') {
        const scoreVal = parseInt(gateballScore) || 0;
        winId = gateballWinnerId;
        if (gateballWinnerId === selectedMatch.teamAId) {
          scA = scoreVal;
          scB = 0;
        } else if (gateballWinnerId === selectedMatch.teamBId) {
          scA = 0;
          scB = scoreVal;
        }
      }
    } else {
      scA = modalScoreA === '' ? null : parseInt(modalScoreA);
      scB = modalScoreB === '' ? null : parseInt(modalScoreB);
      winId = modalWinnerId;

      if (modalIsWO) {
        if (!winId && nextTeamAId && nextTeamBId) {
          winId = nextTeamAId;
        }
      } else if (scA !== null && scB !== null) {
        if (scA > scB && nextTeamAId) winId = nextTeamAId;
        else if (scB > scA && nextTeamBId) winId = nextTeamBId;
        else winId = '';
      } else {
        winId = '';
      }
    }

    onUpdateMatch({
      ...selectedMatch,
      teamAId: nextTeamAId,
      teamBId: nextTeamBId,
      scoreA: scA,
      scoreB: scB,
      date: modalDate,
      time: modalTime,
      venue: modalVenue,
      isWO: modalIsWO,
      winnerId: winId || null
    });

    setSelectedMatch(null);
  };

  // Organize matches by roundIndex
  const roundsData: Match[][] = Array.from({ length: totalRounds }, () => []);
  
  // We want to extract normal knockout matches
  // Filter out the third place match, which we will render separately at the bottom
  const mainKnockoutMatches = knockoutMatches.filter(m => m.roundIndex !== -1);
  const thirdPlaceMatch = knockoutMatches.find(m => m.roundIndex === -1);

  mainKnockoutMatches.forEach((m) => {
    if (m.roundIndex !== undefined && m.roundIndex >= 0 && m.roundIndex < totalRounds) {
      roundsData[m.roundIndex].push(m);
    }
  });

  // Sort matches within each round by matchIndex
  roundsData.forEach((roundMatches) => {
    roundMatches.sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  });

  // Get name of a round (e.g. "16 Besar", "Perempat Final", "Semi Final", "Final")
  const getRoundName = (rIdx: number, total: number) => {
    const roundsLeft = total - rIdx;
    if (roundsLeft === 1) return 'Final';
    if (roundsLeft === 2) return 'Semifinal';
    if (roundsLeft === 3) return 'Perempat Final';
    if (roundsLeft === 4) return '16 Besar';
    return `Babak ${rIdx + 1}`;
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-violet-400" />
          <h2 className="text-md font-bold uppercase tracking-wider text-zinc-300">Bagan Sistem Gugur</h2>
        </div>
        <span className="text-xs text-zinc-500 font-semibold">Klik pertandingan untuk input skor</span>
      </div>

      {knockoutMatches.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          Bagan gugur belum digenerate.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Horizontal scroll container for the bracket tree */}
          <div className="overflow-x-auto pb-6 no-scrollbar flex gap-8 select-none min-h-[400px]">
            {roundsData.map((roundMatches, rIdx) => (
              <div 
                key={rIdx} 
                className="flex flex-col justify-around min-w-[240px] max-w-[280px] flex-1 gap-8"
              >
                {/* Round Header */}
                <div className="text-center pb-2 border-b border-zinc-850 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">
                    {getRoundName(rIdx, totalRounds)}
                  </span>
                </div>

                {/* Match Cards for this Round */}
                <div className="flex flex-col justify-around flex-grow gap-6 py-4">
                  {roundMatches.map((m) => {
                    const hasScore = m.scoreA !== null && m.scoreB !== null;
                    const isWinnerA = m.winnerId === m.teamAId && (hasScore || m.isWO);
                    const isWinnerB = m.winnerId === m.teamBId && (hasScore || m.isWO);

                    return (
                      <div
                        key={m.id}
                        onClick={() => openEditModal(m)}
                        className="glass-card rounded-xl p-3 border border-zinc-850 hover:border-violet-500/50 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2.5 relative group"
                      >
                        {/* Hover Edit Overlay indicator */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                        </div>

                        {/* Match details label */}
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase">
                          <span>Pertandingan {m.matchIndex !== undefined ? m.matchIndex + 1 : ''}</span>
                          {(m.time || m.venue) && (
                            <span className="text-violet-400/80 truncate max-w-[120px]">
                              {m.time ? `${m.time}` : ''} {m.venue ? `@ ${m.venue}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Team A Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate flex-1">
                            <span className={`text-xs font-semibold truncate ${
                              isWinnerA ? 'text-violet-400 font-extrabold' : m.winnerId && m.winnerId !== m.teamAId ? 'text-zinc-500' : 'text-zinc-200'
                            }`}>
                              {getTeamName(m.teamAId, m)}
                            </span>
                          </div>
                          <span className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850 min-w-[20px] text-center ${
                            isWinnerA ? 'text-violet-400 bg-violet-950/20' : 'text-zinc-400'
                          }`}>
                            {m.isWO ? (m.winnerId === m.teamAId ? '20' : '0') : m.roundIndex === 0 && !m.teamBId && m.teamAId ? 'W' : m.scoreA !== null ? m.scoreA : '-'}
                          </span>
                        </div>

                        {/* Team B Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate flex-1">
                            <span className={`text-xs font-semibold truncate ${
                              isWinnerB ? 'text-violet-400 font-extrabold' : m.winnerId && m.winnerId !== m.teamBId ? 'text-zinc-500' : 'text-zinc-200'
                            }`}>
                              {getTeamName(m.teamBId, m)}
                            </span>
                          </div>
                          <span className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850 min-w-[20px] text-center ${
                            isWinnerB ? 'text-violet-400 bg-violet-950/20' : 'text-zinc-400'
                          }`}>
                            {m.isWO ? (m.winnerId === m.teamBId ? '20' : '0') : m.roundIndex === 0 && !m.teamAId && m.teamBId ? 'W' : m.scoreB !== null ? m.scoreB : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Third Place Match Row (if exists) */}
          {thirdPlaceMatch && (
            <div className="border-t border-zinc-850 pt-6 mt-4 max-w-sm">
              <div className="text-left mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-950/40 text-rose-300 px-3 py-1 rounded-md border border-rose-850/40">
                  Perebutan Juara 3
                </span>
              </div>
              
              {(() => {
                const m = thirdPlaceMatch;
                const hasScore = m.scoreA !== null && m.scoreB !== null;
                const isWinnerA = m.winnerId === m.teamAId && (hasScore || m.isWO);
                const isWinnerB = m.winnerId === m.teamBId && (hasScore || m.isWO);

                return (
                  <div
                    onClick={() => openEditModal(m)}
                    className="glass-card rounded-xl p-3 border border-zinc-850 hover:border-violet-500/50 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2 relative group"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase">
                      <span>Perebutan Tempat Ketiga</span>
                      {m.time && <span className="text-violet-400/80">{m.time}</span>}
                    </div>

                    {/* Team A */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${
                        isWinnerA ? 'text-violet-400 font-extrabold' : m.winnerId && m.winnerId !== m.teamAId ? 'text-zinc-500' : 'text-zinc-200'
                      }`}>
                        {getTeamName(m.teamAId, m)}
                      </span>
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900">
                        {m.isWO ? (m.winnerId === m.teamAId ? '20' : '0') : m.scoreA !== null ? m.scoreA : '-'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${
                        isWinnerB ? 'text-violet-400 font-extrabold' : m.winnerId && m.winnerId !== m.teamBId ? 'text-zinc-500' : 'text-zinc-200'
                      }`}>
                        {getTeamName(m.teamBId, m)}
                      </span>
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900">
                        {m.isWO ? (m.winnerId === m.teamBId ? '20' : '0') : m.scoreB !== null ? m.scoreB : '-'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Edit Match Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-zinc-800 text-zinc-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                {selectedMatch.roundIndex === -1 ? 'Edit Perebutan Juara 3' : `Edit Pertandingan Gugur`}
              </span>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Tutup dialog"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Matchup names & selections (Only for first round matches) */}
              {selectedMatch.roundIndex === 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Tim A
                    </label>
                    <select
                      value={modalTeamAId}
                      onChange={(e) => setModalTeamAId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none font-bold focus:ring-1 focus:ring-violet-400"
                    >
                      <option value="">-- BYE (Istirahat) --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Tim B
                    </label>
                    <select
                      value={modalTeamBId}
                      onChange={(e) => setModalTeamBId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none font-bold focus:ring-1 focus:ring-violet-400"
                    >
                      <option value="">-- BYE (Istirahat) --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-850 flex items-center justify-between text-center gap-2">
                  <div className="flex-1 font-semibold text-xs text-zinc-350 truncate">
                    {getTeamName(selectedMatch.teamAId, selectedMatch)}
                  </div>
                  <span className="text-zinc-650 font-bold text-xs">VS</span>
                  <div className="flex-1 font-semibold text-xs text-zinc-350 truncate">
                    {getTeamName(selectedMatch.teamBId, selectedMatch)}
                  </div>
                </div>
              )}

              {/* Schedule Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Hari / Tanggal
                  </label>
                  <input
                    type="text"
                    placeholder="Senin, 23 Juni"
                    className="w-full glass-input text-xs"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    placeholder="07.30 - 08.00"
                    className="w-full glass-input text-xs"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Tempat / Venue
                </label>
                <input
                  type="text"
                  placeholder="Gedung F / Lapangan Basket"
                  className="w-full glass-input text-xs"
                  value={modalVenue}
                  onChange={(e) => setModalVenue(e.target.value)}
                />
              </div>

              {/* Walkover / WO Setup */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="modal-wo"
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-violet-600"
                  checked={modalIsWO}
                  onChange={(e) => {
                    setModalIsWO(e.target.checked);
                    if (e.target.checked && selectedMatch.teamAId) {
                      setModalWinnerId(selectedMatch.teamAId);
                    }
                  }}
                />
                <label htmlFor="modal-wo" className="text-xs select-none cursor-pointer">
                  Menang Walkover (WO)
                </label>
              </div>

              {modalIsWO ? (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Pemenang WO
                  </label>
                  <select
                    value={modalWinnerId}
                    onChange={(e) => setModalWinnerId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none font-bold"
                  >
                    {selectedMatch.teamAId && (
                      <option value={selectedMatch.teamAId}>
                        {getTeamName(selectedMatch.teamAId, selectedMatch)} (Win 20-0)
                      </option>
                    )}
                    {selectedMatch.teamBId && (
                      <option value={selectedMatch.teamBId}>
                        {getTeamName(selectedMatch.teamBId, selectedMatch)} (Win 20-0)
                      </option>
                    )}
                  </select>
                </div>
              ) : (
                sport.toLowerCase().includes('gateball') ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Pemenang Pertandingan
                      </label>
                      <select
                        value={gateballWinnerId}
                        onChange={(e) => setGateballWinnerId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none font-bold"
                      >
                        <option value="">-- Pilih Pemenang --</option>
                        {selectedMatch.teamAId && (
                          <option value={selectedMatch.teamAId}>
                            {getTeamName(selectedMatch.teamAId, selectedMatch)}
                          </option>
                        )}
                        {selectedMatch.teamBId && (
                          <option value={selectedMatch.teamBId}>
                            {getTeamName(selectedMatch.teamBId, selectedMatch)}
                          </option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Skor yang Diperoleh Pemenang
                      </label>
                      <input
                        type="number"
                        placeholder="Contoh: 15"
                        className="w-full glass-input text-sm text-center font-bold"
                        value={gateballScore}
                        onChange={(e) => setGateballScore(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 truncate">
                        Skor {getTeamName(selectedMatch.teamAId, selectedMatch)}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full glass-input text-sm text-center font-bold"
                        value={modalScoreA}
                        onChange={(e) => setModalScoreA(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 truncate">
                        Skor {getTeamName(selectedMatch.teamBId, selectedMatch)}
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full glass-input text-sm text-center font-bold"
                        value={modalScoreB}
                        onChange={(e) => setModalScoreB(e.target.value)}
                      />
                    </div>
                  </div>
                )
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-800 mt-4">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveModal}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Simpan Skor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
