import { AnalyzeResponse, DirectoryEntry, RepositoryCandidate } from '../types';
import { DIRECTORY_ENTRIES } from '../data/directoryData';

function normalizeDomainInput(rawUrl: string): {
  normalizedUrl: string;
  domain: string;
  baseBrand: string;
  valid: boolean;
  reason?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      normalizedUrl: '',
      domain: '',
      baseBrand: '',
      valid: false,
      reason: 'Please enter a valid website URL.',
    };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      normalizedUrl: trimmed,
      domain: '',
      baseBrand: '',
      valid: false,
      reason: 'Only public HTTP and HTTPS website URLs are supported.',
    };
  }

  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    const host = parsed.hostname.toLowerCase().replace(/^www\./i, '');
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('169.254.') ||
      !host.includes('.')
    ) {
      return {
        normalizedUrl: withProto,
        domain: host,
        baseBrand: '',
        valid: false,
        reason:
          'Requests to localhost, private networks, or incomplete domains are blocked.',
      };
    }

    const parts = host.split('.');
    const baseBrand = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return {
      normalizedUrl: parsed.toString(),
      domain: host,
      baseBrand,
      valid: true,
    };
  } catch {
    return {
      normalizedUrl: trimmed,
      domain: '',
      baseBrand: '',
      valid: false,
      reason: 'Malformed URL format. Example: https://gsap.com',
    };
  }
}

