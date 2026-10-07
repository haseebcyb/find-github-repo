import express from 'express';
import { createServer as createViteServer } from 'vite';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '64kb' }));

// Rate limiting per client IP (max 25 requests per 15 minutes)
interface RateRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateRecord>();
const RATE_LIMIT_MAX = 25;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Result cache (TTL: 10 minutes)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, link-local, or reserved.
 */
function isPrivateOrReservedIP(ip: string): boolean {
  const cleanIp = ip.replace(/^::ffff:/i, '');

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [a, b, c] = parts;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24
    if (a === 192 && b === 0 && c === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmark)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    // Unique local fc00::/7 (fc00... or fd00...)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local fe80::/10
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    // Multicast ff00::/8
    if (normalized.startsWith('ff')) return true;
    return false;
  }

  return true;
}

/**
 * Validates and normalizes the user-submitted URL, blocking SSRF vectors.
 */
async function validateAndNormalizeUrl(rawInput: string): Promise<{
  valid: boolean;
  url?: URL;
  domain?: string;
  reason?: string;
}> {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, reason: 'Please enter a valid website URL.' };
  }

  let trimmed = rawInput.trim();
  if (trimmed.length > 2048) {
    return { valid: false, reason: 'URL exceeds maximum allowed length.' };
  }

  // Block dangerous schemes before prepending https://
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      reason: 'Only public HTTP and HTTPS website URLs are supported.',
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Malformed URL format. Example: https://example.com' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URLs containing credentials are not permitted.' };
  }

  // Restrict to standard web ports if specified
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { valid: false, reason: 'Non-standard network ports are blocked for security.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost, internal hostnames, and cloud metadata domains
  const blockedHostnames = new Set([
    'localhost',
    'localhost.localdomain',
    '0.0.0.0',
    '127.0.0.1',
    '::1',
    '[::1]',
    'metadata.google.internal',
    'metadata',
    '169.254.169.254',
    'instance-data',
  ]);

  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.arpa')
  ) {
    return {
      valid: false,
      reason: 'Requests to localhost, private networks, or internal endpoints are blocked.',
    };
  }

  // Require a valid public domain structure with a TLD (or check IP)
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return {
        valid: false,
        reason: 'Requests to private, loopback, or reserved IP addresses are blocked.',
      };
    }
  } else {
    if (!hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.')) {
      return {
        valid: false,
        reason: 'Please enter a complete domain name (e.g., https://example.com).',
      };
    }
    const tld = hostname.split('.').pop() || '';
    if (tld.length < 2 || /^\d+$/.test(tld)) {
      return {
        valid: false,
        reason: 'Invalid top-level domain in URL.',
      };
    }
  }

  // Resolve DNS to prevent DNS rebinding / SSRF to private IPs
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, reason: `Could not resolve domain "${hostname}".` };
    }
    for (const record of records) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          valid: false,
          reason: 'Domain resolves to a restricted private or internal IP address.',
        };
      }
    }
  } catch {
    return {
      valid: false,
      reason: `Unable to resolve DNS for "${hostname}". Verify the domain exists.`,
    };
  }

  const normalizedDomain = hostname.replace(/^www\./i, '');
  return { valid: true, url: parsed, domain: normalizedDomain };
}

/**
 * Safely fetches a URL while verifying redirects and limiting response size.
 */
