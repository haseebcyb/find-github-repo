import React, { useState, useEffect } from 'react';
import { Menu, X, Mail, ArrowUpRight, ShieldCheck, Globe } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AnalyzeResponse, SearchHistoryItem } from './types';
import { CATEGORIES, CATEGORY_MAP, DIRECTORY_ENTRIES } from './data/directoryData';
import { HomeView } from './views/HomeView';
import { FindRepositoryView } from './views/FindRepositoryView';
import { ExploreView } from './views/ExploreView';
import { WebsitesDirectoryView } from './views/WebsitesDirectoryView';
import { CategoriesView } from './views/CategoriesView';
import { WebsiteDetailView } from './views/WebsiteDetailView';
import { AboutView } from './views/AboutView';
import { AdBannerSlot } from './components/AdBannerSlot';
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

  // Support SEO query parameters (?page=..., ?category=..., ?site=..., ?q=...) on initial load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page') as RoutePage | null;
      const catParam = params.get('category');
      const siteParam = params.get('site');
      const qParam = params.get('q');

      if (siteParam) {
        setSelectedWebsiteSlug(siteParam);
        setActivePage('website-detail');
      } else if (catParam) {
        setSelectedCategorySlug(catParam);
        setActivePage('categories');
      } else if (
        pageParam &&
        ['home', 'find', 'explore', 'categories', 'websites', 'about', 'website-detail'].includes(
          pageParam
        )
      ) {
        setActivePage(pageParam);
      }

      if (qParam) {
        setUrlInput(qParam);
        setActivePage('find');
      }
    } catch {
      // Ignore URL parse errors
    }
  }, []);

  // Dynamic On-Page SEO per route (Title, Meta Description, Canonical URL, OpenGraph, Twitter Cards, Per-Page LLM Index & Schema.org JSON-LD)
  useEffect(() => {
    let title =
      'Website → GitHub Finder — Discover Public GitHub Repositories Behind Any Website';
    let desc =
      'Enter a website URL and discover whether its publicly available source code is hosted on GitHub, or explore 180+ Three.js, Frontend Animation, and UI/UX repositories.';
    let canonicalPath = '/';
    let llmIndexFile = '/llms-home.txt';
    let schemaPageType = 'WebPage';

    if (activePage === 'find') {
      title = 'Find Repository by Website URL — Website → GitHub Finder';
      desc =
        'Analyze any public website URL to inspect HTML signals, OpenGraph tags, and verify matching GitHub repositories.';
      canonicalPath = '/?page=find';
      llmIndexFile = '/llms-find.txt';
      schemaPageType = 'WebApplication';
    } else if (activePage === 'explore') {
      title = 'Explore 180+ Open-Source Websites & Repositories — Website → GitHub Finder';
      desc =
        'Search and filter verified websites with public GitHub repositories including Three.js, GSAP Animation, UI/UX Design Systems, and SaaS.';
      canonicalPath = '/?page=explore';
      llmIndexFile = '/llms-explore.txt';
      schemaPageType = 'CollectionPage';
    } else if (activePage === 'websites') {
      title = 'Complete Websites & Repository Directory — Website → GitHub Finder';
      desc =
        'Browse our comprehensive directory of 180+ websites and their publicly identifiable GitHub source repositories.';
      canonicalPath = '/?page=websites';
      llmIndexFile = '/llms-websites.txt';
      schemaPageType = 'CollectionPage';
    } else if (activePage === 'categories') {
      llmIndexFile = '/llms-categories.txt';
      schemaPageType = 'CollectionPage';
      if (
        selectedCategorySlug &&
        CATEGORY_MAP[selectedCategorySlug as keyof typeof CATEGORY_MAP]
      ) {
        const cat = CATEGORY_MAP[selectedCategorySlug as keyof typeof CATEGORY_MAP];
        title = `${cat.title} Websites & GitHub Repositories — Website → GitHub Finder`;
        desc = cat.shortDescription;
        canonicalPath = `/?page=categories&category=${cat.slug}`;
      } else {
        title = 'Browse 21 Website & Repository Categories — Website → GitHub Finder';
        desc =
          'Explore 21 categories of websites with public GitHub repositories including Three.js & 3D, Frontend Animation, UI/UX Design, Developer Tools, SaaS, and AI.';
        canonicalPath = '/?page=categories';
      }
    } else if (activePage === 'website-detail') {
      llmIndexFile = '/llms-websites.txt';
      schemaPageType = 'SoftwareSourceCode';
      const entry = DIRECTORY_ENTRIES.find((e) => e.slug === selectedWebsiteSlug);
      if (entry) {
        title = `${entry.websiteName} (${entry.domain}) Public GitHub Repository — Website → GitHub Finder`;
        desc = `${entry.websiteName} public GitHub repository (${entry.repoFullName}): ${entry.description}`;
        canonicalPath = `/?page=website-detail&site=${entry.slug}`;
      }
    } else if (activePage === 'about') {
      title = 'How It Works, Security Architecture & Developer Query — Website → GitHub Finder';
      desc =
        'Learn how Website to GitHub Finder scores candidate repositories, enforces SSRF protections, and submit a query to our engineering team.';
      canonicalPath = '/?page=about';
      llmIndexFile = '/llms-about.txt';
      schemaPageType = 'AboutPage';
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

    const origin = window.location.origin;
    const fullCanonicalUrl = `${origin}${canonicalPath}`;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) canonicalEl.setAttribute('href', fullCanonicalUrl);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('href', fullCanonicalUrl);

    const llmLinkEl = document.getElementById('llm-index-link');
    if (llmLinkEl) llmLinkEl.setAttribute('href', llmIndexFile);

    // Update dynamic per-page Schema.org JSON-LD for Google Search Console & LLM Answer Engines
    const jsonLdEl = document.getElementById('dynamic-route-jsonld');
    if (jsonLdEl) {
      const selectedEntry =
        activePage === 'website-detail'
          ? DIRECTORY_ENTRIES.find((e) => e.slug === selectedWebsiteSlug)
          : null;

      const jsonLdPayload = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': schemaPageType,
            name: title,
            description: desc,
            url: fullCanonicalUrl,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Website → GitHub Finder',
              url: `${origin}/`,
            },
            ...(selectedEntry
              ? {
                  codeRepository: selectedEntry.repoUrl,
                  programmingLanguage: selectedEntry.language,
                  runtimePlatform: selectedEntry.primaryTechnology,
                }
              : {}),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home Observatory',
                item: `${origin}/`,
              },
              ...(activePage !== 'home'
                ? [
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: title.split(' — ')[0],
                      item: fullCanonicalUrl,
                    },
                  ]
                : []),
            ],
          },
        ],
      };
      jsonLdEl.textContent = JSON.stringify(jsonLdPayload);
    }
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
      {/* Top Bar Contract: Zone 1 (Emblem Logo Only) — Zone 2 (6 Nav Links) — Zone 3 (Primary Action) */}
      <header className="sticky top-0 z-30 bg-white border-t-4 border-t-[#8B0000] border-b-2 border-b-slate-950">
        <div className="max-w-[1640px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
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
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-bold"
          >
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

      {/* Main Content Container with Left & Right Skyscraper Ad Columns Clamped to Content Height */}
      <div className="flex-1 w-full max-w-[1680px] mx-auto px-3 sm:px-6 flex items-start justify-center gap-5">
        {/* Left Side Skyscraper Advertisement Column */}
        <div className="hidden lg:block pt-4 overflow-hidden">
          <AdBannerSlot
            position="left"
            onInquireClick={() => navigateTo('about')}
          />
        </div>

        {/* Primary Page Content */}
        <main className="flex-1 max-w-[1240px] w-full min-w-0">
          {/* Top Leaderboard 728x90 Ad Banner (Shown Across All Website Pages) */}
          <AdBannerSlot
            position="top"
            onInquireClick={() => navigateTo('about')}
          />

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

          {/* Single Leaderboard Ad Banner at Bottom of Content before Footer */}
          <div className="pt-2 pb-1">
            <AdBannerSlot
              position="inline"
              onInquireClick={() => navigateTo('about')}
            />
          </div>
        </main>

        {/* Right Side Skyscraper Advertisement Column */}
        <div className="hidden lg:block pt-4 overflow-hidden">
          <AdBannerSlot
            position="right"
            onInquireClick={() => navigateTo('about')}
          />
        </div>
      </div>

      {/* Upgraded Editorial Archival Footer Immediately Below Content */}
      <footer className="border-t-4 border-t-[#8B0000] bg-slate-950 text-slate-300 mt-4">
        {/* Top Footer Callout Bar */}
        <div className="border-b border-slate-800 bg-slate-900/90">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/favicon.svg"
                alt="Emblem"
                width={38}
                height={38}
                className="w-9 h-9 rounded-xs shrink-0"
              />
              <div>
                <div className="text-lg font-display font-extrabold text-white tracking-tight">
                  Website → GitHub Finder · Public Source Code Observatory
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  Indexing {DIRECTORY_ENTRIES.length}+ verified websites across{' '}
                  {CATEGORIES.length} categories including Three.js, GSAP Motion, and
                  UI/UX Systems.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateTo('find')}
                className="btn-crimson px-4 py-2 rounded-sm text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1"
              >
                <span>Analyze a Website</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo('about')}
                className="btn-royal px-4 py-2 rounded-sm text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Submit Query / Book Ad</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main 6-Column Footer Directory */}
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 pb-10 border-b border-slate-800">
            {/* Column 1: Platform Navigation */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-[#8B0000] pl-2">
                Platform
              </div>
              <ul className="space-y-2 font-semibold">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Home Observatory
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('find')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Find Repository by URL
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('explore')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Explore &amp; Filter ({DIRECTORY_ENTRIES.length})
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('websites')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Complete Websites Ledger
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Creative & Frontend Categories */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-blue-500 pl-2">
                Creative &amp; UI
              </div>
              <ul className="space-y-2 font-semibold">
                <li>
                  <button
                    type="button"
                    onClick={() => openCategory('threejs-3d')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Three.js, WebGL &amp; 3D
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCategory('frontend-animation')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Frontend Animation &amp; Motion
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCategory('ui-ux-design')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    UI/UX &amp; Design Systems
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openCategory('portfolio')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Creative Portfolios
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Popular Verified Showcases */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-[#8B0000] pl-2">
                Top Verified
              </div>
              <ul className="space-y-2 font-semibold font-mono text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('threejs.org')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    threejs.org (Three.js)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('gsap.com')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    gsap.com (GreenSock)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('magicui.design')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    magicui.design (Magic UI)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openWebsiteDetail('nextjs.org')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    nextjs.org (Next.js)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: SEO & Per-Page LLM Crawling Index */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-blue-500 pl-2">
                SEO &amp; Page LLM Index
              </div>
              <ul className="space-y-2 font-semibold">
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-white hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>sitemap.xml (GSC)</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-white hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>robots.txt (All LLMs)</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/llms-full.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-white hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <span>llms-full.txt (All Pages)</span>
                  </a>
                </li>
                <li className="flex flex-wrap gap-1.5 pt-0.5 font-mono text-[10px]">
                  <a
                    href="/llms-home.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline"
                  >
                    Home
                  </a>
                  <span>·</span>
                  <a
                    href="/llms-find.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline"
                  >
                    Find
                  </a>
                  <span>·</span>
                  <a
                    href="/llms-explore.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline"
                  >
                    Explore
                  </a>
                  <span>·</span>
                  <a
                    href="/llms-categories.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline"
                  >
                    Categories
                  </a>
                  <span>·</span>
                  <a
                    href="/llms-websites.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline"
                  >
                    Websites
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5: Developer Contact & Advertising */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-[#8B0000] pl-2">
                Support &amp; Ad Units
              </div>
              <ul className="space-y-2 font-semibold">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('about')}
                    className="text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    User Query &amp; Support Desk
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('about')}
                    className="text-blue-400 hover:text-white hover:underline cursor-pointer"
                  >
                    Submit Website / Book Ad
                  </button>
                </li>
                <li className="text-slate-300 font-mono text-[11px]">
                  160×600 ID: <span className="text-white">31626365</span>
                </li>
                <li className="text-slate-300 font-mono text-[11px]">
                  728×90 ID: <span className="text-white">31626366</span>
                </li>
              </ul>
            </div>

            {/* Column 6: Telemetry & API Attribution */}
            <div className="space-y-3">
              <div className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-l-2 border-blue-500 pl-2">
                Verification API
              </div>
              <p className="text-slate-300 font-semibold leading-relaxed">
                Powered by public HTML signal extraction and the official{' '}
                <a
                  href="https://docs.github.com/en/rest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  GitHub REST API
                </a>
                . Monitored with Vercel Speed Insights.
              </p>
            </div>
          </div>

          {/* Bottom Legal & Telemetry Ledger */}
          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-400 font-semibold">
            <div>
              © {new Date().getFullYear()} Website → GitHub Finder · Engineered by{' '}
              <span className="text-white font-bold">pkfinder company</span>.
            </div>
            <div className="font-mono text-[11px] text-slate-300">
              On-Page SEO Verified · Sitemap &amp; Robots Active · GitHub REST API v2022-11-28
            </div>
          </div>
        </div>
      </footer>

      {/* Vercel Speed Insights Telemetry */}
      <SpeedInsights />
    </div>
  );
}
