'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ActivityHeatmap } from './ActivityHeatmap';
import { TrendChart } from './TrendChart';
import { StatCard } from './StatCard';
import { InsightsDashboard } from './InsightsDashboard';
import { BarChart3, TrendingUp, Calendar, Target } from 'lucide-react';

interface AnalyticsData {
  userId: string;
  level: number;
  xp: number;
  prestige: number;
  nextLevelXp: number;
  progressPercent: number;
  statistics: {
    messages: { daily: Array<{ date: string; value: number }>; weekly: any[]; monthly: any[] };
    voice: { daily: Array<{ date: string; value: number }>; weekly: any[]; monthly: any[] };
    commands: { daily: any[]; weekly: any[]; monthly: any[] };
  };
  streak: {
    current: number;
    longest: number;
    lastActivity: string | null;
  } | null;
  heatmapData: Array<{ date: string; value: number }>;
}

export function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (session?.user?.id) {
      async function fetchAnalytics() {
        try {
          setLoading(true);
          const response = await fetch(`/api/analytics/${session.user.id}`);
          const result = await response.json();

          if (result.success) {
            setData(result.data);
          }
        } catch (error) {
          console.error('Error fetching analytics:', error);
        } finally {
          setLoading(false);
        }
      }

      fetchAnalytics();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-[#2f3136] rounded-lg animate-pulse" />
        <div className="h-64 bg-[#2f3136] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
        <p className="text-gray-400">No analytics data available</p>
      </div>
    );
  }

  const getCurrentPeriodData = () => {
    if (period === 'daily') {
      return {
        messages: data.statistics.messages.daily.slice(-30),
        voice: data.statistics.voice.daily.slice(-30),
      };
    } else if (period === 'weekly') {
      return {
        messages: data.statistics.messages.weekly.slice(-12),
        voice: data.statistics.voice.weekly.slice(-12),
      };
    } else {
      return {
        messages: data.statistics.messages.monthly.slice(-12),
        voice: data.statistics.voice.monthly.slice(-12),
      };
    }
  };

  const periodData = getCurrentPeriodData();

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setPeriod('daily')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'daily'
              ? 'bg-[#5865F2] text-white'
              : 'bg-[#40444b] text-gray-300 hover:bg-[#36393f]'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setPeriod('weekly')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'weekly'
              ? 'bg-[#5865F2] text-white'
              : 'bg-[#40444b] text-gray-300 hover:bg-[#36393f]'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setPeriod('monthly')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            period === 'monthly'
              ? 'bg-[#5865F2] text-white'
              : 'bg-[#40444b] text-gray-300 hover:bg-[#36393f]'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Current Streak"
          value={data.streak?.current || 0}
          subtitle={`Longest: ${data.streak?.longest || 0} days`}
          icon={Target}
          loading={false}
        />
        <StatCard
          title="Level Progress"
          value={`${data.progressPercent.toFixed(1)}%`}
          subtitle={`Level ${data.level} → ${data.level + 1}`}
          icon={TrendingUp}
          loading={false}
        />
        <StatCard
          title="Total XP"
          value={data.xp.toLocaleString()}
          subtitle={`Next level: ${data.nextLevelXp.toLocaleString()} XP`}
          icon={BarChart3}
          loading={false}
        />
      </div>

      {/* Activity Heatmap */}
      <ActivityHeatmap data={data.heatmapData} />

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="Messages Trend"
          data={periodData.messages}
          dataKey="value"
          color="#5865F2"
          period={period}
        />
        <TrendChart
          title="Voice Activity Trend"
          data={periodData.voice}
          dataKey="value"
          color="#57F287"
          period={period}
        />
      </div>
      
      {/* Insights Dashboard */}
      {data && (
        <div className="mt-8">
          <InsightsDashboard
            userId={data.userId}
            currentLevel={data.level}
            currentXp={data.xp}
            nextLevelXp={data.nextLevelXp}
          />
        </div>
      )}
    </div>
  );
}

