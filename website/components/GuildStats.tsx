'use client';

import { useEffect, useState } from 'react';
import { Users, Crown, Coins, Star, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface GuildMember {
  userId: string;
  role: string;
  joinedAt: number;
  contributionXp: number;
  contributionCoins: number;
  xp: number;
  level: number;
  prestige: number;
  coins: number;
  reputation: number;
}

interface GuildData {
  guildId: string;
  name: string;
  description: string | null;
  icon: string | null;
  leaderId: string;
  leader: {
    userId: string;
    xp: number;
    level: number;
    prestige: number;
  } | null;
  level: number;
  experience: number;
  coins: number;
  maxMembers: number;
  memberCount: number;
  totalXp: number;
  totalCoins: number;
  createdAt: number;
  members: GuildMember[];
  leaderboard: Array<{
    periodType: string;
    periodKey: string;
    totalXp: number;
    totalCoins: number;
    memberCount: number;
    rank: number | null;
    updatedAt: number;
  }>;
}

interface GuildStatsProps {
  guildId: string;
}

export function GuildStats({ guildId }: GuildStatsProps) {
  const [data, setData] = useState<GuildData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGuild() {
      try {
        setLoading(true);
        const response = await fetch(`/api/guilds/${guildId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching guild:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGuild();
  }, [guildId]);

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
        <p className="text-gray-400">Guild not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guild Info */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-4 mb-4">
          {data.icon && (
            <img src={data.icon} alt={data.name} className="w-16 h-16 rounded-lg" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>{data.name}</span>
              {data.leader && (
                <Crown className="w-5 h-5 text-yellow-400" />
              )}
            </h2>
            {data.description && (
              <p className="text-gray-400 mt-1">{data.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-4 h-4 text-[#5865F2]" />
              <span className="text-sm text-gray-400">Level</span>
            </div>
            <div className="text-2xl font-bold text-white">{data.level}</div>
            <div className="text-xs text-gray-400 mt-1">{formatNumber(data.experience)} XP</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-[#5865F2]" />
              <span className="text-sm text-gray-400">Members</span>
            </div>
            <div className="text-2xl font-bold text-white">{data.memberCount}</div>
            <div className="text-xs text-gray-400 mt-1">/{data.maxMembers} max</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="flex items-center space-x-2 mb-2">
              <Coins className="w-4 h-4 text-[#5865F2]" />
              <span className="text-sm text-gray-400">Coins</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.coins)}</div>
            <div className="text-xs text-gray-400 mt-1">{formatNumber(data.totalCoins)} total</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#5865F2]" />
              <span className="text-sm text-gray-400">Total XP</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.totalXp)}</div>
            <div className="text-xs text-gray-400 mt-1">Contributions</div>
          </div>
        </div>
      </div>

      {/* Leader */}
      {data.leader && (
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span>Leader</span>
          </h3>
          <div className="flex items-center space-x-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
            <div>
              <div className="text-white font-medium">
                User {data.leader.userId.slice(0, 8)}...
                {data.leader.prestige > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                    P{data.leader.prestige}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Level {data.leader.level} • {formatNumber(data.leader.xp)} XP
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-[#5865F2]" />
          <span>Members ({data.members.length})</span>
        </h3>
        <div className="space-y-3">
          {data.members.map((member, index) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="text-white font-medium w-8">#{index + 1}</div>
                <div>
                  <div className="text-white font-medium flex items-center space-x-2">
                    <span>User {member.userId.slice(0, 8)}...</span>
                    {member.role === 'leader' && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                    {member.prestige > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                        P{member.prestige}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Level {member.level} • {formatNumber(member.xp)} XP
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">
                  {formatNumber(member.contributionXp)} XP
                </div>
                <div className="text-xs text-gray-400">
                  {formatNumber(member.contributionCoins)} coins
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

