import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  RotateCcw,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { AnalyzeResponse, RepositoryCandidate } from '../types';
import { DIRECTORY_ENTRIES } from '../data/directoryData';
import { formatCompactNumber } from '../components/RepositoryCard';
import { WebsiteThumbnail } from '../components/WebsiteThumbnail';
import { BUNDLED_SHOWCASE_IMAGES, FREE_SOURCE_FALLBACK_IMAGES } from '../imageAssets';

interface FindRepositoryViewProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  isLoading: boolean;
  result: AnalyzeResponse | null;
  onAnalyze: (targetUrl?: string, forceRefresh?: boolean) => void;
  onReset: () => void;
}

const PIPELINE_STEPS = [
  'Validating URL format & checking SSRF/network restrictions...',
  'Fetching publicly accessible HTML, meta tags, and OpenGraph signals...',
  'Scanning markup for direct GitHub, GitLab, Bitbucket & Codeberg links...',
  'Querying GitHub public REST API & checking README domain references...',
  'Scoring candidate repositories across 9 verification rules...',
];

function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return 'Unknown';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Unknown';
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 30) return `Updated ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `Updated ${diffMonths} mo ago`;
  return `Updated ${Math.floor(diffDays / 365)} yr ago`;
}

export const FindRepositoryView: React.FC<FindRepositoryViewProps> = ({
  urlInput,
  setUrlInput,
  isLoading,
  result,
  onAnalyze,
  onReset,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<'relevance' | 'stars' | 'updated' | 'forks'>(
    'relevance'
  );
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');

  useEffect(() => {
    if (result?.repositories && result.repositories.length > 0) {
      setSelectedRepoFullName(result.repositories[0].fullName);
    } else {
      setSelectedRepoFullName(null);
    }
    setLanguageFilter('ALL');
    setSortBy('relevance');
  }, [result]);

  useEffect(() => {
    if (!isLoading) {
      setStepIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, [isLoading]);

  const sortedAndFilteredCandidates = React.useMemo(() => {
    const list = [...(result?.repositories || [])].filter((r) =>
      languageFilter === 'ALL' ? true : r.language === languageFilter
    );
    list.sort((a, b) => {
      if (sortBy === 'stars') return b.stars - a.stars;
      if (sortBy === 'forks') return b.forks - a.forks;
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return b.confidence - a.confidence || b.stars - a.stars;
    });
    return list;
  }, [result, sortBy, languageFilter]);

  const activeRepository: RepositoryCandidate | null =
    sortedAndFilteredCandidates.find((r) => r.fullName === selectedRepoFullName) ||
    sortedAndFilteredCandidates[0] ||
    null;

  const availableLanguages = Array.from(
    new Set(
      (result?.repositories || [])
        .map((r) => r.language)
        .filter((l): l is string => Boolean(l))
    )
  );

  // Dynamically resolve the searched website's live preview & top repository for the header image panel
  const liveHeaderPreview = React.useMemo(() => {
    const rawTarget = (urlInput || result?.website || '').trim();
    const cleanedDomain = rawTarget
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    const matchedDirectoryEntry = cleanedDomain
      ? DIRECTORY_ENTRIES.find(
          (e) =>
            e.domain.toLowerCase() === cleanedDomain ||
            cleanedDomain.endsWith(`.${e.domain.toLowerCase()}`) ||
            e.domain.toLowerCase().startsWith(`${cleanedDomain}/`)
        )
      : undefined;

    if (activeRepository) {
      const dom =
        result?.normalizedDomain ||
        cleanedDomain ||
        matchedDirectoryEntry?.domain ||
        'github.com';
      return {
        active: true,
        domain: dom,
        websiteName:
          result?.websiteMetadata?.title ||
          matchedDirectoryEntry?.websiteName ||
          activeRepository.name,
        repoOwner: activeRepository.owner,
        repoName: activeRepository.name,
        primaryTechnology:
          result?.websiteMetadata?.detectedFrameworks?.[0] ||
          matchedDirectoryEntry?.primaryTechnology ||
          activeRepository.language ||
          'Public Source',
        language: activeRepository.language || matchedDirectoryEntry?.language || 'Git',
        customImageUrl: result?.websiteMetadata?.ogImage || null,
        badgeLabel: isLoading
          ? `SCANNING // ${dom}`
          : `TOP MATCH // ${activeRepository.owner}/${activeRepository.name}`,
        confidenceText: `${activeRepository.confidence}% Confidence`,
      };
    }

    if (matchedDirectoryEntry) {
      return {
        active: true,
        domain: matchedDirectoryEntry.domain,
        websiteName: matchedDirectoryEntry.websiteName,
        repoOwner: matchedDirectoryEntry.repoOwner,
        repoName: matchedDirectoryEntry.repoName,
        primaryTechnology: matchedDirectoryEntry.primaryTechnology,
        language: matchedDirectoryEntry.language,
        customImageUrl: null,
        badgeLabel: isLoading
          ? `ANALYZING // ${matchedDirectoryEntry.domain}`
          : `INDEXED MATCH // ${matchedDirectoryEntry.repoFullName}`,
        confidenceText: `${matchedDirectoryEntry.confidence}% Verified`,
      };
    }

    if (cleanedDomain && cleanedDomain.includes('.')) {
      return {
        active: true,
        domain: cleanedDomain,
        websiteName: result?.websiteMetadata?.title || cleanedDomain,
        repoOwner: undefined,
        repoName: undefined,
        primaryTechnology:
          result?.websiteMetadata?.detectedFrameworks?.[0] || 'Live Website Preview',
        language: 'Web',
        customImageUrl: result?.websiteMetadata?.ogImage || null,
        badgeLabel: isLoading
          ? `INSPECTING // ${cleanedDomain}`
          : `WEBSITE PREVIEW // ${cleanedDomain}`,
        confidenceText: result?.status === 'not_found' ? 'No Public Repo' : 'Ready',
      };
    }

    return null;
  }, [urlInput, result, activeRepository, isLoading]);

  return (
    <div className="py-8 space-y-8">
      {/* Bold Page Header Banner with Optical Signal Instrument Visual */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-blue-800 rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B0000] mb-1.5">
              Live Multi-Signal Repository Analyzer
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
              Find Repository by Website URL
            </h1>
            <p className="text-sm text-slate-800 font-semibold max-w-2xl mb-6">
              Enter any public website URL. We inspect its HTML metadata, OpenGraph
              tags, and source links, then query GitHub&apos;s API to rank candidate
              repositories by match confidence.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAnalyze();
              }}
              className="max-w-2xl"
            >
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1 flex items-center bg-white border-2 border-slate-900 rounded-sm focus-within:border-blue-800">
                  <Search className="w-4 h-4 ml-3.5 text-[#8B0000] shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    aria-label="Website URL"
                    className="w-full px-3 py-3 text-sm font-mono font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="mr-2.5 px-2.5 py-1 text-xs font-bold rounded-xs bg-slate-200 hover:bg-slate-300 text-slate-900 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-crimson px-6 py-3 rounded-sm text-sm font-bold text-white disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <span>{isLoading ? 'Analyzing Website...' : 'Analyze Website'}</span>
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="text-slate-900 font-bold">Quick test URLs:</span>
              {[
                'https://threejs.org',
                'https://gsap.com',
                'https://magicui.design',
                'https://nextjs.org',
                'https://supabase.com',
              ].map((u, i) => (
                <React.Fragment key={u}>
                  {i > 0 && <span className="text-[#8B0000] font-bold">·</span>}
                  <button
                    type="button"
                    onClick={() => onAnalyze(u)}
                    disabled={isLoading}
                    className="font-mono font-bold text-blue-800 hover:text-[#8B0000] hover:underline cursor-pointer"
                  >
                    {u}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-950 relative min-h-[220px] border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 overflow-hidden flex flex-col justify-between">
            {liveHeaderPreview ? (
              <>
                <div className="flex-1 flex flex-col justify-center bg-slate-950">
                  <WebsiteThumbnail
                    key={`${liveHeaderPreview.domain}-${liveHeaderPreview.repoOwner || ''}-${liveHeaderPreview.repoName || ''}`}
                    domain={liveHeaderPreview.domain}
                    websiteName={liveHeaderPreview.websiteName}
                    repoOwner={liveHeaderPreview.repoOwner}
                    repoName={liveHeaderPreview.repoName}
                    primaryTechnology={liveHeaderPreview.primaryTechnology}
                    language={liveHeaderPreview.language}
                    customImageUrl={liveHeaderPreview.customImageUrl}
                    className="w-full h-full border-b-0"
                  />
                </div>
                <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] font-mono text-white">
                  <span className="text-red-400 font-bold truncate">
                    {liveHeaderPreview.badgeLabel}
                  </span>
                  <span className="text-blue-300 font-bold shrink-0">
                    {liveHeaderPreview.confidenceText}
                  </span>
                </div>
              </>
            ) : (
              <>
                <img
                  src={BUNDLED_SHOWCASE_IMAGES.signalRadar}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FREE_SOURCE_FALLBACK_IMAGES.signalRadar) {
                      target.src = FREE_SOURCE_FALLBACK_IMAGES.signalRadar;
                    }
                  }}
                  alt="Optical Signal Verification Instrument"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-xs font-mono text-white">
                  <div className="text-red-400 font-bold">SIGNAL PIPELINE</div>
                  <div className="text-white font-bold">
                    Enter any URL to preview website &amp; top repo
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton & Pipeline Progress */}
      {isLoading && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-50 border-2 border-slate-900 rounded-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-slate-950">
                Inspecting <span className="font-mono text-[#8B0000]">{urlInput}</span>
              </span>
              <span className="text-xs font-mono font-bold tabular-nums text-blue-800">
                Step {stepIdx + 1} / {PIPELINE_STEPS.length}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-xs overflow-hidden mb-4">
              <div
                className="h-full bg-[#8B0000] transition-all duration-200"
                style={{
                  width: `${((stepIdx + 1) / PIPELINE_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <div className="space-y-1.5">
              {PIPELINE_STEPS.map((s, idx) => (
                <div
                  key={s}
                  className={`text-xs font-mono font-bold flex items-center gap-2 ${
                    idx < stepIdx
                      ? 'text-blue-800'
                      : idx === stepIdx
                      ? 'text-[#8B0000]'
                      : 'text-slate-400'
                  }`}
                >
                  <span>{idx < stepIdx ? '[OK]' : idx === stepIdx ? '[..]' : '    '}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {!isLoading && result && (
        <div className="space-y-6">
          {/* Invalid URL / Rate Limit / Error */}
          {(result.status === 'invalid_url' ||
            result.status === 'rate_limited' ||
            result.status === 'error') && (
            <div className="p-6 rounded-sm border-2 border-[#8B0000] border-l-8 bg-red-50/50">
              <div className="text-xs font-mono font-bold text-[#8B0000] mb-1">
                {result.status === 'invalid_url'
                  ? 'Security & URL Validation Blocked Request'
                  : result.status === 'rate_limited'
                  ? 'Rate Limit Reached'
                  : 'Analysis Error'}{' '}
                · {result.website}
              </div>
              <h2 className="text-xl font-display font-extrabold text-slate-950 mb-1.5">
                {result.status === 'invalid_url'
                  ? 'Invalid or Restricted Website URL'
                  : result.status === 'rate_limited'
                  ? 'API Rate Limit Reached'
                  : 'Unable to Complete Analysis'}
              </h2>
              <p className="text-sm font-semibold text-slate-800 mb-4">
                {result.message}
              </p>
              <button
                type="button"
                onClick={onReset}
                className="btn-crimson px-4 py-2 text-xs font-bold rounded-sm text-white cursor-pointer"
              >
                <span>Analyze Another URL</span>
              </button>
            </div>
          )}

          {/* Alternative Git Hosting Banner */}
          {result.otherGitHostings && result.otherGitHostings.length > 0 && (
            <div className="p-5 rounded-sm border-2 border-slate-900 border-l-8 border-l-[#8B0000] bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#8B0000] font-bold mb-1">
                  Alternative Git Hosting Detected (
                  {result.otherGitHostings[0].platform})
                </div>
                <p className="text-sm font-bold text-slate-950">
                  {result.repositories.length === 0
                    ? `This website appears to have a public ${result.otherGitHostings[0].platform} repository rather than GitHub.`
                    : `This website also links to a public ${result.otherGitHostings[0].platform} repository.`}
                </p>
              </div>
              <a
                href={result.otherGitHostings[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-royal px-4 py-2 text-xs font-bold rounded-sm text-white inline-flex items-center gap-1.5 shrink-0 self-start md:self-center"
              >
                <span>Open {result.otherGitHostings[0].platform} Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* No Reliable Public Repository Found */}
          {result.status === 'not_found' && (
            <div className="p-7 rounded-sm border-2 border-slate-900 border-l-8 border-l-[#8B0000] bg-slate-50 max-w-3xl">
              <div className="text-xs font-mono font-bold text-[#8B0000] mb-1.5">
                {result.normalizedDomain || result.website} · Match confidence: 0% —
                No reliable public repository found
              </div>
              <h2 className="text-2xl font-display font-extrabold text-slate-950 mb-2">
                No Public Repository Found
              </h2>
              <p className="text-sm font-bold text-slate-900 mb-2">
                No public GitHub repository could be reliably identified for this
                website.
              </p>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-5">
                We couldn&apos;t reliably identify a public GitHub repository
                associated with this website. The website may use a private
                repository, a different Git hosting provider, or may not have
                publicly available source code.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="btn-royal px-4 py-2.5 text-xs font-bold rounded-sm text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Analyze Again</span>
              </button>
            </div>
          )}

          {/* Found / Possible Match Results */}
          {(result.status === 'found' || result.status === 'possible_match') &&
            activeRepository && (
              <>
                {/* Search Engine Result Count & Sort Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 bg-slate-950 text-white rounded-sm text-xs">
                  <div className="font-mono font-bold text-white">
                    <span className="text-white">
                      {sortedAndFilteredCandidates.length}{' '}
                      {sortedAndFilteredCandidates.length === 1
                        ? 'repository'
                        : 'repositories'}{' '}
                      found
                    </span>{' '}
                    for{' '}
                    <span className="text-red-400">
                      {result.normalizedDomain || result.website}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {availableLanguages.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold">Language:</span>
                        <select
                          value={languageFilter}
                          onChange={(e) => setLanguageFilter(e.target.value)}
                          className="bg-white text-slate-950 border border-slate-400 rounded-xs px-2 py-1 font-mono text-xs font-bold"
                        >
                          <option value="ALL">All</option>
                          {availableLanguages.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-white font-bold">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-white text-slate-950 border border-slate-400 rounded-xs px-2 py-1 font-mono text-xs font-bold"
                      >
                        <option value="relevance">Relevance (Confidence)</option>
                        <option value="stars">Stars</option>
                        <option value="updated">Recently Updated</option>
                        <option value="forks">Most Forked</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Primary Selected Candidate Detail */}
                  <div className="lg:col-span-8 bg-white border-2 border-slate-900 rounded-sm overflow-hidden">
                    <WebsiteThumbnail
                      domain={result.normalizedDomain || result.website}
                      websiteName={activeRepository.name}
                      repoOwner={activeRepository.owner}
                      repoName={activeRepository.name}
                      language={activeRepository.language || undefined}
                      customImageUrl={result.websiteMetadata?.ogImage}
                    />

                    <div className="p-6 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-5 border-b-2 border-slate-900 text-xs font-mono font-bold">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[#8B0000]">
                            {activeRepository.confidence >= 70
                              ? 'Likely Match — GitHub Repository Found'
                              : 'Possible Match — Candidate Repository'}
                          </span>
                          {activeRepository.isBestMatch && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="text-blue-800">Best Match</span>
                            </>
                          )}
                        </div>
                        <span className="tabular-nums text-slate-950">
                          Match confidence: {activeRepository.confidence}% —{' '}
                          {activeRepository.confidenceLabel}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-950 mb-1">
                          {activeRepository.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-mono font-bold text-slate-800">
                          <span>Owner: {activeRepository.owner}</span>
                          <span className="text-[#8B0000]">·</span>
                          <a
                            href={activeRepository.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-800 hover:text-[#8B0000] hover:underline inline-flex items-center gap-1"
                          >
                            <span>
                              github.com/{activeRepository.owner}/
                              {activeRepository.name}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed mb-6">
                        {activeRepository.description ||
                          'No public description provided in repository metadata.'}
                      </p>

                      {/* Statistics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 py-4 border-y-2 border-slate-900 mb-6 font-mono tabular-nums">
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            Stars
                          </div>
                          <div className="text-base font-extrabold text-slate-950">
                            <span className="text-[#8B0000]">★</span>{' '}
                            {formatCompactNumber(activeRepository.stars)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            Forks
                          </div>
                          <div className="text-base font-extrabold text-slate-950">
                            <span className="text-blue-800">⑂</span>{' '}
                            {formatCompactNumber(activeRepository.forks)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            Primary Language
                          </div>
                          <div className="text-sm font-bold text-slate-950">
                            {activeRepository.language || 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            Last Updated
                          </div>
                          <div className="text-sm font-bold text-slate-950">
                            {formatRelativeDate(activeRepository.updatedAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            License
                          </div>
                          <div className="text-sm font-bold text-slate-950">
                            {activeRepository.license || 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-sans font-bold text-slate-600">
                            Visibility
                          </div>
                          <div className="text-sm font-bold capitalize text-slate-950">
                            {activeRepository.visibility}
                          </div>
                        </div>
                      </div>

                      {/* Why this repository appears to match */}
                      <div className="mb-6">
                        <h3 className="text-sm font-display font-extrabold text-slate-950 mb-2.5">
                          Why This Repository Appears to Match
                        </h3>
                        <div className="divide-y divide-slate-200 border-y border-slate-300">
                          {activeRepository.signals.map((sig, i) => (
                            <div
                              key={i}
                              className="py-2.5 flex items-start justify-between gap-4 text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-950">
                                  {sig.label}
                                </div>
                                {sig.detail && (
                                  <div className="mt-0.5 font-mono font-semibold text-slate-700">
                                    {sig.detail}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-bold tabular-nums text-[#8B0000] shrink-0">
                                +{sig.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Required Action Buttons with Explicit White Text */}
                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={activeRepository.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-royal px-5 py-2.5 rounded-sm text-xs font-bold text-white inline-flex items-center gap-1.5"
                        >
                          <span>Open GitHub</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`${activeRepository.url}#readme`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-crimson px-5 py-2.5 rounded-sm text-xs font-bold text-white inline-flex items-center gap-1.5"
                        >
                          <span>View Repository</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={onReset}
                          className="btn-outline-editorial px-4 py-2.5 rounded-sm text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Analyze Again</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Candidate List Sidebar */}
                  <div className="lg:col-span-4 space-y-6">
                    <div>
                      <h3 className="text-base font-display font-extrabold text-slate-950 mb-2.5">
                        Possible GitHub Repositories
                      </h3>
                      <div className="divide-y divide-slate-200 border-2 border-slate-900 rounded-sm bg-white">
                        {sortedAndFilteredCandidates.map((repo, idx) => {
                          const isSelected =
                            repo.fullName === activeRepository.fullName;
                          return (
                            <button
                              key={repo.fullName}
                              type="button"
                              onClick={() => setSelectedRepoFullName(repo.fullName)}
                              className={`w-full text-left py-3.5 px-4 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 border-l-4 border-l-[#8B0000]'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="font-mono text-xs font-bold text-slate-950 truncate">
                                  {idx + 1}. {repo.fullName}
                                </span>
                                {repo.isBestMatch && (
                                  <span className="text-xs font-mono font-bold text-[#8B0000] shrink-0">
                                    Best Match
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold tabular-nums text-slate-700">
                                <span className="text-blue-800">
                                  {repo.confidence}% confidence
                                </span>
                                {repo.language && (
                                  <>
                                    <span>·</span>
                                    <span>{repo.language}</span>
                                  </>
                                )}
                                <span>·</span>
                                <span>{formatCompactNumber(repo.stars)} stars</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </div>
  );
};
