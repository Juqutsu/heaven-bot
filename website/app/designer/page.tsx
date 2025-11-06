'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdvancedRankCardPreview } from '@/components/AdvancedRankCardPreview';
import { DesignerPanel } from '@/components/DesignerPanel';
import { Save, RotateCcw, Palette, Loader2, Download, Copy } from 'lucide-react';
import { ShareButton } from '@/components/ShareButton';
import { TemplateLibrary } from '@/components/TemplateLibrary';
import { DEFAULT_RANK_CARD_SETTINGS, RankCardSettings } from '@/lib/rankCardDefaults';

export default function DesignerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RankCardSettings>(DEFAULT_RANK_CARD_SETTINGS);
  const [userData, setUserData] = useState<{
    level: number;
    xp: number;
    nextLevelXp: number;
    prestige: number;
    prestigeName: string | null;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session && session.user && session.user.id) {
      async function fetchData() {
        try {
          setLoading(true);
          const userId = session!.user!.id!;
          const [settingsRes, userRes] = await Promise.all([
            fetch(`/api/user/${userId}/rank-card`),
            fetch(`/api/user/${userId}`),
          ]);

          const settingsData = await settingsRes.json();
          const userDataRes = await userRes.json();

          if (settingsData.success) {
            setSettings(settingsData.data);
          }

          if (userDataRes.success && userDataRes.data) {
            setUserData({
              level: userDataRes.data.level,
              xp: userDataRes.data.xp,
              nextLevelXp: userDataRes.data.nextLevelXp,
              prestige: userDataRes.data.prestige,
              prestigeName: userDataRes.data.prestigeName,
            });
          }
        } catch (err) {
          console.error('Error fetching data:', err);
          setError('Failed to load data');
        } finally {
          setLoading(false);
        }
      }

      fetchData();
    }
  }, [session, status, router]);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const response = await fetch(`/api/user/${session.user.id}/rank-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_RANK_CARD_SETTINGS);
  };

  const handleExport = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rank-card-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Error exporting image:', err);
    }
  };

  const handleCopySettings = () => {
    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
    alert('Settings copied to clipboard!');
  };


  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[#5865F2] animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (!userData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b]">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-400">Failed to load user data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Advanced Rank Card Designer</h1>
        </div>
        <p className="text-gray-400">Customize every aspect of your rank card with full control</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400">
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Preview */}
        <div>
            <AdvancedRankCardPreview
              username={session && session.user ? session.user.name || 'User' : 'User'}
              level={userData.level}
              xp={userData.xp}
              nextLevelXp={userData.nextLevelXp}
              prestige={userData.prestige}
              prestigeName={userData.prestigeName}
              settings={settings}
              avatarUrl={session && session.user ? session.user.image || null : null}
            />
          
          {/* Export Actions */}
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Image</span>
            </button>
            <button
              onClick={handleCopySettings}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
              title="Copy settings to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : ''}
              title={`Check out my custom rank card!`}
              description="I customized my rank card on Heaven Bot"
              onExport={handleExport}
            />
          </div>
        </div>

        {/* Controls */}
        <DesignerPanel
          settings={settings}
          onChange={(updates) => setSettings({ ...settings, ...updates })}
          onReset={handleReset}
        />
      </div>

      {/* Template Library */}
      <div className="mt-8">
        <TemplateLibrary
          currentSettings={settings}
          onApply={(templateSettings) => setSettings(templateSettings)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