async function safeFetchHtml(initialUrl: URL, maxRedirects = 3): Promise<{
  ok: boolean;
  html: string;
  finalUrl: string;
  warning?: string;
}> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const validation = await validateAndNormalizeUrl(currentUrl.toString());
    if (!validation.valid || !validation.url) {
      return {
        ok: false,
        html: '',
        finalUrl: currentUrl.toString(),
        warning: validation.reason || 'Redirect target blocked by security policy.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; WebsiteToGitHubFinder/1.0; +https://github.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      clearTimeout(timeoutId);

      // Handle 3xx redirects manually to validate every hop against SSRF
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            html: '',
            finalUrl: currentUrl.toString(),
            warning: 'Redirect response missing Location header.',
          };
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          html: '',
          finalUrl: currentUrl.toString(),
          warning: `Website returned HTTP ${response.status}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (
        contentType &&
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml') &&
        !contentType.includes('text/plain')
      ) {
        return {
          ok: false,
          html: '',
          finalUrl: currentUrl.toString(),
          warning: 'URL did not return an HTML document.',
        };
      }

      // Read up to 600KB maximum to handle very large websites safely
      const reader = response.body?.getReader();
      if (!reader) {
        return { ok: false, html: '', finalUrl: currentUrl.toString() };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      const MAX_BYTES = 600 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalBytes += value.byteLength;
          if (totalBytes >= MAX_BYTES) {
            await reader.cancel();
            break;
          }
        }
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const html = new TextDecoder('utf-8', { fatal: false }).decode(combined);
      return { ok: true, html, finalUrl: currentUrl.toString() };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      return {
        ok: false,
        html: '',
        finalUrl: currentUrl.toString(),
        warning: isTimeout
          ? 'Website took too long to respond (timed out); falling back to domain & API signals.'
          : 'Could not directly fetch website HTML; using domain and public API signals.',
      };
    }
  }

  return {
    ok: false,
    html: '',
    finalUrl: currentUrl.toString(),
    warning: 'Too many redirects encountered.',
  };
}

const IGNORED_GITHUB_OWNERS = new Set([
  'features',
  'marketplace',
  'orgs',
  'organizations',
  'pricing',
  'about',
  'contact',
  'security',
  'login',
  'join',
  'signup',
  'explore',
  'topics',
  'trending',
  'collections',
  'events',
  'sponsors',
  'settings',
  'notifications',
  'new',
  'codespaces',
  'copilot',
  'customer-stories',
  'enterprise',
  'team',
  'readme',
  'apps',
  'site',
  'blog',
  'careers',
  'press',
  'Resources',
  'resources',
  'solutions',
]);

interface ExtractedSignals {
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  generator: string | null;
  author: string | null;
  ogSiteName: string | null;
  detectedFrameworks: string[];
  directGithubRepos: Map<
    string,
    { owner: string; repo: string; sourceContext: string }
  >;
  directGithubOrgs: Set<string>;
  otherGitHostings: Array<{
    platform: 'GitLab' | 'Bitbucket' | 'Codeberg';
    url: string;
    repoPath: string;
  }>;
}

/**
 * Extracts metadata, direct GitHub repo links, org references, and other Git hostings from HTML.
 */
function extractSignalsFromHtml(html: string, domain: string): ExtractedSignals {
  const result: ExtractedSignals = {
    title: null,
    description: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    generator: null,
    author: null,
    ogSiteName: null,
    detectedFrameworks: [],
    directGithubRepos: new Map(),
    directGithubOrgs: new Set(),
    otherGitHostings: [],
  };

  // If targeting github.com directly or github.io pages
  if (domain.endsWith('.github.io')) {
    const sub = domain.replace(/\.github\.io$/i, '');
    if (sub && !IGNORED_GITHUB_OWNERS.has(sub)) {
      result.directGithubOrgs.add(sub);
      result.directGithubRepos.set(`${sub}/${sub}.github.io`.toLowerCase(), {
        owner: sub,
        repo: `${sub}.github.io`,
        sourceContext: 'GitHub Pages domain',
      });
    }
  }

  if (!html) return result;

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    result.title = decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim()).slice(0, 140);
  }

  // Meta tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const attrs = metaMatch[1];
    const nameMatch = attrs.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = attrs.match(/content\s*=\s*["']([^"']+)["']/i);
    if (nameMatch && contentMatch) {
      const name = nameMatch[1].toLowerCase().trim();
      const content = decodeHtmlEntities(contentMatch[1].trim());
      if (name === 'description') {
        result.description = content.slice(0, 260);
      } else if (name === 'og:description') {
        result.ogDescription = content.slice(0, 260);
        if (!result.description) result.description = result.ogDescription;
      } else if (name === 'og:title') {
        result.ogTitle = content.slice(0, 140);
      } else if (name === 'og:image') {
        if (/^https?:\/\//i.test(content)) {
          result.ogImage = content;
        }
      } else if (name === 'generator') {
        result.generator = content.slice(0, 100);
      } else if (name === 'author') {
        result.author = content.slice(0, 100);
      } else if (name === 'og:site_name') {
        result.ogSiteName = content.slice(0, 100);
      }
    }
  }

  // Detect Frameworks / Technologies from HTML signatures
  const frameworks = new Set<string>();
  if (html.includes('/_next/') || html.includes('__NEXT_DATA__')) {
    frameworks.add('Next.js');
    frameworks.add('TypeScript');
    frameworks.add('JavaScript');
  }
  if (html.includes('/_nuxt/') || html.includes('__NUXT__')) {
    frameworks.add('Nuxt');
    frameworks.add('Vue');
  }
  if (html.includes('__sveltekit') || html.includes('svelte-')) {
    frameworks.add('Svelte');
  }
  if (html.includes('astro-island') || /generator["'][^>]*Astro/i.test(html)) {
    frameworks.add('Astro');
  }
  if (html.includes('___gatsby') || /generator["'][^>]*Gatsby/i.test(html)) {
    frameworks.add('Gatsby');
  }
  if (/generator["'][^>]*Hugo/i.test(html)) {
    frameworks.add('Hugo');
    frameworks.add('Go');
  }
  if (/generator["'][^>]*Jekyll/i.test(html)) {
    frameworks.add('Jekyll');
    frameworks.add('Ruby');
  }
  if (/generator["'][^>]*Docusaurus/i.test(html) || html.includes('docusaurus')) {
    frameworks.add('Docusaurus');
  }
  if (html.includes('wp-content') || /generator["'][^>]*WordPress/i.test(html)) {
    frameworks.add('WordPress');
    frameworks.add('PHP');
  }
  result.detectedFrameworks = Array.from(frameworks);

  // Extract direct GitHub repository links (from hrefs, comments, scripts, or JSON data)
  const ghRepoRegex =
    /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)(?:\/([a-zA-Z0-9._-]{1,100}))?/gi;

  let ghMatch: RegExpExecArray | null;
  while ((ghMatch = ghRepoRegex.exec(html)) !== null) {
    const owner = ghMatch[1];
    let repo = ghMatch[2];

    if (!owner || IGNORED_GITHUB_OWNERS.has(owner.toLowerCase())) {
      continue;
    }

    if (repo) {
      repo = repo.replace(/(?:\.git|\/)+$/i, '');
      // Filter out non-repo profile subpaths or static asset links
      const ignoredSubpaths = new Set([
        'followers',
        'following',
        'repositories',
        'projects',
        'packages',
        'stars',
        'sponsoring',
        'sponsors',
        'issues',
        'pulls',
        'discussions',
      ]);
      if (
        ignoredSubpaths.has(repo.toLowerCase()) ||
        repo.endsWith('.png') ||
        repo.endsWith('.svg') ||
        repo.endsWith('.jpg') ||
        repo.endsWith('.ico')
      ) {
        result.directGithubOrgs.add(owner);
        continue;
      }

      const key = `${owner}/${repo}`.toLowerCase();
      if (!result.directGithubRepos.has(key)) {
        result.directGithubRepos.set(key, {
          owner,
          repo,
          sourceContext: 'Direct link in website HTML',
        });
      }
    } else {
      result.directGithubOrgs.add(owner);
    }
  }

  // Extract GitLab, Bitbucket, and Codeberg links
  const otherGitRegex =
    /https?:\/\/(?:www\.)?(gitlab\.com|bitbucket\.org|codeberg\.org)\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/gi;
  const seenOther = new Set<string>();
  let otherMatch: RegExpExecArray | null;
  while ((otherMatch = otherGitRegex.exec(html)) !== null) {
    const host = otherMatch[1].toLowerCase();
    const owner = otherMatch[2];
    const repo = otherMatch[3].replace(/(?:\.git|\/)+$/i, '');

    if (
      ['explore', 'users', 'groups', 'dashboard', 'account', 'site', 'Help'].includes(
        owner
      )
    ) {
      continue;
    }

    const platform =
      host === 'gitlab.com'
        ? 'GitLab'
        : host === 'bitbucket.org'
        ? 'Bitbucket'
        : 'Codeberg';
    const fullUrl = `https://${host}/${owner}/${repo}`;
    if (!seenOther.has(fullUrl.toLowerCase())) {
      seenOther.add(fullUrl.toLowerCase());
      result.otherGitHostings.push({
        platform,
        url: fullUrl,
        repoPath: `${owner}/${repo}`,
      });
    }
  }

  return result;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

function getGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Website-To-GitHub-Finder-App',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim() !== '') {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  }
  return headers;
}

interface GitHubRepoRaw {
  name: string;
  full_name: string;
  owner: {
    login: string;
    type: string;
  };
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
   pushed_at?: string;
  license: { spdx_id?: string; name?: string } | null;
  visibility?: string;
  private: boolean;
  homepage: string | null;
  topics?: string[];
  archived?: boolean;
  fork?: boolean;
}

async function fetchRepoDetails(owner: string, repo: string): Promise<{
  repo: GitHubRepoRaw | null;
  rateLimited: boolean;
}> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers: getGithubHeaders() }
    );
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        return { repo: null, rateLimited: true };
      }
    }
    if (!res.ok) return { repo: null, rateLimited: false };
    const data = (await res.json()) as GitHubRepoRaw;
    if (data.private) return { repo: null, rateLimited: false };
    return { repo: data, rateLimited: false };
  } catch {
    return { repo: null, rateLimited: false };
  }
}

async function searchGithubRepositories(query: string, perPage = 8): Promise<{
  items: GitHubRepoRaw[];
  rateLimited: boolean;
}> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      query
    )}&per_page=${perPage}`;
    const res = await fetch(url, { headers: getGithubHeaders() });
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        return { items: [], rateLimited: true };
      }
    }
    if (!res.ok) return { items: [], rateLimited: false };
    const data = await res.json();
    const items = Array.isArray(data?.items)
      ? (data.items as GitHubRepoRaw[]).filter((r) => !r.private)
      : [];
    return { items, rateLimited: false };
  } catch {
    return { items: [], rateLimited: false };
  }
}

async function fetchOrgTopRepos(org: string, perPage = 8): Promise<{
  items: GitHubRepoRaw[];
  rateLimited: boolean;
}> {
  try {
    const url = `https://api.github.com/users/${encodeURIComponent(
      org
    )}/repos?sort=pushed&per_page=${perPage}`;
    const res = await fetch(url, { headers: getGithubHeaders() });
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        return { items: [], rateLimited: true };
      }
    }
    if (!res.ok) return { items: [], rateLimited: false };
    const data = await res.json();
    const items = Array.isArray(data)
      ? (data as GitHubRepoRaw[]).filter((r) => !r.private)
      : [];
    return { items, rateLimited: false };
  } catch {
    return { items: [], rateLimited: false };
  }
}

async function checkReadmeMentionsDomain(
  owner: string,
  repo: string,
  domain: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/readme`,
      {
        headers: {
          ...getGithubHeaders(),
          Accept: 'application/vnd.github.raw+json',
        },
      }
    );
    if (!res.ok) return false;
    const text = (await res.text()).slice(0, 50000).toLowerCase();
    return text.includes(domain.toLowerCase());
  } catch {
    return false;
  }
}

