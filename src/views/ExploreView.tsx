import React, { useState, useMemo } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { CATEGORIES, DIRECTORY_ENTRIES } from '../data/directoryData';
import { RepositoryCard } from '../components/RepositoryCard';
import { BUNDLED_SHOWCASE_IMAGES, FREE_SOURCE_FALLBACK_IMAGES } from '../imageAssets';

interface ExploreViewProps {
  onSelectWebsite: (slug: string) => void;
  onSelectCategory: (categorySlug: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onSelectWebsite,
  onSelectCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [subsetFilter, setSubsetFilter] = useState<'all' | 'popular' | 'trending'>('all');
  const [sortBy, setSortBy] = useState<'stars' | 'updated' | 'forks' | 'relevance'>(
    'stars'
  );

  const allLanguages = useMemo(() => {
    const s = new Set<string>();
    DIRECTORY_ENTRIES.forEach((e) => s.add(e.language));
    return Array.from(s).sort();
  }, []);

  const allTechnologies = useMemo(() => {
    const s = new Set<string>();
    DIRECTORY_ENTRIES.forEach((e) => s.add(e.primaryTechnology));
    return Array.from(s).sort();
  }, []);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DIRECTORY_ENTRIES.filter((entry) => {
      if (selectedCategory !== 'ALL' && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedLanguage !== 'ALL' && entry.language !== selectedLanguage) {
        return false;
      }
      if (selectedTech !== 'ALL' && entry.primaryTechnology !== selectedTech) {
        return false;
      }
      if (subsetFilter === 'popular' && !entry.popular) return false;
      if (subsetFilter === 'trending' && !entry.trending) return false;

      if (q) {
        const hay = `${entry.websiteName} ${entry.domain} ${entry.repoFullName} ${entry.description} ${entry.primaryTechnology} ${entry.language} ${entry.categoryLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'stars') return b.stars - a.stars;
      if (sortBy === 'forks') return b.forks - a.forks;
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return b.confidence - a.confidence || b.stars - a.stars;
    });
  }, [
    searchQuery,
    selectedCategory,
    selectedLanguage,
    selectedTech,
    subsetFilter,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedLanguage('ALL');
    setSelectedTech('ALL');
    setSubsetFilter('all');
    setSortBy('stars');
  };

  return (
    <div className="py-8 space-y-6">
      {/* Bold Editorial Page Header Banner with Archival Showcase Image */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-[#8B0000] rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B0000] mb-1.5">
              Curated Open-Source Web Platform Index
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
              Explore Verified Websites &amp; Repositories
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-800 max-w-2xl">
              Search and filter websites with publicly verifiable GitHub repositories by
              technology stack, programming language, category, and star count.
            </p>
          </div>
          <div className="lg:col-span-4 bg-slate-950 relative min-h-[160px] border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 overflow-hidden">
            <img
              src={BUNDLED_SHOWCASE_IMAGES.directoryArchive}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== FREE_SOURCE_FALLBACK_IMAGES.directoryArchive) {
                  target.src = FREE_SOURCE_FALLBACK_IMAGES.directoryArchive;
                }
              }}
              alt="Curated Open-Source Directory Archive"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-xs font-mono text-white">
              <div className="text-red-400 font-bold">ARCHIVAL INDEX</div>
              <div className="text-white font-bold">
                {DIRECTORY_ENTRIES.length} Verified Web Platforms
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 bg-white border-2 border-slate-900 rounded-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative flex items-center bg-white border-2 border-slate-900 rounded-sm focus-within:border-blue-800">
            <Search className="w-4 h-4 ml-3 text-[#8B0000] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by domain, project, repo, or stack..."
              aria-label="Search repositories"
              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Category Select */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
            >
              <option value="ALL">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Language Select */}
          <div className="md:col-span-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Filter by programming language"
              className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
            >
              <option value="ALL">All Languages</option>
              {allLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Framework / Tech Select */}
          <div className="md:col-span-2">
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              aria-label="Filter by framework or technology"
              className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-slate-900 rounded-sm text-slate-950"
            >
              <option value="ALL">All Frameworks</option>
              {allTechnologies.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t-2 border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 border-2 border-slate-900 rounded-sm gap-1">
              {(['all', 'popular', 'trending'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSubsetFilter(mode)}
                  className={`px-3.5 py-1 rounded-xs font-bold capitalize cursor-pointer ${
                    subsetFilter === mode
                      ? 'btn-crimson text-white'
                      : 'text-slate-900 hover:text-blue-800'
                  }`}
                >
                  <span>{mode}</span>
                </button>
              ))}
            </div>

            <span className="font-mono font-bold text-slate-950">
              {filteredEntries.length}{' '}
              {filteredEntries.length === 1 ? 'repository' : 'repositories'} found
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-bold">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border-2 border-slate-900 rounded-sm px-2.5 py-1 font-mono text-xs font-bold text-slate-950"
              >
                <option value="stars">Most Stars</option>
                <option value="updated">Recently Updated</option>
                <option value="forks">Most Forked</option>
                <option value="relevance">Match Confidence</option>
              </select>
            </div>

            {(searchQuery ||
              selectedCategory !== 'ALL' ||
              selectedLanguage !== 'ALL' ||
              selectedTech !== 'ALL' ||
              subsetFilter !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn-royal px-3 py-1 rounded-xs text-white font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 border-2 border-slate-900 rounded-sm">
          <h2 className="text-xl font-display font-extrabold text-slate-950 mb-1">
            No matching repositories found
          </h2>
          <p className="text-xs font-semibold text-slate-700 max-w-md mx-auto mb-4">
            No indexed websites matched your current filter combination. Clear your
            search filters or run a live URL analysis.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="btn-crimson px-4 py-2 text-xs font-bold rounded-sm text-white cursor-pointer"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <RepositoryCard
              key={entry.id}
              entry={entry}
              onSelectWebsite={onSelectWebsite}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
};
