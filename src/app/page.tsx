import SportsDashboard from './components/SportsDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POSSTER Arena Hub - Dashboard Bagan & Perlombaan',
  description: 'Sistem manajemen pertandingan olahraga, jadwal, klasemen, dan bagan sistem gugur otomatis untuk acara POSSTER Kampus.',
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SportsDashboard />
    </div>
  );
}