function cleanHostnameTokens(domain: string): {
  baseName: string;
  cleanSlug: string;
  parts: string[];
} {
  const withoutWww = domain.replace(/^www\./i, '').toLowerCase();
  const segments = withoutWww.split('.');
  const baseName = segments.length >= 2 ? segments[segments.length - 2] : segments[0];
  const cleanSlug = withoutWww.replace(/[^a-z0-9]/g, '');
  return {
    baseName,
    cleanSlug,
    parts: segments.slice(0, -1),
  };
}

function normalizeHostFromUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let u = rawUrl.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }
  try {
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Scores a candidate repository against extracted website signals using the multi-signal algorithm.
 */
function scoreCandidateRepository(
  repo: GitHubRepoRaw,
  domain: string,
  signals: ExtractedSignals,
  readmeMentionsDomain: boolean
) {
  const evidences: Array<{
    label: string;
    points: number;
    category: 'strong' | 'medium' | 'weak';
    detail?: string;
  }> = [];

  const fullNameLower = repo.full_name.toLowerCase();
  const repoNameLower = repo.name.toLowerCase();
  const ownerLower = repo.owner.login.toLowerCase();
  const descLower = (repo.description || '').toLowerCase();
  const domainLower = domain.toLowerCase();
  const { baseName, cleanSlug } = cleanHostnameTokens(domainLower);

  // 1. VERY STRONG SIGNALS
  // +50 — Website directly links to GitHub repository
  if (signals.directGithubRepos.has(fullNameLower)) {
    evidences.push({
      label: 'Website directly links to this GitHub repository',
      points: 50,
      category: 'strong',
      detail: `Found direct reference to github.com/${repo.full_name} in website source`,
    });
  }

  // +30 — GitHub repository contains the exact website domain (in homepage field, repo name, or description)
  const repoHomepageHost = normalizeHostFromUrl(repo.homepage);
  const exactDomainInHomepage =
    repoHomepageHost !== null &&
    (repoHomepageHost === domainLower ||
      domainLower.endsWith('.' + repoHomepageHost) ||
      repoHomepageHost.endsWith('.' + domainLower));
  const exactDomainInName = repoNameLower === domainLower || repoNameLower === `${ownerLower}.github.io` && domainLower === `${ownerLower}.github.io`;
  const exactDomainInDesc = descLower.includes(domainLower);

  if (exactDomainInHomepage || exactDomainInName || exactDomainInDesc) {
    evidences.push({
      label: 'GitHub repository contains the exact website domain',
      points: 30,
      category: 'strong',
      detail: exactDomainInHomepage
        ? `Repository homepage URL matches ${domain}`
        : exactDomainInName
        ? `Repository name matches ${domain}`
        : `Repository description explicitly references ${domain}`,
    });
  }

  // +25 — Repository README references the exact website
  if (readmeMentionsDomain) {
    evidences.push({
      label: 'Repository README references the exact website',
      points: 25,
      category: 'strong',
      detail: `README file contains "${domain}"`,
    });
  }

  // +20 — Repository belongs to the same organization/company
  const orgLinkedOnSite = Array.from(signals.directGithubOrgs).some(
    (o) => o.toLowerCase() === ownerLower
  );
  const ownerMatchesBaseName =
    baseName.length >= 3 &&
    (ownerLower === baseName ||
      ownerLower === cleanSlug ||
      ownerLower.replace(/[-_]/g, '') === baseName.replace(/[-_]/g, ''));

  if (orgLinkedOnSite || ownerMatchesBaseName) {
    evidences.push({
      label: 'Repository belongs to the same organization/company',
      points: 20,
      category: 'strong',
      detail: orgLinkedOnSite
        ? `Organization @${repo.owner.login} is linked on the website`
        : `Repository owner @${repo.owner.login} matches domain identifier "${baseName}"`,
    });
  }

  // 2. MEDIUM SIGNALS
  // +15 — Repository name strongly matches website/project name
  const normalizedRepoName = repoNameLower.replace(/[._-]/g, '');
  const normalizedBaseName = baseName.replace(/[._-]/g, '');
  const siteBrand = (signals.ogSiteName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const strongNameMatch =
    repoNameLower === baseName ||
    repoNameLower === domainLower ||
    normalizedRepoName === cleanSlug ||
    (normalizedBaseName.length >= 3 && normalizedRepoName === normalizedBaseName) ||
    (siteBrand.length >= 3 && normalizedRepoName === siteBrand);

  if (strongNameMatch) {
    evidences.push({
      label: 'Repository name strongly matches website/project name',
      points: 15,
      category: 'medium',
      detail: `Repository "${repo.name}" matches project identifier`,
    });
  }

  // +10 — Repository description matches website
  if (repo.description && (signals.title || signals.description)) {
    const siteWords = new Set(
      `${signals.title || ''} ${signals.description || ''}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    );
    const descWords = descLower
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    const overlap = descWords.filter((w) => siteWords.has(w));
    if (overlap.length >= 2 || (baseName.length >= 4 && descLower.includes(baseName))) {
      evidences.push({
        label: 'Repository description matches website',
        points: 10,
        category: 'medium',
        detail: `Shared context keywords in description`,
      });
    }
  }

  // +10 — Technologies/frameworks match
  if (signals.detectedFrameworks.length > 0) {
    const repoTechPool = [
      repo.language || '',
      ...(repo.topics || []),
      repo.name,
      repo.description || '',
    ]
      .join(' ')
      .toLowerCase();

    const matchedTech = signals.detectedFrameworks.find((fw) =>
      repoTechPool.includes(fw.toLowerCase().replace('.js', ''))
    );

    if (matchedTech) {
      evidences.push({
        label: 'Technologies/frameworks match',
        points: 10,
        category: 'medium',
        detail: `Website and repository both align with ${matchedTech}`,
      });
    }
  }

  // 3. WEAK SIGNALS
  // +5 — Similar keywords (topics or repo tokens overlap with domain/site)
  const topics = (repo.topics || []).map((t) => t.toLowerCase());
  if (
    topics.some((t) => t.includes(baseName) || baseName.includes(t)) ||
    (baseName.length >= 4 && repoNameLower.includes(baseName) && !strongNameMatch)
  ) {
    evidences.push({
      label: 'Similar keywords',
      points: 5,
      category: 'weak',
      detail: 'Repository topics or naming share keywords with website',
    });
  }

  // +5 — Similar project title
  if (signals.title) {
    const titleLower = signals.title.toLowerCase();
    if (
      repoNameLower.length >= 4 &&
      titleLower.includes(repoNameLower.replace(/[-_.]/g, ' '))
    ) {
      evidences.push({
        label: 'Similar project title',
        points: 5,
        category: 'weak',
        detail: `Page title references "${repo.name}"`,
      });
    }
  }

  // Penalize third-party "awesome-*", unofficial clones, or tiny forks when not directly linked
  let rawScore = evidences.reduce((sum, e) => sum + e.points, 0);

  const isDirectlyLinked = signals.directGithubRepos.has(fullNameLower);
  if (!isDirectlyLinked) {
    if (
      repoNameLower.startsWith('awesome-') ||
      descLower.includes('unofficial') ||
      descLower.includes('clone of')
    ) {
      rawScore = Math.max(0, rawScore - 30);
    }
  }

  const confidence = Math.min(98, Math.max(0, rawScore));
  let confidenceLabel: 'Very likely' | 'Possible match' | 'Unlikely' = 'Unlikely';
  if (confidence >= 70) {
    confidenceLabel = 'Very likely';
  } else if (confidence >= 40) {
    confidenceLabel = 'Possible match';
  }

  return {
    confidence,
    confidenceLabel,
    signals: evidences,
  };
}

const STOP_WORDS = new Set([
  'this',
  'that',
  'with',
  'from',
  'your',
  'have',
  'more',
  'will',
  'home',
  'page',
  'site',
  'website',
  'official',
  'welcome',
  'platform',
  'application',
  'built',
  'using',
  'open',
  'source',
  'free',
  'modern',
  'fast',
  'best',
]);

/**
 * POST /api/analyze
 * Main pipeline endpoint to discover public GitHub repositories behind a website.
 */
app.post('/api/analyze', async (req, res) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const now = Date.now();
  const rateRecord = rateLimitMap.get(clientIp);
  if (rateRecord && now < rateRecord.resetAt) {
    if (rateRecord.count >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        website: req.body?.url || '',
        status: 'rate_limited',
        confidence: 0,
        message:
          'Rate limit reached (maximum 25 analyses per 15 minutes). Please wait a few minutes before trying again.',
        repositories: [],
        rateLimitRemaining: 0,
      });
    }
    rateRecord.count += 1;
  } else {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  const remainingRequests = Math.max(
    0,
    RATE_LIMIT_MAX - (rateLimitMap.get(clientIp)?.count || 1)
  );

  const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const pipelineSteps: string[] = [];

  // Step 1-3: Validate URL, Normalize Domain, Check Security Restrictions
  const validation = await validateAndNormalizeUrl(rawUrl);
  if (!validation.valid || !validation.url || !validation.domain) {
    return res.status(400).json({
      website: rawUrl,
      status: 'invalid_url',
      confidence: 0,
      message: validation.reason || 'Invalid or restricted URL submitted.',
      repositories: [],
      rateLimitRemaining: remainingRequests,
    });
  }

  const targetUrl = validation.url;
  const domain = validation.domain;
  pipelineSteps.push(`Validated URL & verified DNS safety for ${domain}`);

  // Check cache unless forceRefresh is passed
  const cacheKey = domain.toLowerCase();
  if (!req.body?.forceRefresh) {
    const cached = analysisCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return res.json({
        ...cached.data,
        cached: true,
        rateLimitRemaining: remainingRequests,
      });
    }
  }

  try {
    // Step 4: Fetch publicly accessible website HTML
    const fetchResult = await safeFetchHtml(targetUrl);
    if (fetchResult.ok) {
      pipelineSteps.push('Fetched publicly accessible website HTML & metadata');
    } else if (fetchResult.warning) {
      pipelineSteps.push(fetchResult.warning);
    }

    // Step 5-7: Extract metadata, direct GitHub links, and project/company identifiers
    const extracted = extractSignalsFromHtml(fetchResult.html, domain);

    if (extracted.directGithubRepos.size > 0) {
      pipelineSteps.push(
        `Detected ${extracted.directGithubRepos.size} direct GitHub repository link(s) on page`
      );
    }
    if (extracted.otherGitHostings.length > 0) {
      pipelineSteps.push(
        `Detected ${extracted.otherGitHostings.length} alternative Git hosting link(s) (${extracted.otherGitHostings
          .map((o) => o.platform)
          .join(', ')})`
      );
    }

    // Step 8-9: Retrieve candidate repositories via GitHub REST API
    const candidateMap = new Map<string, GitHubRepoRaw>();
    let githubRateLimited = false;

    // 8a. Fetch directly linked GitHub repositories first
    const directEntries = Array.from(extracted.directGithubRepos.values()).slice(0, 6);
    const directPromises = directEntries.map((entry) =>
      fetchRepoDetails(entry.owner, entry.repo)
    );
    const directResults = await Promise.all(directPromises);
    for (const r of directResults) {
      if (r.rateLimited) githubRateLimited = true;
      if (r.repo) {
        candidateMap.set(r.repo.full_name.toLowerCase(), r.repo);
      }
    }

    // 8b. Fetch repositories from directly linked GitHub organizations
    const orgsToCheck = new Set<string>(extracted.directGithubOrgs);
    const { baseName } = cleanHostnameTokens(domain);

    // Also check if the domain baseName itself is a GitHub org/user with matching repos (only for non-generic domains)
    const genericDomains = new Set(['example', 'test', 'sample', 'localhost', 'demo']);
    if (baseName.length >= 3 && !genericDomains.has(baseName)) {
      orgsToCheck.add(baseName);
    }

    const orgList = Array.from(orgsToCheck).slice(0, 2);
    const orgPromises = orgList.map((org) => fetchOrgTopRepos(org, 10));
    const orgResults = await Promise.all(orgPromises);
    for (const r of orgResults) {
      if (r.rateLimited) githubRateLimited = true;
      for (const repo of r.items) {
        const key = repo.full_name.toLowerCase();
        if (!candidateMap.has(key)) {
          candidateMap.set(key, repo);
        }
      }
    }

    // 8c. Search GitHub API by exact domain and project name if not generic example.com
    if (!genericDomains.has(baseName)) {
      const searchQueries: string[] = [`"${domain}" in:readme,description`];
      if (baseName.length >= 3) {
        searchQueries.push(`${baseName} in:name`);
      }

      const searchPromises = searchQueries.map((q) => searchGithubRepositories(q, 8));
      const searchResults = await Promise.all(searchPromises);
      for (const sr of searchResults) {
        if (sr.rateLimited) githubRateLimited = true;
        for (const repo of sr.items) {
          const key = repo.full_name.toLowerCase();
          if (!candidateMap.has(key)) {
            candidateMap.set(key, repo);
          }
        }
      }
      pipelineSteps.push(
        `Queried GitHub Search API across ${candidateMap.size} candidate repositories`
      );
    }

    // If GitHub API rate-limited us and we found zero candidates, report rate_limited
    if (githubRateLimited && candidateMap.size === 0) {
      return res.status(429).json({
        website: targetUrl.toString(),
        normalizedDomain: domain,
        status: 'rate_limited',
        confidence: 0,
        message:
          'GitHub public API rate limit reached. Configure a GITHUB_TOKEN environment variable or wait briefly before retrying.',
        repositories: [],
        otherGitHostings: extracted.otherGitHostings,
        rateLimitRemaining: remainingRequests,
      });
    }

    // Step 10: Check README mentions for top promising candidates (up to 4)
    const candidatesArray = Array.from(candidateMap.values());
    const readmeCheckMap = new Map<string, boolean>();

    const topForReadmeCheck = candidatesArray
      .filter((r) => {
        const fn = r.full_name.toLowerCase();
        const hp = normalizeHostFromUrl(r.homepage);
        return (
          extracted.directGithubRepos.has(fn) ||
          hp === domain ||
          r.owner.login.toLowerCase() === baseName ||
          r.name.toLowerCase().includes(baseName)
        );
      })
      .slice(0, 4);

    await Promise.all(
      topForReadmeCheck.map(async (r) => {
        const mentions = await checkReadmeMentionsDomain(r.owner.login, r.name, domain);
        readmeCheckMap.set(r.full_name.toLowerCase(), mentions);
      })
    );

    // Step 11-12: Score and rank candidates
    const scoredCandidates = candidatesArray
      .map((repo) => {
        const key = repo.full_name.toLowerCase();
        const readmeMentions = readmeCheckMap.get(key) || false;
        const scoreResult = scoreCandidateRepository(
          repo,
          domain,
          extracted,
          readmeMentions
        );

        return {
          name: repo.name,
          owner: repo.owner.login,
          fullName: repo.full_name,
          url: repo.html_url,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          updatedAt: repo.pushed_at || repo.updated_at,
          license:
            repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION'
              ? repo.license.spdx_id
              : repo.license?.name || null,
          visibility: repo.visibility || (repo.private ? 'private' : 'public'),
          homepage: repo.homepage || null,
          topics: repo.topics || [],
          confidence: scoreResult.confidence,
          confidenceLabel: scoreResult.confidenceLabel,
          isBestMatch: false,
          signals: scoreResult.signals,
        };
      })
      // Step 13: Return only reasonable matches (must have >= 35 confidence AND at least one strong or meaningful medium signal, never present weak-only matches)
      .filter((c) => {
        const hasStrongOrMedium = c.signals.some(
          (s) => s.category === 'strong' || s.points >= 15
        );
        return c.confidence >= 40 && hasStrongOrMedium;
      })
      .sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.stars - a.stars;
      })
      .slice(0, 6);

    if (scoredCandidates.length > 0) {
      scoredCandidates[0].isBestMatch = true;
    }

    const topConfidence = scoredCandidates.length > 0 ? scoredCandidates[0].confidence : 0;
    const topLabel =
      scoredCandidates.length > 0 ? scoredCandidates[0].confidenceLabel : 'Unlikely';

    let status: 'found' | 'possible_match' | 'not_found' = 'not_found';
    if (topConfidence >= 70) {
      status = 'found';
    } else if (topConfidence >= 40) {
      status = 'possible_match';
    } else {
      status = 'not_found';
    }

    const responsePayload = {
      website: targetUrl.toString(),
      normalizedDomain: domain,
      status,
      confidence: topConfidence,
      confidenceLabel: topLabel,
      message:
        status === 'not_found'
          ? 'No public GitHub repository could be reliably identified for this website.'
          : undefined,
      repositories: scoredCandidates,
      otherGitHostings: extracted.otherGitHostings,
      websiteMetadata: {
        normalizedUrl: fetchResult.finalUrl || targetUrl.toString(),
        domain,
        title: extracted.title,
        description: extracted.description,
        ogTitle: extracted.ogTitle,
        ogDescription: extracted.ogDescription,
        ogImage: extracted.ogImage,
        generator: extracted.generator,
        author: extracted.author,
        detectedFrameworks: extracted.detectedFrameworks,
        directGithubUrls: Array.from(extracted.directGithubRepos.values()).map(
          (d) => `https://github.com/${d.owner}/${d.repo}`
        ),
        fetchSuccess: fetchResult.ok,
        fetchWarning: fetchResult.warning,
      },
      pipelineSteps,
      cached: false,
      rateLimitRemaining: remainingRequests,
    };

    analysisCache.set(cacheKey, {
      data: responsePayload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res.json(responsePayload);
  } catch (err: any) {
    return res.status(500).json({
      website: targetUrl.toString(),
      normalizedDomain: domain,
      status: 'error',
      confidence: 0,
      message: 'An unexpected error occurred while analyzing the website.',
      repositories: [],
      rateLimitRemaining: remainingRequests,
    });
  }
});

// SEO: robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl =
    process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl.replace(
      /\/$/,
      ''
    )}/sitemap.xml\n`
  );
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = (
    process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`
  ).replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// In-memory store for user queries directed to ohmllghothak@gmail.com
interface UserQuerySubmission {
  id: string;
  name: string;
  email: string;
  websiteUrl?: string;
  subject: string;
  message: string;
  developerEmail: string;
  submittedAt: string;
}
const submittedQueries: UserQuerySubmission[] = [];

app.post('/api/query', (req, res) => {
  const { name, email, websiteUrl, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({
      ok: false,
      error: 'Please provide your name, email address, and query message.',
    });
  }
  const submission: UserQuerySubmission = {
    id: `q-${Date.now()}`,
    name: String(name).trim().slice(0, 120),
    email: String(email).trim().slice(0, 150),
    websiteUrl: websiteUrl ? String(websiteUrl).trim().slice(0, 300) : undefined,
    subject: subject ? String(subject).trim().slice(0, 200) : 'Website -> GitHub Finder Query',
    message: String(message).trim().slice(0, 2500),
    developerEmail: 'ohmllghothak@gmail.com',
    submittedAt: new Date().toISOString(),
  };
  submittedQueries.unshift(submission);
  return res.json({
    ok: true,
    submission,
    message: 'Your query has been logged and prepared for developer ohmllghothak@gmail.com.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Website -> GitHub Finder running on http://localhost:${PORT}`);
  });
}

startServer();
