import React, { useState } from 'react';

interface WebsiteThumbnailProps {
  domain: string;
  websiteName: string;
  repoOwner?: string;
  repoName?: string;
  primaryTechnology?: string;
  language?: string;
  customImageUrl?: string | null;
  className?: string;
}

/**
 * Renders an authentic GitHub repository OpenGraph social preview card or official OG image
 * with lazy loading, skeleton state, and a structured technical wireframe fallback.
 */
export const WebsiteThumbnail: React.FC<WebsiteThumbnailProps> = ({
  domain,
  websiteName,
  repoOwner,
  repoName,
  primaryTechnology,
  language,
  customImageUrl,
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use official GitHub OpenGraph preview image when repoOwner & repoName are available
  const previewSrc =
    customImageUrl ||
    (repoOwner && repoName
      ? `https://opengraph.githubassets.com/1/${encodeURIComponent(
          repoOwner
        )}/${encodeURIComponent(repoName)}`
      : null);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 border-b border-slate-200 aspect-[16/9] select-none ${className}`}
    >
      {/* Top browser / terminal bar framing */}
      <div className="h-6 px-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
          <span className="ml-1 truncate font-medium text-slate-700">{domain}</span>
        </div>
        {repoOwner && repoName && (
          <span className="text-[10px] text-slate-500 truncate ml-2">
            {repoOwner}/{repoName}
          </span>
        )}
      </div>

      {/* Main viewport area */}
      <div className="relative w-full h-[calc(100%-1.5rem)] bg-slate-50">
        {/* Skeleton while loading */}
        {previewSrc && !imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse flex flex-col justify-between p-4">
            <div className="space-y-2">
              <div className="h-3.5 w-1/2 bg-slate-200 rounded-xs" />
              <div className="h-2.5 w-3/4 bg-slate-200 rounded-xs" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/70">
              <div className="h-2.5 w-20 bg-slate-200 rounded-xs" />
              <div className="h-2.5 w-12 bg-slate-200 rounded-xs" />
            </div>
          </div>
        )}

        {/* Authentic GitHub / Website OpenGraph Preview Image */}
        {previewSrc && !imageError && (
          <img
            src={previewSrc}
            alt={`${websiteName} (${domain}) — public GitHub repository ${
              repoOwner && repoName ? `${repoOwner}/${repoName}` : 'preview'
            }`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover object-center transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Resilient Technical Preview Fallback if offline or no OG image */}
        {(!previewSrc || imageError) && (
          <div className="w-full h-full p-4 flex flex-col justify-between bg-[#F8FAFC] text-slate-900">
            <div>
              <div className="text-[11px] font-mono text-blue-700 mb-1">
                https://{domain}
              </div>
              <div className="text-base font-semibold tracking-tight text-slate-900 line-clamp-1">
                {websiteName}
              </div>
              {repoOwner && repoName && (
                <div className="text-xs font-mono text-slate-600 mt-1">
                  github.com/{repoOwner}/{repoName}
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>{primaryTechnology || language || 'Public Source'}</span>
              <span>{language || 'Git'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
