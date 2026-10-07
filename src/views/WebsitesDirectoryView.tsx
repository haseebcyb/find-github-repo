import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  ArrowUpRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CATEGORIES, DIRECTORY_ENTRIES } from '../data/directoryData';
import { RepositoryCard, formatCompactNumber } from '../components/RepositoryCard';
import { WebsiteThumbnail } from '../components/WebsiteThumbnail';

interface WebsitesDirectoryViewProps {
  onSelectWebsite: (slug: string) => void;
  onSelectCategory: (categorySlug: string) => void;
  onAnalyzeUrl: (url: string) => void;
}

const PAGE_SIZE = 12;

export const WebsitesDirectoryView: React.FC<WebsitesDirectoryViewProps> = ({
  onSelectWebsite,
  onSelectCategory,
  onAnalyzeUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'stars' | 'domain' | 'updated' | 'forks'>(
    'stars'
  );
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);

  const languages = useMemo(() => {
    const s = new Set<string>();
    DIRECTORY_ENTRIES.forEach((e) => s.add(e.language));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DIRECTORY_ENTRIES.filter((entry) => {
      if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) {
        return false;
      }
      if (languageFilter !== 'ALL' && entry.language !== languageFilter) {
        return false;
      }
      if (q) {
        const hay = `${entry.websiteName} ${entry.domain} ${entry.repoFullName} ${entry.description} ${entry.primaryTechnology} ${entry.language}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'domain') return a.domain.localeCompare(b.domain);
      if (sortBy === 'forks') return b.forks - a.forks;
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return b.stars - a.stars;
    });
  }, [searchQuery, categoryFilter, languageFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleFilterChange = (fn: () => void) => {
    fn();
    setCurrentPage(1);
  };

  return (
    <div className="py-8 space-y-6">
      {/* Bold Editorial Directory Header Banner with Visual Showcase */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-slate-950 rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B0000] mb-1.5">
                Complete Website &amp; Repository Database
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
                Websites Directory
              </h1>
              <p className="text-sm sm:text-base font-semibold text-slate-800 max-w-2xl">
                Index of production websites with verified public GitHub repositories,
                complete with technology stacks, programming languages, star counts, and
                source links.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="inline-flex p-1 bg-slate-100 border-2 border-slate-900 rounded-sm text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3.5 py-1.5 rounded-xs inline-flex items-center gap-1.5 font-bold cursor-pointer ${
                    viewMode === 'table'
                      ? 'btn-obsidian text-white'
                      : 'text-slate-900 hover:text-[#8B0000]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Directory Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3.5 py-1.5 rounded-xs inline-flex items-center gap-1.5 font-bold cursor-pointer ${
                    viewMode === 'grid'
                      ? 'btn-crimson text-white'
                      : 'text-slate-900 hover:text-blue-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Preview Cards</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-950 relative min-h-[170px] border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 overflow-hidden">
            <img
              src="/src/assets/images/directory_archive_showcase_1791382431169.jpg"
              alt="Websites Directory Ledger Showcase"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-xs font-mono text-white">
              <div className="text-red-400 font-bold">MASTER LEDGER</div>
              <div className="text-white font-bold">
                Verified Domains &amp; Public Git Links
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-white border-2 border-slate-900 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md flex items-center bg-white border-2 border-slate-900 rounded-sm focus-within:border-blue-800">
            <Search className="w-4 h-4 ml-3 text-[#8B0000] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                handleFilterChange(() => setSearchQuery(e.target.value))
              }
              placeholder="Filter websites by name, URL, owner, or repo..."
              aria-label="Filter websites"
              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              handleFilterChange(() => setCategoryFilter(e.target.value))
            }
            aria-label="Filter by category"
            className="px-3 py-2 text-xs font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) =>
              handleFilterChange(() => setLanguageFilter(e.target.value))
            }
            aria-label="Filter by language"
            className="px-3 py-2 text-xs font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
          >
            <option value="ALL">All Languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="font-mono font-bold text-slate-950">
            Showing {(safePage - 1) * PAGE_SIZE + (filtered.length > 0 ? 1 : 0)}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
            entries
          </span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort directory"
            className="px-2.5 py-2 text-xs font-mono font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
          >
            <option value="stars">Sort: Stars (High → Low)</option>
            <option value="domain">Sort: Domain (A → Z)</option>
            <option value="updated">Sort: Recently Updated</option>
            <option value="forks">Sort: Most Forks</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 border-2 border-slate-900 rounded-sm">
          <h2 className="text-xl font-display font-extrabold text-slate-950 mb-1">
            No matching websites in directory
          </h2>
          <p className="text-xs font-semibold text-slate-700 max-w-md mx-auto mb-4">
            We couldn&apos;t find any indexed website matching &ldquo;{searchQuery}
            &rdquo;. You can run a live analysis on any domain to inspect its public
            GitHub repositories.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setLanguageFilter('ALL');
              }}
              className="btn-outline-editorial px-4 py-2 text-xs font-bold rounded-sm cursor-pointer"
            >
              <span>Clear Directory Filters</span>
            </button>
            {searchQuery.includes('.') && (
              <button
                type="button"
                onClick={() => onAnalyzeUrl(searchQuery)}
                className="btn-crimson px-4 py-2 text-xs font-bold rounded-sm text-white cursor-pointer"
              >
                <span>Live Analyze &ldquo;{searchQuery}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map((entry) => (
            <RepositoryCard
              key={entry.id}
              entry={entry}
              onSelectWebsite={onSelectWebsite}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      ) : (
        /* High-Density Technical Directory Table with Thumbnails */
        <div className="border-2 border-slate-900 rounded-sm bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-white border-b-2 border-slate-900 font-mono">
                <th className="py-3.5 px-4 font-bold text-white">Website &amp; Preview</th>
                <th className="py-3.5 px-3 font-bold text-white">GitHub Repository</th>
                <th className="py-3.5 px-3 font-bold text-white">Stack / Language</th>
                <th className="py-3.5 px-3 font-bold text-white">Category</th>
                <th className="py-3.5 px-3 font-bold text-right text-white">Stars / Forks</th>
                <th className="py-3.5 px-3 font-bold text-white">Updated</th>
                <th className="py-3.5 px-4 font-bold text-right text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 align-top">
                  {/* Website Thumbnail + Name + URL */}
                  <td className="py-3.5 px-4 min-w-[260px]">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectWebsite(entry.slug)}
                        className="w-28 shrink-0 border-2 border-slate-900 rounded-xs overflow-hidden cursor-pointer"
                      >
                        <WebsiteThumbnail
                          domain={entry.domain}
                          websiteName={entry.websiteName}
                          repoOwner={entry.repoOwner}
                          repoName={entry.repoName}
                          className="border-b-0"
                        />
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectWebsite(entry.slug)}
                          className="font-display font-extrabold text-base text-slate-950 hover:text-blue-800 text-left cursor-pointer block"
                        >
                          {entry.websiteName}
                        </button>
                        <a
                          href={entry.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-xs text-blue-800 hover:text-[#8B0000] inline-flex items-center gap-0.5 mt-0.5"
                        >
                          <span>{entry.domain}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                        <p className="text-slate-800 font-semibold line-clamp-2 mt-1 max-w-xs leading-snug">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* GitHub Repository & Owner */}
                  <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                    <a
                      href={entry.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-800 hover:text-[#8B0000] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{entry.repoFullName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="text-slate-700 font-semibold mt-0.5">
                      Owner: {entry.repoOwner}
                    </div>
                    <div className="text-[#8B0000] font-bold text-[11px] mt-0.5">
                      {entry.confidence}% verified
                    </div>
                  </td>

                  {/* Primary Technology & Language */}
                  <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                    <div className="font-bold text-slate-950">
                      {entry.primaryTechnology}
                    </div>
                    <div className="text-blue-800 font-semibold mt-0.5">
                      {entry.language}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectCategory(entry.category)}
                      className="font-mono font-bold text-slate-900 hover:text-[#8B0000] hover:underline cursor-pointer"
                    >
                      {entry.categoryLabel}
                    </button>
                  </td>

                  {/* Stars & Forks */}
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="font-bold text-slate-950">
                      <span className="text-[#8B0000]">★</span>{' '}
                      {formatCompactNumber(entry.stars)}
                    </div>
                    <div className="text-blue-800 font-semibold mt-0.5">
                      ⑂ {formatCompactNumber(entry.forks)}
                    </div>
                  </td>

                  {/* Last Updated */}
                  <td className="py-3.5 px-3 font-mono font-bold tabular-nums text-slate-800 whitespace-nowrap">
                    {entry.updatedAt}
                  </td>

                  {/* Direct Action Buttons with White Text */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-1.5 font-bold">
                      <button
                        type="button"
                        onClick={() => onSelectWebsite(entry.slug)}
                        className="btn-royal px-2.5 py-1 rounded-xs text-[11px] text-white cursor-pointer"
                      >
                        <span>Inspect →</span>
                      </button>
                      <a
                        href={entry.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-obsidian px-2.5 py-1 rounded-xs text-[11px] text-white font-mono"
                      >
                        <span>GitHub ↗</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t-2 border-slate-900 text-xs font-mono font-bold">
          <div className="text-slate-900">
            Page {safePage} of {totalPages} ({filtered.length} total websites)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="btn-outline-editorial px-3 py-1.5 rounded-sm disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 rounded-sm cursor-pointer ${
                  pageNum === safePage
                    ? 'btn-crimson text-white font-bold'
                    : 'btn-outline-editorial'
                }`}
              >
                <span>{pageNum}</span>
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="btn-outline-editorial px-3 py-1.5 rounded-sm disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
