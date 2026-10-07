import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AnalyzeResponse, SearchHistoryItem } from './types';
import { CATEGORIES, CATEGORY_MAP, DIRECTORY_ENTRIES } from './data/directoryData';
import { HomeView } from './views/HomeView';
import { FindRepositoryView } from './views/FindRepositoryView';
import { ExploreView } from './views/ExploreView';
import { WebsitesDirectoryView } from './views/WebsitesDirectoryView';
import { CategoriesView } from './views/CategoriesView';
import { WebsiteDetailView } from './views/WebsiteDetailView';
import { AboutView } from './views/AboutView';
import { analyzeWebsiteClientFallback } from './utils/clientAnalyzerFallback';

export type RoutePage =
  | 'home'
  | 'find'
  | 'explore'
  | 'categories'
  | 'websites'
  | 'about'
  | 'website-detail';

const BASELINE_30D_HISTORY: SearchHistoryItem[] = DIRECTORY_ENTRIES.slice(0, 6).map(
  (entry, idx) => ({
    id: `seed-${entry.slug}`,
    url: entry.websiteUrl,
    domain: entry.domain,
    status: 'found',
    confidence: entry.confidence,
    topRepoFullName: entry.repoFullName,
    timestamp: Date.now() - (idx + 1) * 3 * 24 * 60 * 60 * 1000,
    cachedResult: {
      website: entry.websiteUrl,
      normalizedDomain: entry.domain,
      status: 'found',
      confidence: entry.confidence,
      confidenceLabel: 'Very likely',
      repositories: [
        {
          name: entry.repoName,
          owner: entry.repoOwner,
          fullName: entry.repoFullName,
          url: entry.repoUrl,
          description: entry.description,
          stars: entry.stars,
          forks: entry.forks,
          language: entry.language,
          updatedAt: entry.updatedAt,
          license: entry.license,
          visibility: 'public',
          homepage: entry.websiteUrl,
          topics: entry.technologies,
          confidence: entry.confidence,
          confidenceLabel: 'Very likely',
          isBestMatch: true,
          signals: [
            {
              label: 'Website directly links to this GitHub repository',
              points: 50,
              category: 'strong',
              detail: entry.matchReason,
            },
            {
              label: 'GitHub repository contains the exact website domain',
              points: 30,
              category: 'strong',
              detail: `Repository homepage matches ${entry.domain}`,
            },
            {
              label: 'Repository name strongly matches website/project name',
              points: 15,
              category: 'medium',
            },
          ],
        },
      ],
      websiteMetadata: {
        normalizedUrl: entry.websiteUrl,
        domain: entry.domain,
        title: entry.websiteName,
        description: entry.description,
        generator: entry.primaryTechnology,
        author: entry.repoOwner,
        detectedFrameworks: entry.technologies,
        directGithubUrls: [entry.repoUrl],
        fetchSuccess: true,
      },
    },
  })
);

