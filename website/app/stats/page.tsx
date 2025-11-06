'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { formatNumber, formatMinutes } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, Users, Star, MessageSquare, Mic, Coins, Trophy, TrendingUp } from 'lucide-react';
import { TrendChart } from '@/components/TrendChart';

interface ServerStats {
  users: {
    total: number;
    averageLevel: number;
    maxLevel: number;
    averagePrestige: number;
    maxPrestige: number;
  };
  xp: {
    total: number;
  };
  coins: {
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

interface TrendsData {
  daily: {
    messages: Array<{ date: string; value: number }>;
    voice: Array<{ date: string; value: number }>;
  };
  weekly: {
    messages: Array<{ week: string; value: number }>;
    voice: Array<{ week: string; value: number }>;
  };
  monthly: {
    messages: Array<{ month: string; value: number }>;
    voice: Array<{ month: string; value: number }>;
  };
  userGrowth: Array<{ month: string; count: number }>;
  peakActivity: Array<{ hour: number; count: number }>;
  trends: {
    messages: number;
    voice: number;
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, trendsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/stats/trends'),
        ]);

        const statsData = await statsRes.json();
        const trendsData = await trendsRes.json();

        if (statsData.success) {
          setStats(statsData.data);
        }

        if (trendsData.success) {
          setTrends(trendsData.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const chartData = stats?.topUsers.map((user, index) => ({
    name: `#${index + 1}`,
    xp: user.xp,
    level: user.level,
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Server Statistics</h1>
        </div>
        <p className="text-gray-400">Comprehensive statistics and analytics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          subtitle={`Avg Level: ${stats?.users.averageLevel || 0}`}
          icon={Users}
          loading={loading}
          gradient
        />
        <StatCard
          title="Total XP"
          value={formatNumber(stats?.xp.total || 0)}
          icon={Star}
          loading={loading}
          gradient
        />
        <StatCard
          title="Total Messages"
          value={formatNumber(stats?.messages.total || 0)}
          icon={MessageSquare}
          loading={loading}
          gradient
        />
        <StatCard
          title="Voice Time"
          value={formatMinutes(stats?.voice.totalMinutes || 0)}
          icon={Mic}
          loading={loading}
          gradient
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Coins"
          value={formatNumber(stats?.coins.total || 0)}
          icon={Coins}
          loading={loading}
        />
        <StatCard
          title="Highest Level"
          value={stats?.users.maxLevel || 0}
          subtitle={`Prestige: ${stats?.users.maxPrestige || 0}`}
          icon={Trophy}
          loading={loading}
        />
        <StatCard
          title="Average Prestige"
          value={stats?.users.averagePrestige || 0}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Charts */}
      {stats && stats.topUsers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Users XP Chart */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
            <h2 className="text-2xl font-bold text-white mb-4">Top Users XP</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#40444b" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2f3136', border: '1px solid #40444b', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="xp" fill="#5865F2" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Users Level Chart */}
          <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
            <h2 className="text-2xl font-bold text-white mb-4">Top Users Level</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#40444b" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2f3136', border: '1px solid #40444b', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="level" fill="#57F287" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Users List */}
      {stats && stats.topUsers.length > 0 && (
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
          <h2 className="text-2xl font-bold text-white mb-4">Top 5 Users</h2>
          <div className="space-y-3">
            {stats.topUsers.map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-bold text-white w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <div>
                    <div className="text-white font-medium">
                      User {user.userId.slice(0, 8)}...
                      {user.prestige > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                          P{user.prestige}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Level {user.level} • {formatNumber(user.xp)} XP
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Section */}
      {trends && (
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Activity Trends</h2>
            <p className="text-gray-400">Server-wide activity patterns over time</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <TrendChart
              title="Daily Messages Trend"
              data={trends.daily.messages}
              dataKey="value"
              color="#5865F2"
              period="daily"
            />
            <TrendChart
              title="Daily Voice Activity Trend"
              data={trends.daily.voice}
              dataKey="value"
              color="#57F287"
              period="daily"
            />
          </div>

          {trends.trends && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
                <h3 className="text-lg font-semibold text-white mb-2">Message Trend</h3>
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`w-5 h-5 ${trends.trends.messages >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`text-2xl font-bold ${trends.trends.messages >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trends.trends.messages >= 0 ? '+' : ''}{trends.trends.messages.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2">Compared to previous period</p>
              </div>
              <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
                <h3 className="text-lg font-semibold text-white mb-2">Voice Activity Trend</h3>
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`w-5 h-5 ${trends.trends.voice >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`text-2xl font-bold ${trends.trends.voice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trends.trends.voice >= 0 ? '+' : ''}{trends.trends.voice.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2">Compared to previous period</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
