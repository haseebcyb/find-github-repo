import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP, DIRECTORY_ENTRIES } from '../data/directoryData';
import { CategorySlug } from '../types';
import { RepositoryCard, formatCompactNumber } from '../components/RepositoryCard';

interface CategoriesViewProps {
  activeCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  onSelectWebsite: (slug: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  activeCategorySlug,
  onSelectCategory,
  onSelectWebsite,
}) => {
  const activeCategory = activeCategorySlug
    ? CATEGORY_MAP[activeCategorySlug as CategorySlug]
    : null;

  if (activeCategory) {
    const categoryEntries = DIRECTORY_ENTRIES.filter(
      (e) => e.category === activeCategory.slug
    ).sort((a, b) => b.stars - a.stars);

    const totalStars = categoryEntries.reduce((acc, e) => acc + e.stars, 0);

    return (
      <div className="py-8 space-y-6">
        <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-[#8B0000] p-6 sm:p-8 rounded-sm">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="btn-obsidian px-3 py-1.5 rounded-xs text-xs font-mono font-bold text-white inline-flex items-center gap-1 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Categories</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold uppercase text-[#8B0000] mb-1">
                Category Index · /{activeCategory.slug}
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
                {activeCategory.title} Websites &amp; Public GitHub Repositories
              </h1>
              <p className="text-sm sm:text-base font-semibold text-slate-800 max-w-2xl">
                {activeCategory.shortDescription}
              </p>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs tabular-nums border-t-2 md:border-t-0 pt-3 md:pt-0 border-slate-900">
              <div>
                <div className="text-slate-600 font-bold">Indexed Projects</div>
                <div className="text-xl font-extrabold text-blue-800">
                  {categoryEntries.length}
                </div>
              </div>
              <div>
                <div className="text-slate-600 font-bold">Combined Stars</div>
                <div className="text-xl font-extrabold text-[#8B0000]">
                  ★ {formatCompactNumber(totalStars)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Domains Bar */}
        <div className="p-4 bg-white border-2 border-slate-900 rounded-sm flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
          <span className="text-slate-950 font-sans font-bold">
            Featured {activeCategory.title} websites:
          </span>
          {activeCategory.featuredDomains.map((dom, idx) => (
            <React.Fragment key={dom}>
              {idx > 0 && <span className="text-[#8B0000]">·</span>}
              <button
                type="button"
                onClick={() => onSelectWebsite(dom)}
                className="text-blue-800 hover:text-[#8B0000] hover:underline cursor-pointer"
              >
                {dom}
              </button>
            </React.Fragment>
          ))}
        </div>

        {categoryEntries.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border-2 border-slate-900 rounded-sm">
            <h2 className="text-lg font-display font-extrabold text-slate-950 mb-1">
              No repositories indexed in this category yet
            </h2>
            <p className="text-xs font-semibold text-slate-700 mb-4">
              Return to the category directory or analyze a live URL.
            </p>
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="btn-crimson px-4 py-2 text-xs font-bold rounded-sm text-white cursor-pointer"
            >
              <span>Browse All Categories</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryEntries.map((entry) => (
              <RepositoryCard
                key={entry.id}
                entry={entry}
                onSelectWebsite={onSelectWebsite}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      {/* Bold Editorial Categories Header Banner with Archival Image */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-blue-800 rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B0000] mb-1.5">
              Taxonomy &amp; Domain Classification
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
              Website &amp; Repository Categories
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-800 max-w-2xl">
              Browse {CATEGORIES.length} specialized categories of websites that publish
              open-source code or maintain verified public GitHub repositories.
            </p>
          </div>
          <div className="lg:col-span-4 bg-slate-950 relative min-h-[160px] border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 overflow-hidden">
            <img
              src="/src/assets/images/directory_archive_showcase_1791382431169.jpg"
              alt="Category Taxonomy Archive"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-xs font-mono text-white">
              <div className="text-red-400 font-bold">TAXONOMY // 18 SECTORS</div>
              <div className="text-white font-bold">
                Structured Open-Source Classification
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATEGORIES.map((cat) => {
          const entries = DIRECTORY_ENTRIES.filter((e) => e.category === cat.slug);
          const totalStars = entries.reduce((sum, e) => sum + e.stars, 0);

          return (
            <div
              key={cat.slug}
              className="p-5 card-editorial rounded-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.slug)}
                    className="text-lg font-display font-extrabold text-slate-950 hover:text-blue-800 text-left cursor-pointer"
                  >
                    {cat.title}
                  </button>
                  <span className="text-xs font-mono font-bold tabular-nums text-[#8B0000]">
                    {entries.length} {entries.length === 1 ? 'project' : 'projects'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-800 leading-relaxed mb-4">
                  {cat.shortDescription}
                </p>

                <div className="mb-4">
                  <div className="text-[11px] font-mono font-bold text-slate-600 mb-1">
                    Featured Websites:
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono font-bold">
                    {entries.slice(0, 3).map((e, idx) => (
                      <React.Fragment key={e.id}>
                        {idx > 0 && <span className="text-[#8B0000]">·</span>}
                        <button
                          type="button"
                          onClick={() => onSelectWebsite(e.slug)}
                          className="text-blue-800 hover:text-[#8B0000] hover:underline cursor-pointer"
                        >
                          {e.domain}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="font-mono tabular-nums text-slate-900">
                  <span className="text-[#8B0000]">★</span>{' '}
                  {formatCompactNumber(totalStars)} stars
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.slug)}
                  className="btn-royal px-3 py-1 rounded-xs text-white font-bold cursor-pointer"
                >
                  <span>Open Category →</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
