'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PredictionsPanel } from './PredictionsPanel';
import { BarChart3, Calendar, Target, TrendingUp, Award, Flame } from 'lucide-react';
import { formatNumber, formatMinutes } from '@/lib/utils';

interface InsightsData {
  weeklySummary: {
    messages: number;
    voice: number;
    xpGained: number;
    levelUps: number;
  };
  monthlySummary: {
    messages: number;
    voice: number;
    xpGained: number;
    levelUps: number;
  };
  streak: {
    current: number;
    longest: number;
    lastActivity: string | null;
  } | null;
  milestones: Array<{
    type: string;
    name: string;
    achieved: boolean;
    progress: number;
    target: number;
  }>;
}

interface InsightsDashboardProps {
  userId: string;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
}

export function InsightsDashboard({ userId, currentLevel, currentXp, nextLevelXp }: InsightsDashboardProps) {
  const { data: session } = useSession();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/${userId}`);
        const result = await response.json();

        if (result.success && result.data) {
          const stats = result.data.statistics || {
            messages: { daily: [], weekly: [], monthly: [], total: 0 },
            voice: { daily: [], weekly: [], monthly: [], totalMinutes: 0 },
            commands: { daily: [], weekly: [], monthly: [], total: 0 },
          };
          
          // Calculate weekly summary (last 7 days)
          const dailyMessages = (stats.messages?.daily || []).slice(-7);
          const dailyVoice = (stats.voice?.daily || []).slice(-7);
          
          const weeklyMessages = dailyMessages.reduce((sum: number, d: any) => sum + (d?.value || 0), 0);
          const weeklyVoice = dailyVoice.reduce((sum: number, d: any) => sum + (d?.value || 0), 0);
          
          // Calculate monthly summary (last 30 days)
          const monthlyMessages = (stats.messages?.monthly || []).slice(-1)[0]?.value || 0;
          const monthlyVoice = (stats.voice?.monthly || []).slice(-1)[0]?.value || 0;
          
          // Get total stats (need to fetch from separate endpoint or calculate)
          const totalMessages = stats.messages?.total || weeklyMessages;
          const totalVoiceMinutes = stats.voice?.totalMinutes || weeklyVoice;
          
          // Estimate XP gained (simplified)
          const estimatedXpPerMessage = 15;
          const estimatedXpPerVoiceMinute = 10;
          const weeklyXpGained = (weeklyMessages * estimatedXpPerMessage) + (weeklyVoice * estimatedXpPerVoiceMinute);
          const monthlyXpGained = (monthlyMessages * estimatedXpPerMessage) + (monthlyVoice * estimatedXpPerVoiceMinute);
          
          // Milestones (simplified examples)
          const milestones = [
            {
              type: 'level',
              name: `Reach Level ${currentLevel + 1}`,
              achieved: false,
              progress: currentXp || 0,
              target: nextLevelXp || 0,
            },
            {
              type: 'messages',
              name: 'Send 1000 messages',
              achieved: totalMessages >= 1000,
              progress: totalMessages,
              target: 1000,
            },
            {
              type: 'voice',
              name: 'Spend 100 hours in voice',
              achieved: totalVoiceMinutes >= 6000,
              progress: totalVoiceMinutes,
              target: 6000,
            },
          ];
          
          setInsights({
            weeklySummary: {
              messages: weeklyMessages,
              voice: weeklyVoice,
              xpGained: Math.round(weeklyXpGained),
              levelUps: 0, // Would need to track this
            },
            monthlySummary: {
              messages: monthlyMessages,
              voice: monthlyVoice,
              xpGained: Math.round(monthlyXpGained),
              levelUps: 0, // Would need to track this
            },
            streak: result.data.streak,
            milestones,
          });
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchInsights();
    }
  }, [userId, currentLevel, currentXp, nextLevelXp]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
          <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
          <div className="space-y-4">
            <div className="h-24 bg-[#40444b] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
        <p className="text-gray-400">No insights data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-[#5865F2]" />
          <h3 className="text-lg font-semibold text-white">Weekly Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="text-sm text-gray-300 mb-1">Messages</div>
            <div className="text-2xl font-bold text-white">{formatNumber(insights.weeklySummary.messages)}</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="text-sm text-gray-300 mb-1">Voice Time</div>
            <div className="text-2xl font-bold text-white">{formatMinutes(insights.weeklySummary.voice)}</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="text-sm text-gray-300 mb-1">XP Gained</div>
            <div className="text-2xl font-bold text-white">{formatNumber(insights.weeklySummary.xpGained)}</div>
          </div>
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="text-sm text-gray-300 mb-1">Level Ups</div>
            <div className="text-2xl font-bold text-white">{insights.weeklySummary.levelUps}</div>
          </div>
        </div>
      </div>

      {/* Streak */}
      {insights.streak && (
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
          <div className="flex items-center space-x-2 mb-4">
            <Flame className="w-5 h-5 text-[#5865F2]" />
            <h3 className="text-lg font-semibold text-white">Activity Streak</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
              <div className="text-sm text-gray-300 mb-1">Current Streak</div>
              <div className="text-2xl font-bold text-white">{insights.streak.current} days</div>
            </div>
            <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
              <div className="text-sm text-gray-300 mb-1">Longest Streak</div>
              <div className="text-2xl font-bold text-white">{insights.streak.longest} days</div>
            </div>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-5 h-5 text-[#5865F2]" />
          <h3 className="text-lg font-semibold text-white">Milestones</h3>
        </div>
        <div className="space-y-3">
          {insights.milestones.map((milestone, index) => {
            const progressPercent = milestone.target > 0 
              ? (milestone.progress / milestone.target) * 100 
              : 0;
            return (
              <div
                key={index}
                className="p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {milestone.achieved ? (
                      <Award className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Target className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`font-medium ${milestone.achieved ? 'text-yellow-400' : 'text-white'}`}>
                      {milestone.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {formatNumber(milestone.progress)} / {formatNumber(milestone.target)}
                  </span>
                </div>
                <div className="w-full bg-[#2f3136] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      milestone.achieved ? 'bg-yellow-400' : 'bg-[#5865F2]'
                    }`}
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Predictions */}
      <PredictionsPanel
        userId={userId}
        currentLevel={currentLevel}
        currentXp={currentXp}
        nextLevelXp={nextLevelXp}
      />
    </div>
  );
}

