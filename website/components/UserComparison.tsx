'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNumber, formatMinutes } from '@/lib/utils';

interface ComparisonData {
  user1: {
    userId: string;
    xp: number;
    level: number;
    prestige: number;
    coins: number;
    reputation: number;
    totalTextXp: number;
    totalVoiceXp: number;
    nextLevelXp: number;
    statistics: {
      messages: number;
      voice: number;
      commands: number;
    };
    achievements: number;
    streak: {
      current: number;
      longest: number;
    } | null;
    rank: {
      xp: number;
      level: number;
      prestige: number;
    };
    createdAt: number;
  };
  user2: {
    userId: string;
    xp: number;
    level: number;
    prestige: number;
    coins: number;
    reputation: number;
    totalTextXp: number;
    totalVoiceXp: number;
    nextLevelXp: number;
    statistics: {
      messages: number;
      voice: number;
      commands: number;
    };
    achievements: number;
    streak: {
      current: number;
      longest: number;
    } | null;
    rank: {
      xp: number;
      level: number;
      prestige: number;
    };
    createdAt: number;
  };
  differences: {
    xp: number;
    level: number;
    prestige: number;
    coins: number;
    reputation: number;
    messages: number;
    voice: number;
    achievements: number;
  };
}

interface UserComparisonProps {
  userId1: string;
  userId2: string;
}

export function UserComparison({ userId1, userId2 }: UserComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComparison() {
      try {
        setLoading(true);
        const response = await fetch(`/api/compare/${userId1}/${userId2}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching comparison:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId1 && userId2) {
      fetchComparison();
    }
  }, [userId1, userId2]);

  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-[#40444b] rounded" />
          <div className="h-24 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
        <p className="text-gray-400">Failed to load comparison data</p>
      </div>
    );
  }

  const renderComparisonRow = (
    label: string,
    value1: string | number,
    value2: string | number,
    diff: number,
    format?: (val: number) => string
  ) => {
    const formatted1 = format ? format(typeof value1 === 'number' ? value1 : 0) : value1;
    const formatted2 = format ? format(typeof value2 === 'number' ? value2 : 0) : value2;
    const isUser1Better = diff > 0;
    const isEqual = diff === 0;

    return (
      <div className="grid grid-cols-3 gap-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] transition-colors">
        <div className="text-right">
          <div className="text-white font-semibold">{formatted1}</div>
          {!isEqual && (
            <div className={`text-xs flex items-center justify-end space-x-1 mt-1 ${isUser1Better ? 'text-green-400' : 'text-red-400'}`}>
              {isUser1Better ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isUser1Better ? '+' : ''}{format ? format(diff) : diff}</span>
            </div>
          )}
        </div>
        <div className="text-center text-gray-400 font-medium">{label}</div>
        <div className="text-left">
          <div className="text-white font-semibold">{formatted2}</div>
          {!isEqual && (
            <div className={`text-xs flex items-center space-x-1 mt-1 ${!isUser1Better ? 'text-green-400' : 'text-red-400'}`}>
              {!isUser1Better ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{!isUser1Better ? '+' : ''}{format ? format(-diff) : -diff}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-6">
        <Users className="w-6 h-6 text-[#5865F2]" />
        <h2 className="text-2xl font-bold text-white">User Comparison</h2>
      </div>

      <div className="space-y-4">
        {renderComparisonRow('Level', data.user1.level, data.user2.level, data.differences.level)}
        {renderComparisonRow('XP', data.user1.xp, data.user2.xp, data.differences.xp, formatNumber)}
        {renderComparisonRow('Prestige', data.user1.prestige, data.user2.prestige, data.differences.prestige)}
        {renderComparisonRow('Coins', data.user1.coins, data.user2.coins, data.differences.coins, formatNumber)}
        {renderComparisonRow('Reputation', data.user1.reputation, data.user2.reputation, data.differences.reputation)}
        {renderComparisonRow('Messages', data.user1.statistics.messages, data.user2.statistics.messages, data.differences.messages, formatNumber)}
        {renderComparisonRow('Voice Time', data.user1.statistics.voice, data.user2.statistics.voice, data.differences.voice, formatMinutes)}
        {renderComparisonRow('Achievements', data.user1.achievements, data.user2.achievements, data.differences.achievements)}
        
        {data.user1.streak && data.user2.streak && (
          <>
            {renderComparisonRow('Current Streak', data.user1.streak.current, data.user2.streak.current, data.user1.streak.current - data.user2.streak.current)}
            {renderComparisonRow('Longest Streak', data.user1.streak.longest, data.user2.streak.longest, data.user1.streak.longest - data.user2.streak.longest)}
          </>
        )}

        <div className="grid grid-cols-3 gap-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
          <div className="text-right">
            <div className="text-white font-semibold">
              #{data.user1.rank.xp} XP • #{data.user1.rank.level} Level • #{data.user1.rank.prestige} Prestige
            </div>
          </div>
          <div className="text-center text-gray-400 font-medium">Global Rank</div>
          <div className="text-left">
            <div className="text-white font-semibold">
              #{data.user2.rank.xp} XP • #{data.user2.rank.level} Level • #{data.user2.rank.prestige} Prestige
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

