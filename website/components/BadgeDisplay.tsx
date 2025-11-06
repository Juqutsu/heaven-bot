'use client';

import { Award, Trophy, Star, Target } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  type: string;
  unlockedAt: number;
}

interface BadgeDisplayProps {
  badges: Badge[];
  maxDisplay?: number;
}

export function BadgeDisplay({ badges, maxDisplay = 12 }: BadgeDisplayProps) {
  const displayedBadges = badges.slice(0, maxDisplay);

  const getBadgeIcon = (type: string, icon: string | null) => {
    if (icon) {
      return <span className="text-2xl">{icon}</span>;
    }
    
    switch (type) {
      case 'level':
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 'messages':
        return <Target className="w-6 h-6 text-blue-400" />;
      case 'voice':
        return <Star className="w-6 h-6 text-purple-400" />;
      case 'streak':
        return <Award className="w-6 h-6 text-green-400" />;
      default:
        return <Award className="w-6 h-6 text-[#5865F2]" />;
    }
  };

  if (badges.length === 0) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-5 h-5 text-[#5865F2]" />
          <h3 className="text-lg font-semibold text-white">Badges</h3>
        </div>
        <p className="text-gray-400">No badges unlocked yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-4">
        <Award className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">
          Badges ({badges.length})
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedBadges.map((badge) => (
          <div
            key={badge.id}
            className="p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200 group"
            title={badge.description}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-[#2f3136] rounded-full group-hover:scale-110 transition-transform">
                {getBadgeIcon(badge.type, badge.icon)}
              </div>
              <div>
                <div className="text-white font-medium text-sm">{badge.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(badge.unlockedAt * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {badges.length > maxDisplay && (
        <p className="text-sm text-gray-400 mt-4 text-center">
          +{badges.length - maxDisplay} more badges
        </p>
      )}
    </div>
  );
}

