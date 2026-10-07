import React, { useMemo } from 'react';
import { ArrowLeft, ExternalLink, ArrowUpRight, Search } from 'lucide-react';
import { DIRECTORY_ENTRIES } from '../data/directoryData';
import { RepositoryCard, formatCompactNumber } from '../components/RepositoryCard';
import { WebsiteThumbnail } from '../components/WebsiteThumbnail';

interface WebsiteDetailViewProps {
  websiteSlug: string;
  onBack: () => void;
  onSelectWebsite: (slug: string) => void;
  onSelectCategory: (categorySlug: string) => void;
  onRunLiveAnalysis: (url: string) => void;
}

function getRepositoryAge(createdAt: string): string {
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return 'Established';
  const years = Math.max(
    1,
    Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 365))
  );
  return `${years} ${years === 1 ? 'year' : 'years'} (${created.getFullYear()})`;
}

export const WebsiteDetailView: React.FC<WebsiteDetailViewProps> = ({
  websiteSlug,
  onBack,
  onSelectWebsite,
  onSelectCategory,
  onRunLiveAnalysis,
}) => {
  const entry = useMemo(
    () =>
      DIRECTORY_ENTRIES.find(
        (e) =>
          e.slug.toLowerCase() === websiteSlug.toLowerCase() ||
          e.domain.toLowerCase() === websiteSlug.toLowerCase()
      ) || DIRECTORY_ENTRIES[0],
    [websiteSlug]
  );

  const relatedWebsites = useMemo(
    () =>
      DIRECTORY_ENTRIES.filter(
        (e) => e.category === entry.category && e.id !== entry.id
      ).slice(0, 3),
    [entry]
  );

  const similarRepositories = useMemo(
    () =>
      DIRECTORY_ENTRIES.filter(
        (e) =>
          e.id !== entry.id &&
          e.category !== entry.category &&
          (e.language === entry.language ||
            e.primaryTechnology === entry.primaryTechnology)
      ).slice(0, 3),
    [entry]
  );

  return (
    <div className="py-8 space-y-10">
      {/* Bold Page Header Banner */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-[#8B0000] p-6 sm:p-7 rounded-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 mb-2">
            <button
              type="button"
              onClick={onBack}
              className="text-blue-800 hover:text-[#8B0000] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
            <span className="text-[#8B0000]">/</span>
            <button
              type="button"
              onClick={() => onSelectCategory(entry.category)}
              className="text-blue-800 hover:text-[#8B0000] hover:underline cursor-pointer"
            >
              {entry.categoryLabel}
            </button>
            <span className="text-[#8B0000]">/</span>
            <span className="text-slate-950">{entry.domain}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950">
            {entry.websiteName} — Public Repository Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onRunLiveAnalysis(entry.websiteUrl)}
          className="btn-royal px-4 py-2.5 rounded-sm text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Run Live Signal Re-Verification</span>
        </button>
      </div>

      {/* Main Split Layout: Preview + Technical Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Website Preview & Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border-2 border-slate-900 rounded-sm overflow-hidden bg-white">
            <WebsiteThumbnail
              domain={entry.domain}
              websiteName={entry.websiteName}
              repoOwner={entry.repoOwner}
              repoName={entry.repoName}
              primaryTechnology={entry.primaryTechnology}
              language={entry.language}
            />
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono font-bold">
                <span className="text-[#8B0000]">
                  Verified Public Repository · {entry.confidence}% Match Confidence
                </span>
                <span className="text-slate-900">
                  Visibility: {entry.visibility}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-800 mb-4">
                <a
                  href={entry.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-800 hover:text-[#8B0000] hover:underline inline-flex items-center gap-1"
                >
                  <span>{entry.websiteUrl}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <span className="text-[#8B0000]">·</span>
                <a
                  href={entry.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-950 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  <span>github.com/{entry.repoFullName}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed mb-6">
                {entry.description}
              </p>

              {/* Primary CTA Buttons with White Text */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t-2 border-slate-900">
                <a
                  href={entry.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-royal px-5 py-2.5 rounded-sm text-xs font-bold text-white inline-flex items-center gap-1.5"
                >
                  <span>Open Website</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                <a
                  href={entry.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-crimson px-5 py-2.5 rounded-sm text-xs font-bold text-white inline-flex items-center gap-1.5"
                >
                  <span>View GitHub Repository</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Match Verification Explanation */}
          <div className="p-5 bg-slate-50 border-2 border-slate-900 rounded-sm space-y-2 text-xs">
            <h2 className="font-display font-extrabold text-base text-slate-950">
              How This Repository Was Verified
            </h2>
            <p className="font-mono font-bold text-[#8B0000]">{entry.matchReason}</p>
            <p className="font-semibold text-slate-700">
              Verified via public HTML metadata inspection and GitHub REST API
              repository metadata.
            </p>
          </div>
        </div>

        {/* Right 5 Columns: Complete Technical Ledger */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 border-t-8 border-t-slate-950 rounded-sm p-6">
          <h2 className="text-lg font-display font-extrabold text-slate-950 pb-3 mb-4 border-b-2 border-[#8B0000]">
            Repository &amp; Website Specifications
          </h2>

          <dl className="divide-y divide-slate-200 text-xs font-mono font-bold tabular-nums">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">Website Name</dt>
              <dd className="text-slate-950 text-right">{entry.websiteName}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">Website URL</dt>
              <dd className="text-blue-800 truncate text-right">
                <a
                  href={entry.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {entry.domain}
                </a>
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">
                GitHub Repository
              </dt>
              <dd className="text-[#8B0000] text-right">{entry.repoFullName}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">
                Repository Owner
              </dt>
              <dd className="text-slate-950 text-right">@{entry.repoOwner}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">Category</dt>
              <dd className="text-right">
                <button
                  type="button"
                  onClick={() => onSelectCategory(entry.category)}
                  className="text-blue-800 hover:underline cursor-pointer"
                >
                  {entry.categoryLabel}
                </button>
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">
                Primary Technology
              </dt>
              <dd className="text-slate-950 text-right">
                {entry.primaryTechnology}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">
                Technologies Detected
              </dt>
              <dd className="text-slate-800 text-right">
                {entry.technologies.join(' · ')}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">
                Primary Language
              </dt>
              <dd className="text-blue-800 text-right">{entry.language}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">GitHub Stars</dt>
              <dd className="text-[#8B0000] text-right">
                ★ {entry.stars.toLocaleString()} ({formatCompactNumber(entry.stars)})
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">GitHub Forks</dt>
              <dd className="text-slate-950 text-right">
                ⑂ {entry.forks.toLocaleString()} ({formatCompactNumber(entry.forks)})
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">Repository Age</dt>
              <dd className="text-slate-950 text-right">
                {getRepositoryAge(entry.createdAt)}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">Last Update</dt>
              <dd className="text-slate-950 text-right">{entry.updatedAt}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-700 font-sans font-bold">License</dt>
              <dd className="text-slate-950 text-right">{entry.license}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Related Websites in Same Category */}
      {relatedWebsites.length > 0 && (
        <section className="pt-8 border-t-2 border-slate-950">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-display font-extrabold text-slate-950">
                Related Websites in {entry.categoryLabel}
              </h2>
              <p className="text-xs font-semibold text-slate-700">
                Other websites in the {entry.categoryLabel} category with public
                GitHub repositories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory(entry.category)}
              className="btn-obsidian px-3.5 py-1.5 rounded-sm text-xs font-bold text-white cursor-pointer"
            >
              <span>More in {entry.categoryLabel} →</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedWebsites.map((rel) => (
              <RepositoryCard
                key={rel.id}
                entry={rel}
                onSelectWebsite={onSelectWebsite}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        </section>
      )}

      {/* Similar Repositories by Language / Technology */}
      {similarRepositories.length > 0 && (
        <section className="pt-8 border-t-2 border-slate-950">
          <div className="mb-4">
            <h2 className="text-2xl font-display font-extrabold text-slate-950">
              Similar Repositories Using {entry.language}
            </h2>
            <p className="text-xs font-semibold text-slate-700">
              Public repositories across other categories sharing {entry.websiteName}
              &apos;s programming language or stack.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarRepositories.map((sim) => (
              <RepositoryCard
                key={sim.id}
                entry={sim}
                onSelectWebsite={onSelectWebsite}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
