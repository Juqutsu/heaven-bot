'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Target, TrendingUp, Clock, Award } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface PredictionsData {
  estimatedTimeToNextLevel: number | null; // in days
  xpGainRate: number; // XP per day
  projectedLevel: number | null; // Level in 30 days
  projectedXp: number | null; // XP in 30 days
  milestones: Array<{
    level: number;
    estimatedDate: string;
    xpRequired: number;
  }>;
  recommendations: string[];
}

interface PredictionsPanelProps {
  userId: string;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
}

export function PredictionsPanel({ userId, currentLevel, currentXp, nextLevelXp }: PredictionsPanelProps) {
  const { data: session } = useSession();
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/${userId}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Calculate predictions based on historical data
          const stats = result.data.statistics;
          
          // Calculate average daily XP gain from last 7 days
          const dailyMessages = stats.messages.daily.slice(-7);
          const dailyVoice = stats.voice.daily.slice(-7);
          
          // Estimate XP gain (simplified - would need actual XP gain data)
          const avgDailyMessages = dailyMessages.length > 0
            ? dailyMessages.reduce((sum: number, d: any) => sum + d.value, 0) / dailyMessages.length
            : 0;
          
          const avgDailyVoice = dailyVoice.length > 0
            ? dailyVoice.reduce((sum: number, d: any) => sum + d.value, 0) / dailyVoice.length
            : 0;
          
          // Estimate XP per message/voice minute (simplified)
          const estimatedXpPerMessage = 15; // Base XP per message
          const estimatedXpPerVoiceMinute = 10; // Base XP per voice minute
          
          const xpGainRate = (avgDailyMessages * estimatedXpPerMessage) + (avgDailyVoice * estimatedXpPerVoiceMinute);
          
          // Calculate time to next level
          const xpNeeded = nextLevelXp - currentXp;
          const estimatedTimeToNextLevel = xpGainRate > 0 ? Math.ceil(xpNeeded / xpGainRate) : null;
          
          // Project level in 30 days
          const xpIn30Days = xpGainRate * 30;
          const projectedXp = currentXp + xpIn30Days;
          
          // Calculate projected level (simplified - would need actual level formula)
          const calculateLevel = (xp: number) => {
            const baseXp = 100;
            const exponent = 1.5;
            let level = 1;
            let totalXp = 0;
            while (totalXp < xp) {
              level++;
              totalXp += Math.floor(baseXp * Math.pow(level, exponent));
            }
            return level - 1;
          };
          
          const projectedLevel = calculateLevel(projectedXp);
          
          // Calculate milestones (next 5 levels)
          const milestones = [];
          for (let i = 1; i <= 5; i++) {
            const targetLevel = currentLevel + i;
            const targetXp = calculateLevelXp(targetLevel);
            const xpNeededForMilestone = targetXp - currentXp;
            const daysToMilestone = xpGainRate > 0 ? Math.ceil(xpNeededForMilestone / xpGainRate) : null;
            
            if (daysToMilestone !== null && daysToMilestone > 0) {
              const milestoneDate = new Date();
              milestoneDate.setDate(milestoneDate.getDate() + daysToMilestone);
              
              milestones.push({
                level: targetLevel,
                estimatedDate: milestoneDate.toISOString().split('T')[0],
                xpRequired: xpNeededForMilestone,
              });
            }
          }
          
          // Generate recommendations
          const recommendations: string[] = [];
          if (xpGainRate < 100) {
            recommendations.push('Try to be more active to increase your XP gain rate');
          }
          if (avgDailyMessages < 10) {
            recommendations.push('Send more messages to earn more XP');
          }
          if (avgDailyVoice < 30) {
            recommendations.push('Join voice channels to earn voice XP');
          }
          if (recommendations.length === 0) {
            recommendations.push('Keep up the great activity!');
          }
          
          setPredictions({
            estimatedTimeToNextLevel,
            xpGainRate: Math.round(xpGainRate),
            projectedLevel,
            projectedXp: Math.round(projectedXp),
            milestones,
            recommendations,
          });
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchPredictions();
    }
  }, [userId, currentLevel, currentXp, nextLevelXp]);

  const calculateLevelXp = (level: number) => {
    if (level < 1) return 0;
    const baseXp = 100;
    const exponent = 1.5;
    let totalXp = 0;
    for (let i = 1; i < level; i++) {
      totalXp += Math.floor(baseXp * Math.pow(i, exponent));
    }
    return totalXp;
  };

  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  if (!predictions) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
        <p className="text-gray-400">Insufficient data for predictions</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-6">
        <Target className="w-6 h-6 text-[#5865F2]" />
        <h3 className="text-xl font-bold text-white">Predictions & Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Time to Next Level */}
        <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-[#5865F2]" />
            <span className="text-sm text-gray-300">Time to Next Level</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {predictions.estimatedTimeToNextLevel !== null
              ? `${predictions.estimatedTimeToNextLevel} days`
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Based on current activity
          </div>
        </div>

        {/* XP Gain Rate */}
        <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#5865F2]" />
            <span className="text-sm text-gray-300">Daily XP Gain Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(predictions.xpGainRate)} XP/day
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Average from last 7 days
          </div>
        </div>

        {/* Projected Level */}
        {predictions.projectedLevel !== null && (
          <div className="bg-[#40444b] rounded-lg p-4 border border-[#36393f]">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-[#5865F2]" />
              <span className="text-sm text-gray-300">Projected Level (30 days)</span>
            </div>
            <div className="text-2xl font-bold text-white">
              Level {predictions.projectedLevel}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatNumber(predictions.projectedXp || 0)} XP
            </div>
          </div>
        )}
      </div>

      {/* Milestones */}
      {predictions.milestones.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Upcoming Milestones</h4>
          <div className="space-y-2">
            {predictions.milestones.map((milestone) => (
              <div
                key={milestone.level}
                className="flex items-center justify-between p-3 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] transition-colors"
              >
                <div>
                  <div className="text-white font-medium">Level {milestone.level}</div>
                  <div className="text-xs text-gray-400">
                    {formatNumber(milestone.xpRequired)} XP needed
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">
                    {new Date(milestone.estimatedDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">Estimated</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {predictions.recommendations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">Recommendations</h4>
          <div className="space-y-2">
            {predictions.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="p-3 bg-[#40444b] rounded-lg border border-[#36393f] text-gray-300"
              >
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