export default function App() {
  const [activePage, setActivePage] = useState<RoutePage>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    null
  );
  const [selectedWebsiteSlug, setSelectedWebsiteSlug] = useState<string>(
    DIRECTORY_ENTRIES[0].slug
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live analyzer state
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(
    null
  );

  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('wtgf_search_history_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return BASELINE_30D_HISTORY;
    } catch {
      return BASELINE_30D_HISTORY;
    }
  });

  // Dynamic SEO per route
  useEffect(() => {
    let title = 'Website to GitHub Finder — Find Public GitHub Repositories';
    let desc =
      'Enter a website URL and discover whether its publicly available source code is hosted on GitHub.';

    if (activePage === 'find') {
      title = 'Find Repository by Website URL — Website to GitHub Finder';
      desc =
        'Analyze any public website URL to inspect HTML signals and verify matching GitHub repositories.';
    } else if (activePage === 'explore') {
      title = 'Explore Open-Source Websites & Repositories — Website to GitHub Finder';
      desc =
        'Search and filter verified websites with public GitHub repositories by framework, language, and category.';
    } else if (activePage === 'websites') {
      title = 'Complete Websites & Repository Directory — Website to GitHub Finder';
      desc =
        'Browse our comprehensive directory of websites and their publicly identifiable GitHub source repositories.';
    } else if (activePage === 'categories') {
      if (selectedCategorySlug && CATEGORY_MAP[selectedCategorySlug as keyof typeof CATEGORY_MAP]) {
        const cat = CATEGORY_MAP[selectedCategorySlug as keyof typeof CATEGORY_MAP];
        title = `${cat.title} Websites & GitHub Repositories — Website to GitHub Finder`;
        desc = cat.shortDescription;
      } else {
        title = 'Browse Website Categories — Website to GitHub Finder';
        desc =
          'Explore 18 categories of websites with public GitHub repositories including Developer Tools, SaaS, AI, and E-commerce.';
      }
    } else if (activePage === 'website-detail') {
      const entry = DIRECTORY_ENTRIES.find((e) => e.slug === selectedWebsiteSlug);
      if (entry) {
        title = `${entry.websiteName} (${entry.domain}) GitHub Repository — Website to GitHub Finder`;
        desc = `${entry.websiteName} public GitHub repository (${entry.repoFullName}): ${entry.description}`;
      }
    } else if (activePage === 'about') {
      title = 'How It Works & Security Architecture — Website to GitHub Finder';
      desc =
        'Learn how Website to GitHub Finder scores candidate repositories and enforces strict SSRF protections.';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', desc);
  }, [activePage, selectedCategorySlug, selectedWebsiteSlug]);

  const saveToHistory = (res: AnalyzeResponse) => {
    if (
      res.status === 'invalid_url' ||
      res.status === 'rate_limited' ||
      res.status === 'error'
    ) {
      return;
    }
    const domain = res.normalizedDomain || res.website;
    const newItem: SearchHistoryItem = {
      id: `${domain}-${Date.now()}`,
      url: res.website,
      domain,
      status: res.status,
      confidence: res.confidence,
      topRepoFullName: res.repositories[0]?.fullName,
      otherPlatform: res.otherGitHostings?.[0]?.platform,
      timestamp: Date.now(),
      cachedResult: res,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 30);
      try {
        localStorage.setItem('wtgf_search_history_v1', JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      return updated;
    });
  };

  const handleAnalyze = async (targetUrl?: string, forceRefresh = false) => {
    const queryUrl = (targetUrl !== undefined ? targetUrl : urlInput).trim();
    if (!queryUrl) return;

    if (targetUrl !== undefined) {
      setUrlInput(targetUrl);
    }

    setActivePage('find');
    setMobileMenuOpen(false);
    setIsLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: queryUrl, forceRefresh }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Non-JSON response from backend');
      }

      const data: AnalyzeResponse = await response.json();

      // If backend returned a generic error or couldn't find a known directory site, check client fallback
      if (data.status === 'error' || data.status === 'not_found') {
        const fallbackData = await analyzeWebsiteClientFallback(queryUrl);
        if (
          fallbackData.status === 'found' ||
          fallbackData.status === 'possible_match' ||
          data.status === 'error'
        ) {
          setAnalysisResult(fallbackData);
          saveToHistory(fallbackData);
          return;
        }
      }

      setAnalysisResult(data);
      saveToHistory(data);
    } catch {
      // Backend unreachable (e.g., static hosting or dev server restarting) -> run resilient client fallback
      const fallbackData = await analyzeWebsiteClientFallback(queryUrl);
      setAnalysisResult(fallbackData);
      saveToHistory(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (page: RoutePage) => {
    setActivePage(page);
    if (page !== 'categories') {
      setSelectedCategorySlug(null);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCategory = (slug: string | null) => {
    setSelectedCategorySlug(slug);
    setActivePage('categories');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWebsiteDetail = (slug: string) => {
    setSelectedWebsiteSlug(slug);
    setActivePage('website-detail');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: Array<{ id: RoutePage; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'find', label: 'Find Repository' },
    { id: 'explore', label: 'Explore' },
    { id: 'categories', label: 'Categories' },
    { id: 'websites', label: 'Websites' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-950">
      {/* Top Bar Contract: Zone 1 (Single Brand Wordmark) — Zone 2 (6 Nav Links) — Zone 3 (Primary Action) */}
      <header className="sticky top-0 z-30 bg-white border-t-4 border-t-[#8B0000] border-b-2 border-b-slate-950">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Brand Emblem Logo Only (Logo Text Removed) */}
          <a
            href="/"
            aria-label="Home"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex items-center shrink-0"
          >
            <img
              src="/favicon.svg"
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xs shrink-0"
            />
          </a>

          {/* Zone 2: Multi-page desktop navigation in Poppins Bold */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold">
            {navItems.map((item) => {
              const isActive =
                activePage === item.id ||
                (item.id === 'websites' && activePage === 'website-detail');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#8B0000] font-extrabold underline underline-offset-8 decoration-2 decoration-[#8B0000]'
                      : 'text-slate-900 hover:text-blue-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigateTo('find')}
              className="btn-crimson px-4 py-2 text-xs font-bold rounded-sm text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Analyze URL</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-1.5 rounded-sm border-2 border-slate-900 text-slate-950 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-slate-900 bg-white px-5 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full text-left py-2 px-3 rounded-sm text-sm font-bold block cursor-pointer ${
                    isActive
                      ? 'btn-crimson text-white'
                      : 'text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-5 sm:px-8">
        {activePage === 'home' && (
          <HomeView
            onAnalyzeUrl={(u) => handleAnalyze(u)}
            onNavigate={(p) => navigateTo(p as RoutePage)}
            onSelectWebsite={openWebsiteDetail}
            onSelectCategory={openCategory}
            history={history}
          />
        )}

        {activePage === 'find' && (
          <FindRepositoryView
            urlInput={urlInput}
            setUrlInput={setUrlInput}
            isLoading={isLoading}
            result={analysisResult}
            onAnalyze={handleAnalyze}
            onReset={() => {
              setUrlInput('');
              setAnalysisResult(null);
            }}
          />
        )}

        {activePage === 'explore' && (
          <ExploreView
            onSelectWebsite={openWebsiteDetail}
            onSelectCategory={openCategory}
          />
        )}

        {activePage === 'websites' && (
          <WebsitesDirectoryView
            onSelectWebsite={openWebsiteDetail}
            onSelectCategory={openCategory}
            onAnalyzeUrl={(u) => handleAnalyze(u)}
          />
        )}

        {activePage === 'categories' && (
          <CategoriesView
            activeCategorySlug={selectedCategorySlug}
            onSelectCategory={openCategory}
            onSelectWebsite={openWebsiteDetail}
          />
        )}

        {activePage === 'website-detail' && (
          <WebsiteDetailView
            websiteSlug={selectedWebsiteSlug}
            onBack={() => navigateTo('websites')}
            onSelectWebsite={openWebsiteDetail}
            onSelectCategory={openCategory}
            onRunLiveAnalysis={(u) => handleAnalyze(u)}
          />
        )}

        {activePage === 'about' && (
          <AboutView onNavigate={(p) => navigateTo(p as RoutePage)} />
        )}
      </main>

      {/* Professional Multi-Column Footer */}
      <footer className="border-t border-slate-200 bg-[#F9FAFB] mt-16 text-xs text-slate-600">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 pb-8 border-b border-slate-200">
            {/* Column 1: Product */}
            <div className="space-y-2.5">
              <div className="font-semibold text-slate-900">Product</div>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('find')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Find Repository
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('websites')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Websites Directory
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Explore */}
            <div className="space-y-2.5">
              <div className="font-semibold text-slate-900">Explore</div>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('explore')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Search &amp; Filter
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('nextjs.org')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Next.js (nextjs.org)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('supabase.com')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Supabase (supabase.com)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Categories */}
            <div className="space-y-2.5">
              <div className="font-semibold text-slate-900">Categories</div>
              <ul className="space-y-1.5">
                {CATEGORIES.slice(0, 4).map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => openCategory(c.slug)}
                      className="hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Resources */}
            <div className="space-y-2.5">
              <div className="font-semibold text-slate-900">Resources</div>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('about')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Scoring Methodology
                  </button>
                </li>
                <li>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 hover:underline font-mono"
                  >
                    robots.txt
                  </a>
                </li>
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 hover:underline font-mono"
                  >
                    sitemap.xml
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5: About & Contact */}
            <div className="space-y-2.5">
              <div className="font-bold text-slate-900">About &amp; Contact</div>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('about')}
                    className="hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Ask a Query / Support Form
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:ohmllghothak@gmail.com"
                    className="text-blue-700 hover:underline font-mono text-[11px]"
                  >
                    ohmllghothak@gmail.com
                  </a>
                </li>
                <li className="text-slate-600 font-medium">pkfinder company</li>
              </ul>
            </div>

            {/* Column 6: GitHub Attribution */}
            <div className="space-y-2.5">
              <div className="font-semibold text-slate-900">GitHub</div>
              <p className="text-slate-500 leading-relaxed">
                Repository statistics and metadata powered by the public{' '}
                <a
                  href="https://docs.github.com/en/rest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  GitHub REST API
                </a>
                .
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-500">
            <div>
              © {new Date().getFullYear()} Website → GitHub Finder · Built by
              pkfinder company. All repository matches are automated estimates from
              public data.
            </div>
            <div className="font-mono text-[11px]">
              Public HTML Signals + GitHub REST API v2022-11-28
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
