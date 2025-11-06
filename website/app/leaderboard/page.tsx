'use client';

import { useEffect, useState } from 'react';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  coins: number;
  reputation: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const response = await fetch(`/api/leaderboard?limit=${limit}`);
        const data = await response.json();

        if (data.success) {
          setEntries(data.data);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [limit]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
        </div>
        <p className="text-gray-400">Top players ranked by prestige, level, and XP</p>
      </div>

      <div className="mb-4 flex items-center space-x-4">
        <label className="text-gray-300 font-medium">Show:</label>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-[#2f3136] text-white border border-[#40444b] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:border-transparent transition-all"
        >
          <option value={10}>Top 10</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
        </select>
      </div>

      <LeaderboardCard entries={entries} loading={loading} />
    </div>
  );
}
