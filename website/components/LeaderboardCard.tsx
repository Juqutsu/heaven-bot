'use client';

import { formatNumber } from '@/lib/utils';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  coins: number;
  reputation: number;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
}

export function LeaderboardCard({ entries, loading }: LeaderboardCardProps) {
  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20 animate-pulse">
        <div className="h-6 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-[#40444b] rounded" />
          ))}
        </div>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-semibold text-gray-400">{index + 1}.</span>;
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-6">
        <Trophy className="w-6 h-6 text-[#5865F2]" />
        <h2 className="text-2xl font-bold text-white">Top Players</h2>
      </div>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No users found in the leaderboard yet.</p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white font-medium truncate">
                      User {entry.userId.slice(0, 8)}...
                    </span>
                    {entry.prestige > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                        P{entry.prestige}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center space-x-2">
                    <span>Level {entry.level}</span>
                    <span>•</span>
                    <span>{formatNumber(entry.xp)} XP</span>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-300 flex-shrink-0 ml-4">
                <div className="flex items-center space-x-1 justify-end">
                  <span className="text-[#FEE75C]">💰</span>
                  <span>{formatNumber(entry.coins)}</span>
                </div>
                {entry.reputation > 0 && (
                  <div className="flex items-center space-x-1 justify-end mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-400">{entry.reputation}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
