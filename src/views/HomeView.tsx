import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CATEGORIES, DIRECTORY_ENTRIES } from '../data/directoryData';
import { SearchHistoryItem } from '../types';
import { RepositoryCard } from '../components/RepositoryCard';
import { AdBannerSlot } from '../components/AdBannerSlot';
import { BUNDLED_SHOWCASE_IMAGES, FREE_SOURCE_FALLBACK_IMAGES } from '../imageAssets';

interface HomeViewProps {
  onAnalyzeUrl: (url: string) => void;
  onNavigate: (page: string) => void;
  onSelectWebsite: (slug: string) => void;
  onSelectCategory: (categorySlug: string) => void;
  history: SearchHistoryItem[];
}

const EXAMPLE_SEARCHES = [
  'https://threejs.org',
  'https://gsap.com',
  'https://magicui.design',
  'https://nextjs.org',
  'https://supabase.com',
];

export const HomeView: React.FC<HomeViewProps> = ({
  onAnalyzeUrl,
  onNavigate,
  onSelectWebsite,
  onSelectCategory,
  history,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [chartTab, setChartTab] = useState<'frameworks' | 'domains'>('frameworks');

  const featuredEntries = useMemo(
    () => DIRECTORY_ENTRIES.filter((e) => e.featured).slice(0, 9),
    []
  );

  const popularCategories = useMemo(() => {
    return CATEGORIES.slice(0, 12).map((cat) => {
      const count = DIRECTORY_ENTRIES.filter((e) => e.category === cat.slug).length;
      return { ...cat, count };
    });
  }, []);

  const chartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = history.filter((h) => h.timestamp >= thirtyDaysAgo);

    const fwCounts = new Map<string, number>();
    const domCounts = new Map<string, { searches: number; confidence: number }>();

    for (const item of recent) {
      const fws = item.cachedResult?.websiteMetadata?.detectedFrameworks || [];
      const topLang = item.cachedResult?.repositories?.[0]?.language;
      const combined = new Set([...fws, ...(topLang ? [topLang] : [])]);
      for (const fw of combined) {
        fwCounts.set(fw, (fwCounts.get(fw) || 0) + 1);
      }

      const d = item.domain.toLowerCase();
      const prev = domCounts.get(d);
      domCounts.set(d, {
        searches: (prev?.searches || 0) + 1,
        confidence: Math.max(prev?.confidence || 0, item.confidence),
      });
    }

    return {
      frameworks: Array.from(fwCounts.entries())
        .map(([name, searches]) => ({ name, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 6),
      domains: Array.from(domCounts.entries())
        .map(([name, v]) => ({ name, confidence: v.confidence, searches: v.searches }))
        .sort((a, b) => b.searches - a.searches || b.confidence - a.confidence)
        .slice(0, 6),
    };
  }, [history]);

  return (
    <div className="space-y-12 pb-12">
      {/* Editorial Hero Banner with High-Fidelity Visual Asset */}
      <section className="pt-8 pb-8 border-b-2 border-slate-950">
        <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-[#8B0000] rounded-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left 7 Columns: Search & Editorial Lead */}
            <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B0000] mb-2">
                  Public Source Code Index · Multi-Signal Verification Engine
                </div>
                <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 tracking-tight mb-3">
                  Discover the Public GitHub Repository Behind Any Website
                </h1>
                <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed mb-6">
                  Enter any website URL to inspect public HTML signals, OpenGraph
                  tags, and GitHub API records, or explore our curated database of
                  verified open-source web platforms.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (urlInput.trim()) onAnalyzeUrl(urlInput.trim());
                  }}
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
                    </div>
                    <button
                      type="submit"
                      className="btn-crimson px-6 py-3 rounded-sm text-sm font-bold text-white cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2"
                    >
                      <span>Find GitHub Repository</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
                  <span className="text-slate-900 font-bold">Example searches:</span>
                  {EXAMPLE_SEARCHES.map((url, idx) => (
                    <React.Fragment key={url}>
                      {idx > 0 && <span className="text-[#8B0000] font-bold">·</span>}
                      <button
                        type="button"
                        onClick={() => onAnalyzeUrl(url)}
                        className="font-mono font-bold text-blue-800 hover:text-[#8B0000] hover:underline cursor-pointer"
                      >
                        {url.replace(/^https?:\/\//, '')}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-6 mt-6 border-t border-slate-200 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="btn-royal px-4 py-2 rounded-sm text-xs font-bold text-white cursor-pointer"
                >
                  <span>Explore {DIRECTORY_ENTRIES.length} Verified Repositories →</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('websites')}
                  className="btn-outline-editorial px-4 py-2 rounded-sm text-xs font-bold cursor-pointer"
                >
                  <span>Open Complete Websites Directory</span>
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Architectural Visual Showcase + Live Index Ledger */}
            <div className="lg:col-span-5 bg-slate-950 text-white border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 flex flex-col justify-between">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-slate-900">
                <img
                  src={BUNDLED_SHOWCASE_IMAGES.heroObservatory}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FREE_SOURCE_FALLBACK_IMAGES.heroObservatory) {
                      target.src = FREE_SOURCE_FALLBACK_IMAGES.heroObservatory;
                    }
                  }}
                  alt="Public Source Code Observatory and Repository Verification Index"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono text-white">
                  <span className="text-white font-bold">
                    OBSERVATORY // PUBLIC GIT INDEX
                  </span>
                  <span className="text-red-400 font-bold">v2026.10</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="font-display font-extrabold text-lg text-white border-b border-slate-800 pb-2">
                  Directory Coverage &amp; Telemetry
                </div>
                <div className="grid grid-cols-3 gap-4 font-mono tabular-nums">
                  <div>
                    <div className="text-[11px] text-slate-300">Indexed Sites</div>
                    <div className="text-2xl font-extrabold text-white mt-0.5">
                      {DIRECTORY_ENTRIES.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-300">Categories</div>
                    <div className="text-2xl font-extrabold text-red-400 mt-0.5">
                      {CATEGORIES.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-300">Signal Rules</div>
                    <div className="text-2xl font-extrabold text-blue-400 mt-0.5">
                      09
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Websites & Verified Repositories */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-3 border-b-2 border-slate-900">
          <div>
            <div className="text-xs font-mono font-bold text-[#8B0000] uppercase">
              Curated Directory Highlights
            </div>
            <h2 className="text-2xl font-display font-extrabold text-slate-950">
              Featured Websites &amp; Verified Repositories
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="btn-obsidian px-4 py-2 rounded-sm text-xs font-bold text-white cursor-pointer self-start sm:self-end"
          >
            <span>Browse All {DIRECTORY_ENTRIES.length} Repositories →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredEntries.map((entry) => (
            <RepositoryCard
              key={entry.id}
              entry={entry}
              onSelectWebsite={onSelectWebsite}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      </section>

      {/* Mid-Page Leaderboard Ad Slot */}
      <AdBannerSlot position="inline" />

      {/* Recently Discovered Repositories + 30-Day Recharts Telemetry */}
      <section className="pt-8 border-t-2 border-slate-950 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recently Discovered Ledger */}
        <div className="lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-display font-extrabold text-slate-950">
                Recently Discovered Repositories
              </h2>
              <p className="text-xs text-slate-700 font-semibold">
                Latest website-to-repository inspections from your session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('find')}
              className="btn-crimson px-3.5 py-1.5 rounded-sm text-xs font-bold text-white cursor-pointer"
            >
              <span>Open Analyzer →</span>
            </button>
          </div>

          <div className="border-2 border-slate-900 rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="bg-slate-950 text-white border-b border-slate-900">
                  <th className="py-3 px-3 font-bold text-white">Domain</th>
                  <th className="py-3 px-3 font-bold text-white">Repository</th>
                  <th className="py-3 px-3 font-bold text-right text-white">Match</th>
                  <th className="py-3 px-3 font-bold text-right text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {history.slice(0, 6).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-950">
                      {item.domain}
                    </td>
                    <td className="py-2.5 px-3 text-blue-900 font-semibold truncate max-w-[160px]">
                      {item.topRepoFullName ||
                        (item.otherPlatform
                          ? `${item.otherPlatform} repo`
                          : 'No public repo')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.confidence > 0 ? (
                        <span className="text-[#8B0000] font-bold">
                          {item.confidence}%
                        </span>
                      ) : (
                        <span className="text-slate-500">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAnalyzeUrl(item.url)}
                        className="btn-royal px-2.5 py-1 rounded-xs text-[11px] font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 30-Day Recharts Visualization */}
        <div className="lg:col-span-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-xl font-display font-extrabold text-slate-950">
                30-Day Discovery Telemetry
              </h2>
              <p className="text-xs text-slate-700 font-semibold">
                Trending frameworks and most-searched domains over the last 30 days.
              </p>
            </div>
            <div className="inline-flex p-1 bg-slate-100 border-2 border-slate-900 rounded-sm text-xs gap-1">
              <button
                type="button"
                onClick={() => setChartTab('frameworks')}
                className={`px-3 py-1 rounded-xs font-bold cursor-pointer ${
                  chartTab === 'frameworks'
                    ? 'btn-royal text-white'
                    : 'text-slate-900 hover:text-[#8B0000]'
                }`}
              >
                <span>Frameworks</span>
              </button>
              <button
                type="button"
                onClick={() => setChartTab('domains')}
                className={`px-3 py-1 rounded-xs font-bold cursor-pointer ${
                  chartTab === 'domains'
                    ? 'btn-crimson text-white'
                    : 'text-slate-900 hover:text-[#8B0000]'
                }`}
              >
                <span>Domains</span>
              </button>
            </div>
          </div>

          <div className="p-4 border-2 border-slate-900 rounded-sm bg-white h-60 font-mono text-xs tabular-nums">
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'frameworks' ? (
                <BarChart
                  data={chartData.frameworks}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="#CBD5E1"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#090D16', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={95}
                    tick={{ fill: '#090D16', fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#090D16',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="searches"
                    fill="#1E3A8A"
                    radius={[0, 2, 2, 0]}
                    barSize={18}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={chartData.domains}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="#CBD5E1"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: '#090D16', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    tick={{ fill: '#090D16', fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#090D16',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="confidence"
                    fill="#8B0000"
                    radius={[0, 2, 2, 0]}
                    barSize={18}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Popular Categories Directory Grid */}
      <section className="pt-8 border-t-2 border-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-mono font-bold text-[#8B0000] uppercase">
              Industry Taxonomy
            </div>
            <h2 className="text-2xl font-display font-extrabold text-slate-950">
              Browse Websites by Category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="btn-royal px-4 py-2 rounded-sm text-xs font-bold text-white cursor-pointer self-start sm:self-end"
          >
            <span>View All {CATEGORIES.length} Categories →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularCategories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className="p-4 text-left card-editorial rounded-sm cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-base font-display font-extrabold text-slate-950">
                    {cat.title}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#8B0000] font-bold">
                    {cat.count} sites
                  </span>
                </div>
                <p className="text-xs text-slate-800 font-semibold line-clamp-2 mb-3">
                  {cat.shortDescription}
                </p>
              </div>
              <div className="text-[11px] font-mono font-bold text-blue-800 truncate pt-2 border-t border-slate-200">
                {cat.featuredDomains.slice(0, 2).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
