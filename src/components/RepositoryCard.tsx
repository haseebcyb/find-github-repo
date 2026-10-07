import React from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { DirectoryEntry } from '../types';
import { WebsiteThumbnail } from './WebsiteThumbnail';

interface RepositoryCardProps {
  entry: DirectoryEntry;
  onSelectWebsite: (slug: string) => void;
  onSelectCategory?: (categorySlug: string) => void;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toLocaleString();
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  entry,
  onSelectWebsite,
  onSelectCategory,
}) => {
  return (
    <article className="group card-editorial rounded-sm flex flex-col justify-between overflow-hidden">
      <div>
        {/* Clickable Website / Repository Thumbnail */}
        <button
          type="button"
          onClick={() => onSelectWebsite(entry.slug)}
          className="w-full text-left block cursor-pointer focus:outline-none"
        >
          <WebsiteThumbnail
            domain={entry.domain}
            websiteName={entry.websiteName}
            repoOwner={entry.repoOwner}
            repoName={entry.repoName}
            primaryTechnology={entry.primaryTechnology}
            language={entry.language}
          />
        </button>

        {/* Card Body */}
        <div className="p-5">
          {/* Website Name & Dark-Red Confidence Label */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => onSelectWebsite(entry.slug)}
              className="text-lg font-display font-extrabold text-slate-950 group-hover:text-blue-800 transition-colors text-left truncate cursor-pointer"
            >
              {entry.websiteName}
            </button>
            <span className="text-xs font-mono tabular-nums text-[#8B0000] font-bold shrink-0">
              {entry.confidence}% MATCH
            </span>
          </div>

          {/* Monospace Repo Path */}
          <div className="text-xs font-mono font-semibold text-blue-900 truncate mb-2.5">
            {entry.repoFullName} · {entry.domain}
          </div>

          {/* Short Description */}
          <p className="text-xs text-slate-800 font-semibold leading-relaxed line-clamp-2 mb-4 h-9">
            {entry.description}
          </p>

          {/* Unboxed Technology / Category Metadata Line */}
          <div className="text-xs font-mono flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-950">
              {entry.primaryTechnology}
            </span>
            <span aria-hidden="true" className="text-[#8B0000] font-bold">
              /
            </span>
            {onSelectCategory ? (
              <button
                type="button"
                onClick={() => onSelectCategory(entry.category)}
                className="text-blue-800 font-bold hover:text-[#8B0000] hover:underline cursor-pointer"
              >
                {entry.categoryLabel}
              </button>
            ) : (
              <span className="text-blue-800 font-bold">{entry.categoryLabel}</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Stats + Direct Buttons with White Text */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-3">
        {/* ★ Stars · ⑂ Forks · Language */}
        <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-900 font-bold">
          <div className="flex items-center gap-3">
            <span title={`${entry.stars.toLocaleString()} GitHub Stars`}>
              <span className="text-[#8B0000]">★</span> {formatCompactNumber(entry.stars)} Stars
            </span>
            <span title={`${entry.forks.toLocaleString()} GitHub Forks`}>
              <span className="text-blue-800">⑂</span> {formatCompactNumber(entry.forks)} Forks
            </span>
          </div>
          <span className="text-slate-950 font-bold">{entry.language}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200 text-xs">
          <a
            href={entry.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-obsidian px-3 py-1.5 rounded-xs inline-flex items-center gap-1 font-bold text-white whitespace-nowrap"
          >
            <span>GitHub Repo</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectWebsite(entry.slug)}
              className="btn-outline-editorial px-2.5 py-1.5 rounded-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <span>Inspect</span>
            </button>
            <a
              href={entry.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-royal px-3 py-1.5 rounded-xs inline-flex items-center gap-0.5 font-bold text-white whitespace-nowrap"
            >
              <span>Website</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
