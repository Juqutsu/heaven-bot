'use client';

import { formatNumber, formatMinutes } from '@/lib/utils';

interface UserProfileData {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  coins: number;
  reputation: number;
  totalTextXp: number;
  totalVoiceXp: number;
  statistics: {
    messages: { total: number; daily: Record<string, number> };
    voice: { totalMinutes: number; daily: Record<string, number> };
    commands: { total: number };
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string | null;
    type: string;
    unlockedAt: number;
  }>;
  inventoryCount: number;
}

interface UserProfileProps {
  data: UserProfileData;
  loading?: boolean;
}

export function UserProfile({ data, loading }: UserProfileProps) {
  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-[#40444b] rounded" />
          <div className="h-24 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  const totalXp = data.xp;
  const textPercent = totalXp > 0 ? Math.round((data.totalTextXp / totalXp) * 100) : 0;
  const voicePercent = totalXp > 0 ? Math.round((data.totalVoiceXp / totalXp) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="bg-[#2f3136] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Profile</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Level</div>
            <div className="text-2xl font-bold text-white">{data.level}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">XP</div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.xp)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Prestige</div>
            <div className="text-2xl font-bold text-white">{data.prestige}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Coins</div>
            <div className="text-2xl font-bold text-white">{formatNumber(data.coins)}</div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-[#2f3136] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Messages</div>
            <div className="text-xl font-semibold text-white">
              {formatNumber(data.statistics.messages.total)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Voice Time</div>
            <div className="text-xl font-semibold text-white">
              {formatMinutes(data.statistics.voice.totalMinutes)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Commands</div>
            <div className="text-xl font-semibold text-white">
              {formatNumber(data.statistics.commands.total)}
            </div>
          </div>
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="bg-[#2f3136] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">XP Breakdown</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Text XP</span>
              <span className="text-white">
                {formatNumber(data.totalTextXp)} ({textPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#40444b] rounded-full h-2">
              <div
                className="bg-[#5865F2] h-2 rounded-full"
                style={{ width: `${textPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Voice XP</span>
              <span className="text-white">
                {formatNumber(data.totalVoiceXp)} ({voicePercent}%)
              </span>
            </div>
            <div className="w-full bg-[#40444b] rounded-full h-2">
              <div
                className="bg-[#5865F2] h-2 rounded-full"
                style={{ width: `${voicePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <div className="bg-[#2f3136] rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-[#40444b] rounded-lg p-4 hover:bg-[#36393f] transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {achievement.icon && (
                    <span className="text-2xl">{achievement.icon}</span>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-white">{achievement.name}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="bg-[#2f3136] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Inventory</h2>
        <p className="text-gray-400">{data.inventoryCount} items</p>
      </div>
    </div>
  );
}

