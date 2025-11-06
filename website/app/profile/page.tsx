'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserProfile } from '@/components/UserProfile';
import { RankCardPreview } from '@/components/RankCardPreview';
import { ShareButton } from '@/components/ShareButton';
import { ThemeSelector } from '@/components/ThemeSelector';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { TitleSelector } from '@/components/TitleSelector';
import { ProfileEditor } from '@/components/ProfileEditor';
import { formatNumber } from '@/lib/utils';
import { User, Palette, ArrowRight } from 'lucide-react';

interface UserProfileData {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  prestigeName: string | null;
  coins: number;
  reputation: number;
  totalTextXp: number;
  totalVoiceXp: number;
  nextLevelXp: number;
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

interface RankCardSettings {
  primaryColor: string | null;
  backgroundColor: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [rankCardSettings, setRankCardSettings] = useState<RankCardSettings>({
    primaryColor: null,
    backgroundColor: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user?.id) {
      async function fetchProfile() {
        try {
          setLoading(true);
          const [profileRes, rankCardRes] = await Promise.all([
            fetch(`/api/user/${session.user.id}`),
            fetch(`/api/user/${session.user.id}/rank-card`),
          ]);

          const profileDataRes = await profileRes.json();
          const rankCardData = await rankCardRes.json();

          if (profileDataRes.success) {
            setProfileData(profileDataRes.data);
          } else {
            setError(profileDataRes.error || 'Failed to load profile');
          }

          if (rankCardData.success) {
            setRankCardSettings(rankCardData.data);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          setError('Failed to load profile');
        } finally {
          setLoading(false);
        }
      }

      fetchProfile();
    }
  }, [session, status, router]);

  const calculateProgress = () => {
    if (!profileData) return 0;
    const currentLevelXp = profileData.level === 1 ? 0 : Math.floor(profileData.level * 100);
    const xpForThisLevel = profileData.xp - currentLevelXp;
    const xpNeededForNextLevel = profileData.nextLevelXp - currentLevelXp;
    return xpNeededForNextLevel > 0 ? (xpForThisLevel / xpNeededForNextLevel) * 100 : 0;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2f3136] rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
          <div className="space-y-4">
            <div className="h-24 bg-[#40444b] rounded" />
            <div className="h-24 bg-[#40444b] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400">Your profile data could not be found in the database.</p>
        </div>
      </div>
    );
  }

  const primaryColor = rankCardSettings.primaryColor || '#5865F2';
  const backgroundColor = rankCardSettings.backgroundColor || '#1F2937';
  const progressPercent = Math.max(0, Math.min(100, calculateProgress()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <User className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Your Profile</h1>
        </div>
        <p className="text-gray-400">
          Welcome back, {session?.user?.name || 'User'}!
        </p>
      </div>

      {/* Rank Card Preview Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Palette className="w-6 h-6 text-[#5865F2]" />
            <span>Rank Card</span>
          </h2>
          <div className="flex items-center space-x-2">
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : ''}
              title={`Check out my Heaven Bot profile!`}
              description={`Level ${profileData.level} • ${formatNumber(profileData.xp)} XP`}
            />
            <Link
              href="/designer"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40"
            >
              <span>Customize</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <RankCardPreview
          username={session?.user?.name || 'User'}
          level={profileData.level}
          xp={profileData.xp}
          nextLevelXp={profileData.nextLevelXp}
          prestige={profileData.prestige}
          prestigeName={profileData.prestigeName}
          primaryColor={primaryColor}
          backgroundColor={backgroundColor}
          progressPercent={progressPercent}
          avatarUrl={session?.user?.image || null}
          orientation="horizontal"
        />
      </div>

      <UserProfile data={profileData} loading={loading} />

      {/* Badges and Titles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <BadgeDisplay badges={profileData.achievements} />
        {session?.user?.id && (
          <TitleSelector userId={session.user.id} />
        )}
      </div>

      {/* Profile Customization */}
      {session?.user?.id && (
        <div className="mt-8">
          <ProfileEditor userId={session.user.id} />
        </div>
      )}

      {/* Theme Selector */}
      <div className="mt-8">
        <ThemeSelector />
      </div>
    </div>
  );
}
