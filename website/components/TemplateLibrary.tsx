'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TemplateCard } from './TemplateCard';
import { Palette, Search, Loader2, Save } from 'lucide-react';
import { RankCardSettings } from '@/lib/rankCardDefaults';

interface Template {
  templateId: string;
  name: string;
  description: string | null;
  settings: RankCardSettings | null;
  createdBy: {
    userId: string;
    xp: number;
    level: number;
    prestige: number;
  } | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
}

interface TemplateLibraryProps {
  currentSettings?: RankCardSettings;
  onApply?: (settings: RankCardSettings) => void;
}

export function TemplateLibrary({ currentSettings, onApply }: TemplateLibraryProps) {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');
        const result = await response.json();

        if (result.success) {
          setTemplates(result.data);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  const handleApply = async (template: Template) => {
    if (!template.settings || !onApply) return;

    try {
      // Increment usage count
      await fetch(`/api/templates/${template.templateId}`, {
        method: 'POST',
      });

      // Apply template settings
      onApply(template.settings);
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id || !currentSettings) return;

    const name = prompt('Enter template name:');
    if (!name) return;

    const description = prompt('Enter template description (optional):') || null;
    const isPublic = confirm('Make this template public?');

    setSaving(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          settings: currentSettings,
          isPublic,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh templates
        const templatesRes = await fetch('/api/templates');
        const templatesData = await templatesRes.json();

        if (templatesData.success) {
          setTemplates(templatesData.data);
        }
        alert('Template saved successfully!');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-32 bg-[#40444b] rounded" />
          <div className="h-32 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Palette className="w-6 h-6 text-[#5865F2]" />
          <h3 className="text-xl font-bold text-white">Template Library</h3>
        </div>
        {session?.user?.id && currentSettings && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Current</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          {searchQuery ? 'No templates found matching your search' : 'No templates available yet'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.templateId}
              template={template}
              onApply={onApply ? () => handleApply(template) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

