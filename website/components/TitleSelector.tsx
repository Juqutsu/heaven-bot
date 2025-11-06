'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Crown, Check, Loader2 } from 'lucide-react';

interface Title {
  id: string;
  name: string;
  description: string | null;
  category: string;
  color: string | null;
  unlockedAt: number;
  source: string | null;
}

interface TitleSelectorProps {
  userId: string;
}

export function TitleSelector({ userId }: TitleSelectorProps) {
  const { data: session } = useSession();
  const [titles, setTitles] = useState<Title[]>([]);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTitles() {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/${userId}/titles`);
        const result = await response.json();

        if (result.success && result.data) {
          setTitles(result.data.titles || []);
          setActiveTitle(result.data.activeTitle?.id || null);
        }
      } catch (error) {
        console.error('Error fetching titles:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchTitles();
    }
  }, [userId]);

  const handleSetActive = async (titleId: string) => {
    if (!session?.user?.id || session.user.id !== userId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/user/${userId}/titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titleId }),
      });

      const result = await response.json();

      if (result.success) {
        setActiveTitle(titleId);
      }
    } catch (error) {
      console.error('Error setting active title:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-16 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  if (titles.length === 0) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2 mb-4">
          <Crown className="w-5 h-5 text-[#5865F2]" />
          <h3 className="text-lg font-semibold text-white">Titles</h3>
        </div>
        <p className="text-gray-400">No titles unlocked yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-4">
        <Crown className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">
          Titles ({titles.length})
        </h3>
      </div>
      <div className="space-y-2">
        {titles.map((title) => (
          <button
            key={title.id}
            onClick={() => handleSetActive(title.id)}
            disabled={saving || activeTitle === title.id}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
              activeTitle === title.id
                ? 'bg-[#5865F2]/20 border-[#5865F2]'
                : 'bg-[#40444b] border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Crown
                className={`w-5 h-5 ${
                  activeTitle === title.id ? 'text-[#5865F2]' : 'text-gray-400'
                }`}
              />
              <div className="text-left">
                <div
                  className="font-medium"
                  style={{ color: title.color || '#ffffff' }}
                >
                  {title.name}
                </div>
                {title.description && (
                  <div className="text-xs text-gray-400">{title.description}</div>
                )}
              </div>
            </div>
            {activeTitle === title.id && (
              <Check className="w-5 h-5 text-[#5865F2]" />
            )}
          </button>
        ))}
      </div>
      {saving && (
        <div className="flex items-center justify-center mt-4">
          <Loader2 className="w-4 h-4 text-[#5865F2] animate-spin" />
          <span className="text-sm text-gray-400 ml-2">Saving...</span>
        </div>
      )}
    </div>
  );
}