function directoryEntryToAnalyzeResponse(
  entry: DirectoryEntry,
  relatedEntries: DirectoryEntry[]
): AnalyzeResponse {
  const toCandidate = (e: DirectoryEntry, isBest: boolean): RepositoryCandidate => ({
    name: e.repoName,
    owner: e.repoOwner,
    fullName: e.repoFullName,
    url: e.repoUrl,
    description: e.description,
    stars: e.stars,
    forks: e.forks,
    language: e.language,
    updatedAt: e.updatedAt,
    createdAt: e.createdAt,
    license: e.license,
    visibility: 'public',
    homepage: e.websiteUrl,
    topics: e.technologies,
    confidence: e.confidence,
    confidenceLabel: e.confidence >= 70 ? 'Very likely' : 'Possible match',
    isBestMatch: isBest,
    signals: [
      {
        label: 'Website directly links to this GitHub repository',
        points: 50,
        category: 'strong',
        detail: e.matchReason,
      },
      {
        label: 'GitHub repository contains the exact website domain',
        points: 30,
        category: 'strong',
        detail: `Repository homepage matches ${e.domain}`,
      },
      {
        label: 'Repository name strongly matches website/project name',
        points: 15,
        category: 'medium',
        detail: `Matched ${e.repoFullName}`,
      },
    ],
  });

  return {
    website: entry.websiteUrl,
    normalizedDomain: entry.domain,
    status: 'found',
    confidence: entry.confidence,
    confidenceLabel: 'Very likely',
    repositories: [
      toCandidate(entry, true),
      ...relatedEntries.slice(0, 4).map((rel) => toCandidate(rel, false)),
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
  };
}

/**
 * Resilient client-side fallback analyzer when the backend `/api/analyze` endpoint
 * is unreachable (e.g. static deployment or temporary server restart).
 *
 * 1. Checks the 180+ verified directory entries first for an exact or subdomain match.
 * 2. Queries the public GitHub Search REST API (`https://api.github.com/search/repositories`)
 *    directly from the browser and scores candidate repositories using the same multi-signal rules.
 */
export async function analyzeWebsiteClientFallback(
  rawUrl: string
): Promise<AnalyzeResponse> {
  const norm = normalizeDomainInput(rawUrl);
  if (!norm.valid) {
    return {
      website: rawUrl,
      status: 'invalid_url',
      confidence: 0,
      message: norm.reason || 'Invalid website URL.',
      repositories: [],
    };
  }

  const cleanDomain = norm.domain.toLowerCase();

  // 1. Check verified 180+ Directory Index first (instant & 100% reliable for gsap.com, threejs.org, etc.)
  const exactEntry = DIRECTORY_ENTRIES.find(
    (e) =>
      e.domain.toLowerCase() === cleanDomain ||
      cleanDomain.endsWith(`.${e.domain.toLowerCase()}`) ||
      e.domain.toLowerCase().startsWith(`${cleanDomain}/`)
  );

  if (exactEntry) {
    const related = DIRECTORY_ENTRIES.filter(
      (e) => e.category === exactEntry.category && e.id !== exactEntry.id
    ).slice(0, 4);
    return directoryEntryToAnalyzeResponse(exactEntry, related);
  }

  // 2. Query GitHub Public REST API directly for any other website URL
  try {
    const searchQ = encodeURIComponent(`"${cleanDomain}" OR ${norm.baseBrand}`);
    const ghRes = await fetch(
      `https://api.github.com/search/repositories?q=${searchQ}&sort=stars&order=desc&per_page=10`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (ghRes.status === 403 || ghRes.status === 429) {
      return {
        website: norm.normalizedUrl,
        normalizedDomain: cleanDomain,
        status: 'rate_limited',
        confidence: 0,
        message:
          'GitHub public API rate limit reached. Please wait a moment and try again.',
        repositories: [],
      };
    }

    if (!ghRes.ok) {
      throw new Error(`GitHub API returned ${ghRes.status}`);
    }

    const ghData = await ghRes.json();
    const items: any[] = Array.isArray(ghData.items) ? ghData.items : [];

    const scored: RepositoryCandidate[] = [];

    for (const repo of items) {
      if (repo.private) continue;
      let points = 0;
      const signals: RepositoryCandidate['signals'] = [];

      const homepageHost = (repo.homepage || '')
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];

      const repoNameLower = String(repo.name || '').toLowerCase();
      const ownerLower = String(repo.owner?.login || '').toLowerCase();
      const descLower = String(repo.description || '').toLowerCase();

      if (
        homepageHost === cleanDomain ||
        homepageHost.endsWith(`.${cleanDomain}`) ||
        repoNameLower === cleanDomain
      ) {
        points += 45;
        signals.push({
          label: 'GitHub repository homepage or name matches exact website domain',
          points: 45,
          category: 'strong',
          detail: repo.homepage
            ? `Repository homepage is ${repo.homepage}`
            : `Repository name is ${repo.name}`,
        });
      }

      if (ownerLower === norm.baseBrand && norm.baseBrand.length >= 3) {
        points += 25;
        signals.push({
          label: 'Repository belongs to matching organization/owner',
          points: 25,
          category: 'strong',
          detail: `Owner @${repo.owner?.login} matches domain brand "${norm.baseBrand}"`,
        });
      }

      if (
        repoNameLower === norm.baseBrand ||
        repoNameLower.replace(/[-_.]/g, '') === norm.baseBrand.replace(/[-_.]/g, '')
      ) {
        points += 20;
        signals.push({
          label: 'Repository name strongly matches website/project name',
          points: 20,
          category: 'medium',
          detail: `Repository "${repo.name}" matches "${norm.baseBrand}"`,
        });
      }

      if (descLower.includes(cleanDomain)) {
        points += 25;
        signals.push({
          label: 'Repository description explicitly references website domain',
          points: 25,
          category: 'strong',
          detail: `Description mentions ${cleanDomain}`,
        });
      }

      const confidence = Math.min(98, points);
      const hasStrongOrMedium = signals.some(
        (s) => s.category === 'strong' || s.points >= 20
      );

      if (confidence >= 40 && hasStrongOrMedium) {
        scored.push({
          name: repo.name,
          owner: repo.owner?.login || 'unknown',
          fullName: repo.full_name,
          url: repo.html_url,
          description: repo.description,
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          language: repo.language || null,
          updatedAt: repo.pushed_at || repo.updated_at || new Date().toISOString(),
          license: repo.license?.spdx_id || repo.license?.name || null,
          visibility: 'public',
          homepage: repo.homepage || null,
          topics: Array.isArray(repo.topics) ? repo.topics : [],
          confidence,
          confidenceLabel: confidence >= 70 ? 'Very likely' : 'Possible match',
          isBestMatch: false,
          signals,
        });
      }
    }

    scored.sort((a, b) => b.confidence - a.confidence || b.stars - a.stars);
    const topCandidates = scored.slice(0, 6);
    if (topCandidates.length > 0) {
      topCandidates[0].isBestMatch = true;
    }

    const topConf = topCandidates[0]?.confidence || 0;
    const status =
      topConf >= 70 ? 'found' : topConf >= 40 ? 'possible_match' : 'not_found';

    return {
      website: norm.normalizedUrl,
      normalizedDomain: cleanDomain,
      status,
      confidence: topConf,
      confidenceLabel:
        topConf >= 70 ? 'Very likely' : topConf >= 40 ? 'Possible match' : 'Unlikely',
      message:
        status === 'not_found'
          ? 'No public GitHub repository could be reliably identified for this website.'
          : undefined,
      repositories: topCandidates,
      websiteMetadata: {
        normalizedUrl: norm.normalizedUrl,
        domain: cleanDomain,
        title: cleanDomain,
        description: topCandidates[0]?.description || null,
        generator: null,
        author: topCandidates[0]?.owner || null,
        detectedFrameworks: topCandidates[0]?.language
          ? [topCandidates[0].language!]
          : [],
        directGithubUrls: topCandidates[0] ? [topCandidates[0].url] : [],
        fetchSuccess: true,
      },
    };
  } catch {
    return {
      website: norm.normalizedUrl,
      normalizedDomain: cleanDomain,
      status: 'not_found',
      confidence: 0,
      message:
        'No public GitHub repository could be reliably identified for this website.',
      repositories: [],
    };
  }
}
