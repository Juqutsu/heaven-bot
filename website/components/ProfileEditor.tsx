'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Image, Palette, Save, Loader2 } from 'lucide-react';

interface ProfileData {
  bio: string | null;
  bannerUrl: string | null;
  colorScheme: string | null;
  displayPreferences: Record<string, boolean>;
}

interface ProfileEditorProps {
  userId: string;
}

export function ProfileEditor({ userId }: ProfileEditorProps) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData>({
    bio: null,
    bannerUrl: null,
    colorScheme: null,
    displayPreferences: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/${userId}/profile`);
        const result = await response.json();

        if (result.success && result.data) {
          setProfile(result.data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const handleSave = async () => {
    if (!session?.user?.id || session.user.id !== userId) return;

    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch(`/api/user/${userId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-6">
        <User className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">Profile Customization</h3>
      </div>

      <div className="space-y-6">
        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bio / Description
          </label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            maxLength={500}
            rows={4}
            className="w-full px-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2] resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {(profile.bio || '').length}/500 characters
          </p>
        </div>

        {/* Banner URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Image className="w-4 h-4 inline mr-2" />
            Banner Image URL
          </label>
          <input
            type="url"
            value={profile.bannerUrl || ''}
            onChange={(e) => setProfile({ ...profile, bannerUrl: e.target.value })}
            placeholder="https://example.com/banner.jpg"
            className="w-full px-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
          />
          {profile.bannerUrl && (
            <div className="mt-2">
              <img
                src={profile.bannerUrl}
                alt="Banner preview"
                className="w-full h-32 object-cover rounded-lg border border-[#36393f]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Palette className="w-4 h-4 inline mr-2" />
            Color Scheme
          </label>
          <input
            type="color"
            value={profile.colorScheme || '#5865F2'}
            onChange={(e) => setProfile({ ...profile, colorScheme: e.target.value })}
            className="w-full h-12 bg-[#40444b] border border-[#36393f] rounded-lg cursor-pointer"
          />
        </div>

        {/* Display Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Display Preferences
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.displayPreferences?.showStats ?? true}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    displayPreferences: {
                      ...profile.displayPreferences,
                      showStats: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-[#5865F2] bg-[#40444b] border-[#36393f] rounded focus:ring-[#5865F2]"
              />
              <span className="text-white">Show Statistics</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.displayPreferences?.showAchievements ?? true}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    displayPreferences: {
                      ...profile.displayPreferences,
                      showAchievements: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-[#5865F2] bg-[#40444b] border-[#36393f] rounded focus:ring-[#5865F2]"
              />
              <span className="text-white">Show Achievements</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.displayPreferences?.showRankCard ?? true}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    displayPreferences: {
                      ...profile.displayPreferences,
                      showRankCard: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-[#5865F2] bg-[#40444b] border-[#36393f] rounded focus:ring-[#5865F2]"
              />
              <span className="text-white">Show Rank Card</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !session?.user?.id || session.user.id !== userId}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saved ? (
            <>
              <Save className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

