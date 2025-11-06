'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/StatCard';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { formatNumber, formatMinutes } from '@/lib/utils';
import { Users, Star, MessageSquare, Mic, Trophy, TrendingUp, Award, ShoppingBag, BarChart3, Users2, ArrowRight } from 'lucide-react';

interface ServerStats {
  users: {
    total: number;
    averageLevel: number;
    maxLevel: number;
  };
  xp: {
    total: number;
  };
  messages: {
    total: number;
  };
  voice: {
    totalMinutes: number;
  };
  topUsers: Array<{
    userId: string;
    xp: number;
    level: number;
    prestige: number;
  }>;
}

export default function Home() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/leaderboard?limit=10'),
        ]);

        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();

        if (statsData.success) {
          setStats(statsData.data);
        }
        if (leaderboardData.success) {
          setLeaderboard(leaderboardData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const features = [
    { icon: TrendingUp, text: 'XP-based leveling system' },
    { icon: Award, text: 'Prestige tiers with XP boosts' },
    { icon: Trophy, text: 'Beautiful rank cards' },
    { icon: Star, text: 'Achievement system' },
    { icon: ShoppingBag, text: 'Economy with coins and shop' },
    { icon: BarChart3, text: 'Comprehensive statistics' },
    { icon: Users2, text: 'Guilds and partnerships' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-block mb-4">
          <div className="bg-gradient-to-r from-[#5865F2] to-[#4752C4] p-4 rounded-2xl shadow-lg shadow-[#5865F2]/30">
            <Trophy className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Welcome to Heaven Bot
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          A powerful Discord bot for the Lost Heaven server. Track your progress, compete on leaderboards, and unlock achievements.
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            icon={Users}
            loading={loading}
            gradient
          />
          <StatCard
            title="Total XP"
            value={formatNumber(stats.xp.total)}
            icon={Star}
            loading={loading}
            gradient
          />
          <StatCard
            title="Messages"
            value={formatNumber(stats.messages.total)}
            icon={MessageSquare}
            loading={loading}
            gradient
          />
          <StatCard
            title="Voice Time"
            value={formatMinutes(stats.voice.totalMinutes)}
            icon={Mic}
            loading={loading}
            gradient
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Leaderboard Preview */}
        <div>
          <LeaderboardCard entries={leaderboard} loading={loading} />
          <div className="mt-4 text-center">
            <Link
              href="/leaderboard"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40"
            >
              <span>View Full Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
          <div className="flex items-center space-x-2 mb-6">
            <Star className="w-6 h-6 text-[#5865F2]" />
            <h2 className="text-2xl font-bold text-white">Features</h2>
          </div>
          <ul className="space-y-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <li key={index} className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors group">
                  <div className="p-1.5 rounded-lg bg-[#40444b] group-hover:bg-[#5865F2] transition-colors">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span>{feature.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/leaderboard"
          className="group bg-[#2f3136] rounded-lg p-6 border border-[#40444b] hover:border-[#5865F2]/50 transition-all duration-200 hover:shadow-lg hover:shadow-[#5865F2]/20 hover:scale-105"
        >
          <div className="flex items-center space-x-2 mb-3">
            <Trophy className="w-6 h-6 text-[#5865F2] group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white">Leaderboard</h3>
          </div>
          <p className="text-gray-400">See the top players ranked by level, prestige, and XP</p>
        </Link>
        <Link
          href="/stats"
          className="group bg-[#2f3136] rounded-lg p-6 border border-[#40444b] hover:border-[#5865F2]/50 transition-all duration-200 hover:shadow-lg hover:shadow-[#5865F2]/20 hover:scale-105"
        >
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="w-6 h-6 text-[#5865F2] group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white">Statistics</h3>
          </div>
          <p className="text-gray-400">View detailed server-wide statistics and trends</p>
        </Link>
        <Link
          href="/profile"
          className="group bg-[#2f3136] rounded-lg p-6 border border-[#40444b] hover:border-[#5865F2]/50 transition-all duration-200 hover:shadow-lg hover:shadow-[#5865F2]/20 hover:scale-105"
        >
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-6 h-6 text-[#5865F2] group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white">Your Profile</h3>
          </div>
          <p className="text-gray-400">Sign in to view your personal stats and achievements</p>
        </Link>
      </div>
    </div>
  );
}
