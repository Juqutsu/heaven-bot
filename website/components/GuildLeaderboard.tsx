'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface Guild {
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
  createdAt: number;
}

export function GuildLeaderboard() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGuilds() {
      try {
        setLoading(true);
        const response = await fetch('/api/guilds');
        const result = await response.json();

        if (result.success) {
          setGuilds(result.data);
        }
      } catch (error) {
        console.error('Error fetching guilds:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGuilds();
  }, []);

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

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-6">
        <Trophy className="w-6 h-6 text-[#5865F2]" />
        <h2 className="text-2xl font-bold text-white">Guild Leaderboard</h2>
      </div>

      {guilds.length === 0 ? (
        <p className="text-gray-400">No guilds found</p>
      ) : (
        <div className="space-y-3">
          {guilds.map((guild, index) => (
            <Link
              key={guild.guildId}
              href={`/guilds/${guild.guildId}`}
              className="block"
            >
              <div className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-bold text-white w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  {guild.icon && (
                    <img src={guild.icon} alt={guild.name} className="w-12 h-12 rounded-lg" />
                  )}
                  <div>
                    <div className="text-white font-medium flex items-center space-x-2">
                      <span>{guild.name}</span>
                      {guild.leader && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded-full">
                          Leader: L{guild.leader.level}
                        </span>
                      )}
                    </div>
                    {guild.description && (
                      <div className="text-sm text-gray-400 mt-1">{guild.description}</div>
                    )}
                    <div className="text-sm text-gray-400 mt-1">
                      Level {guild.level} • {formatNumber(guild.experience)} XP
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 text-white font-medium">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{guild.memberCount}/{guild.maxMembers}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatNumber(guild.coins)} coins
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

