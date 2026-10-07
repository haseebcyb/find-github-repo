export type AnalysisStatus =
  | 'found'
  | 'possible_match'
  | 'not_found'
  | 'invalid_url'
  | 'rate_limited'
  | 'error';

export interface SignalEvidence {
  label: string;
  points: number;
  category: 'strong' | 'medium' | 'weak';
  detail?: string;
}

export interface RepositoryCandidate {
  name: string;
  owner: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  createdAt?: string;
  license: string | null;
  visibility: string;
  homepage: string | null;
  topics: string[];
  confidence: number;
  confidenceLabel: 'Very likely' | 'Possible match' | 'Unlikely';
  isBestMatch: boolean;
  signals: SignalEvidence[];
}

export interface OtherGitHostingMatch {
  platform: 'GitLab' | 'Bitbucket' | 'Codeberg';
  url: string;
  repoPath: string;
}

export interface WebsiteMetadataSummary {
  normalizedUrl: string;
  domain: string;
  title: string | null;
  description: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  generator: string | null;
  author: string | null;
  detectedFrameworks: string[];
  directGithubUrls: string[];
  fetchSuccess: boolean;
  fetchWarning?: string;
}

export interface AnalyzeResponse {
  website: string;
  normalizedDomain?: string;
  status: AnalysisStatus;
  confidence: number;
  confidenceLabel?: 'Very likely' | 'Possible match' | 'Unlikely';
  message?: string;
  repositories: RepositoryCandidate[];
  otherGitHostings?: OtherGitHostingMatch[];
  websiteMetadata?: WebsiteMetadataSummary;
  pipelineSteps?: string[];
  cached?: boolean;
  rateLimitRemaining?: number;
}

export interface SearchHistoryItem {
  id: string;
  url: string;
  domain: string;
  status: AnalysisStatus;
  confidence: number;
  topRepoFullName?: string;
  otherPlatform?: string;
  timestamp: number;
  cachedResult: AnalyzeResponse;
}

export type CategorySlug =
  | 'threejs-3d'
  | 'frontend-animation'
  | 'ui-ux-design'
  | 'saas'
  | 'ai'
  | 'developer-tools'
  | 'e-commerce'
  | 'portfolio'
  | 'agency'
  | 'education'
  | 'finance'
  | 'healthcare'
  | 'news-media'
  | 'documentation'
  | 'open-source'
  | 'landing-pages'
  | 'blogs'
  | 'communities'
  | 'productivity'
  | 'dashboards'
  | 'games';

export interface CategoryDefinition {
  slug: CategorySlug;
  title: string;
  shortDescription: string;
  featuredDomains: string[];
}

export interface DirectoryEntry {
  id: string;
  slug: string;
  websiteName: string;
  websiteUrl: string;
  domain: string;
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  repoUrl: string;
  description: string;
  primaryTechnology: string;
  technologies: string[];
  language: string;
  category: CategorySlug;
  categoryLabel: string;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  license: string;
  visibility: 'public';
  confidence: number;
  matchReason: string;
  featured?: boolean;
  popular?: boolean;
  trending?: boolean;
}
