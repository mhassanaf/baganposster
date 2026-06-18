'use client';

import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle, Copy, Check, Info } from 'lucide-react';
import { getSupabaseClient, saveStateToSupabase, fetchStateFromSupabase } from '../lib/supabase';

interface SupabaseSyncPanelProps {
  url: string;
  anonKey: string;
  enabled: boolean;
  onConfigChange: (config: { url: string; anonKey: string; enabled: boolean }) => void;
  onPullState: (state: any) => void;
  getCurrentState: () => any;
}

export default function SupabaseSyncPanel({
  url,
  anonKey,
  enabled,
  onConfigChange,
  onPullState,
  getCurrentState
}: SupabaseSyncPanelProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [inputKey, setInputKey] = useState(anonKey);
  const [inputEnabled, setInputEnabled] = useState(enabled);
  
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error_table' | 'error_connection'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const sqlSchema = `-- Buat tabel posster_states di Supabase SQL Editor Anda:
CREATE TABLE IF NOT EXISTS posster_states (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Matikan RLS atau buat kebijakan agar bisa diakses public anon
ALTER TABLE posster_states DISABLE ROW LEVEL SECURITY;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestConnection = async (testPush = false) => {
    if (!inputUrl || !inputKey) {
      setStatus('error_connection');
      setErrorMsg('URL dan Anon Key tidak boleh kosong.');
      return;
    }
    
    setStatus('testing');
    setErrorMsg('');

    const client = getSupabaseClient(inputUrl, inputKey);
    if (!client) {
      setStatus('error_connection');
      setErrorMsg('Format URL atau Anon Key tidak valid.');
      return;
    }

    try {
      if (testPush) {
        const testState = getCurrentState();
        await saveStateToSupabase(client, testState);
        setStatus('success');
      } else {
        // Test by fetching
        await fetchStateFromSupabase(client);
        setStatus('success');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('relation') || err.message.includes('does not exist'))) {
        setStatus('error_table');
        setErrorMsg('Tabel "posster_states" belum dibuat di database Supabase Anda.');
      } else {
        setStatus('error_connection');
        setErrorMsg(err.message || 'Koneksi gagal. Cek kembali URL/Key Anda atau koneksi internet.');
      }
    }
  };

  const handleSaveConfig = () => {
    onConfigChange({
      url: inputUrl,
      anonKey: inputKey,
      enabled: inputEnabled
    });
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleSyncPull = async () => {
    setStatus('testing');
    setErrorMsg('');
    const client = getSupabaseClient(inputUrl, inputKey);
    if (!client) {
      setStatus('error_connection');
      setErrorMsg('Gagal menginisialisasi client Supabase.');
      return;
    }
    try {
      const data = await fetchStateFromSupabase(client);
      if (data) {
        onPullState(data);
        setStatus('success');
      } else {
        setStatus('error_table');
        setErrorMsg('Data kosong atau tabel belum ada.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error_connection');
      setErrorMsg(err.message || 'Gagal mengambil data dari Supabase.');
    }
  };

  const handleSyncPush = async () => {
    await handleTestConnection(true);
  };

  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-2xl mx-auto my-4 text-zinc-100">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-violet-400" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Koneksi Database Supabase</h2>
          <p className="text-xs text-zinc-400">Sinkronisasikan data turnamen POSSTER secara real-time ke cloud</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Supabase Project URL
          </label>
          <input
            type="text"
            className="w-full glass-input text-sm focus:ring-violet-400"
            placeholder="https://xxxx.supabase.co"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Anon Public Key
          </label>
          <textarea
            className="w-full glass-input text-xs h-20 focus:ring-violet-400 font-mono no-scrollbar"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="supabase-enabled"
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-400"
            checked={inputEnabled}
            onChange={(e) => setInputEnabled(e.target.checked)}
          />
          <label htmlFor="supabase-enabled" className="text-sm select-none cursor-pointer">
            Aktifkan Sinkronisasi Otomatis (Setiap Perubahan Data)
          </label>
        </div>

        {/* Status Indicators */}
        {status !== 'idle' && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            status === 'testing' ? 'bg-zinc-800/50 text-zinc-300' :
            status === 'success' ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/30' :
            'bg-rose-950/30 text-rose-300 border border-rose-800/30'
          }`}>
            {status === 'testing' && <RefreshCw className="w-5 h-5 animate-spin mt-0.5 shrink-0" />}
            {status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
            {(status === 'error_table' || status === 'error_connection') && (
              <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {status === 'testing' ? 'Sedang menghubungkan...' :
                 status === 'success' ? 'Berhasil Terkoneksi & Sinkron!' :
                 'Koneksi Gagal'}
              </span>
              {errorMsg && <p className="text-xs mt-1 text-zinc-400">{errorMsg}</p>}
            </div>
          </div>
        )}

        {/* SQL Schema helper for Missing Table */}
        {status === 'error_table' && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-850 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Info className="w-4 h-4" />
              <span>LANGKAH PERBAIKAN: TABEL TIDAK DITEMUKAN</span>
            </div>
            <p className="text-xs text-zinc-400">
              Silakan salin skrip SQL di bawah ini dan jalankan di panel **SQL Editor** pada dasbor Supabase Anda untuk membuat tabel yang dibutuhkan:
            </p>
            <div className="relative">
              <pre className="text-[10px] font-mono bg-black p-3 rounded-lg overflow-x-auto text-zinc-300 max-h-36 no-scrollbar">
                {sqlSchema}
              </pre>
              <button
                onClick={copySql}
                className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded text-zinc-300 transition-colors"
                title="Salin SQL"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 justify-end">
          <button
            onClick={() => handleTestConnection(false)}
            className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-all cursor-pointer"
            disabled={status === 'testing'}
          >
            Tes Koneksi
          </button>
          <button
            onClick={handleSyncPull}
            className="px-4 py-2 text-xs font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            disabled={status === 'testing'}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Pull Cloud
          </button>
          <button
            onClick={handleSyncPush}
            className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer"
            disabled={status === 'testing'}
          >
            Push Cloud
          </button>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all cursor-pointer"
          >
            {copiedStatus ? 'Tersimpan!' : 'Simpan Konfigurasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
