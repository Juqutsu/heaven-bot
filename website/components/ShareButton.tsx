'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Download, Twitter, Facebook } from 'lucide-react';

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  onExport?: () => void;
}

export function ShareButton({ url, title, description, imageUrl, onExport }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out my Heaven Bot profile!';
  const shareDescription = description || 'View my stats and achievements';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[#2f3136] rounded-lg border border-[#40444b] shadow-lg shadow-black/20 z-20">
            <div className="p-2 space-y-1">
              {navigator.share && (
                <button
                  onClick={handleShare}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-[#40444b] rounded transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via...</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-[#40444b] rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              {onExport && (
                <button
                  onClick={onExport}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-[#40444b] rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Image</span>
                </button>
              )}
              <div className="border-t border-[#40444b] my-1" />
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-[#40444b] rounded transition-colors"
              >
                <Twitter className="w-4 h-4" />
                <span>Share on Twitter</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-[#40444b] rounded transition-colors"
              >
                <Facebook className="w-4 h-4" />
                <span>Share on Facebook</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

