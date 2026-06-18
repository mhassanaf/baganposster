'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Users, ChevronRight, Play, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface SportConfigPanelProps {
  initialFormat?: 'grup' | 'gugur' | 'grup_gugur';
  initialTeamCount?: number;
  initialGroupCount?: number;
  initialTeams?: Team[];
  onGenerate: (config: {
    format: 'grup' | 'gugur' | 'grup_gugur';
    teamCount: number;
    groupCount: number;
    teams: Team[];
  }) => void;
  onReset: () => void;
  isGenerated: boolean;
}

const TeamInputItem = React.memo(({ 
  index, 
  initialName, 
  onNameChange 
}: { 
  index: number; 
  initialName: string; 
  onNameChange: (index: number, name: string) => void; 
}) => {
  const [localName, setLocalName] = useState(initialName);

  useEffect(() => {
    setLocalName(initialName);
  }, [initialName]);

  const handleChange = (val: string) => {
    setLocalName(val);
    onNameChange(index, val);
  };

  return (
    <div className="flex items-center gap-2 bg-zinc-900/40 rounded-xl p-2 border border-zinc-850 hover:border-zinc-800 transition-all">
      <span className="text-xs font-bold text-zinc-500 w-6 text-center">{index + 1}</span>
      <input
        type="text"
        className="w-full bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-600 focus:ring-0 py-1"
        placeholder={`Nama Tim ${index + 1}`}
        value={localName}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
});
TeamInputItem.displayName = 'TeamInputItem';

export default function SportConfigPanel({
  initialFormat = 'grup',
  initialTeamCount = 4,
  initialGroupCount = 2,
  initialTeams = [],
  onGenerate,
  onReset,
  isGenerated
}: SportConfigPanelProps) {
  const [format, setFormat] = useState<'grup' | 'gugur' | 'grup_gugur'>(initialFormat);
  const [teamCount, setTeamCount] = useState<number>(initialTeamCount);
  const [groupCount, setGroupCount] = useState<number>(initialGroupCount);
  const [teams, setTeams] = useState<Team[]>(initialTeams);

  // String intermediate states to support easy backspace/typing deletion
  const [teamCountStr, setTeamCountStr] = useState<string>(initialTeamCount.toString());
  const [groupCountStr, setGroupCountStr] = useState<string>(initialGroupCount.toString());

  // Sync state if initial values change (e.g. tab switches)
  useEffect(() => {
    setFormat(initialFormat);
    setTeamCount(initialTeamCount);
    setGroupCount(initialGroupCount);
    setTeams(initialTeams);
    setTeamCountStr(initialTeamCount.toString());
    setGroupCountStr(initialGroupCount.toString());
  }, [initialFormat, initialTeamCount, initialGroupCount, initialTeams]);

  // Adjust teams array length when teamCount changes
  const handleTeamCountChange = (count: number) => {
    const val = Math.max(2, Math.min(64, count));
    setTeamCount(val);

    setTeams(prevTeams => {
      const newTeams = [...prevTeams];
      if (newTeams.length < val) {
        // Add new blank teams
        for (let i = newTeams.length; i < val; i++) {
          newTeams.push({ id: `team-${Date.now()}-${i}`, name: `TIM ${i + 1}` });
        }
      } else if (newTeams.length > val) {
        // Truncate teams
        newTeams.splice(val);
      }
      return newTeams;
    });
  };

  const handleTeamCountStrChange = (val: string) => {
    setTeamCountStr(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      handleTeamCountChange(parsed);
    }
  };

  const handleTeamCountBlur = () => {
    let parsed = parseInt(teamCountStr) || 2;
    parsed = Math.max(2, Math.min(64, parsed));
    setTeamCountStr(parsed.toString());
    handleTeamCountChange(parsed);
  };

  const handleGroupCountStrChange = (val: string) => {
    setGroupCountStr(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      setGroupCount(Math.max(1, Math.min(16, parsed)));
    }
  };

  const handleGroupCountBlur = () => {
    let parsed = parseInt(groupCountStr) || 1;
    parsed = Math.max(1, Math.min(16, parsed));
    setGroupCountStr(parsed.toString());
    setGroupCount(parsed);
  };

  const handleTeamNameChange = useCallback((index: number, name: string) => {
    setTeams(prevTeams => {
      const newTeams = [...prevTeams];
      newTeams[index] = { ...newTeams[index], name };
      return newTeams;
    });
  }, []);

  const handleGenerate = () => {
    onGenerate({
      format,
      teamCount,
      groupCount,
      teams: teams.map((t, idx) => ({
        id: t.id || `team-${idx}`,
        name: t.name.trim() || `TIM ${idx + 1}`
      }))
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6 text-zinc-100 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-violet-400" />
          <h2 className="text-lg font-bold tracking-tight">Pengaturan Perlombaan</h2>
        </div>
        {isGenerated && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/30 text-rose-300 rounded-lg text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Bagan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Format Turnamen */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Format Turnamen
          </label>
          <div className="space-y-2">
            {(['gugur', 'grup', 'grup_gugur'] as const).map((opt) => (
              <button
                key={opt}
                disabled={isGenerated}
                onClick={() => setFormat(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center justify-between ${
                  format === opt
                    ? 'bg-violet-600/20 border-violet-500 text-white font-semibold'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span>
                  {opt === 'gugur' && 'Sistem Gugur (Eliminasi)'}
                  {opt === 'grup' && 'Fase Grup (Round Robin)'}
                  {opt === 'grup_gugur' && 'Fase Grup & Gugur'}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${format === opt ? 'translate-x-0.5 text-violet-400' : 'text-zinc-600'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Jumlah Tim & Jumlah Grup */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Jumlah Tim Peserta
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                disabled={isGenerated}
                className="w-full glass-input text-sm focus:ring-violet-400"
                min={2}
                max={64}
                value={teamCountStr}
                onChange={(e) => handleTeamCountStrChange(e.target.value)}
                onBlur={handleTeamCountBlur}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Masukkan antara 2 hingga 64 tim</p>
          </div>

          {(format === 'grup' || format === 'grup_gugur') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Jumlah Grup
              </label>
              <input
                type="number"
                disabled={isGenerated}
                className="w-full glass-input text-sm focus:ring-violet-400"
                min={1}
                max={16}
                value={groupCountStr}
                onChange={(e) => handleGroupCountStrChange(e.target.value)}
                onBlur={handleGroupCountBlur}
              />
              <p className="text-[10px] text-zinc-500 mt-1">Bagi peserta ke dalam grup</p>
            </div>
          )}
        </div>

        {/* Info Cepat / Ringkasan */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-850 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ringkasan Format</h3>
            <div className="space-y-2 text-sm text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Tipe Bagan:</span>
                <span className="font-semibold text-zinc-200">
                  {format === 'gugur' ? 'Langsung Eliminasi' : format === 'grup' ? 'Full Kompetisi' : 'Grup lalu Eliminasi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Tim:</span>
                <span className="font-semibold text-zinc-200">{teamCount} Tim</span>
              </div>
              {(format === 'grup' || format === 'grup_gugur') && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Rata-rata / Grup:</span>
                  <span className="font-semibold text-zinc-200">
                    {Math.ceil(teamCount / groupCount)} Tim
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isGenerated && (
            <button
              onClick={handleGenerate}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Buat Turnamen & Bagan
            </button>
          )}
        </div>
      </div>

      {/* CRUD Nama-Nama Tim */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-violet-400" /> Input & Edit Nama Tim Peserta
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1 no-scrollbar">
          {Array.from({ length: teamCount }).map((_, idx) => {
            const team = teams[idx] || { id: `team-temp-${idx}`, name: '' };
            return (
              <TeamInputItem
                key={team.id || `team-input-${idx}`}
                index={idx}
                initialName={team.name}
                onNameChange={handleTeamNameChange}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
