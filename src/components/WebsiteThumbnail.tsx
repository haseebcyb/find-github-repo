import React, { useState, useMemo } from 'react';

interface WebsiteThumbnailProps {
  domain: string;
  websiteName: string;
  repoOwner?: string;
  repoName?: string;
  primaryTechnology?: string;
  language?: string;
  customImageUrl?: string | null;
  className?: string;
}

/**
 * Generates a crisp, zero-network-dependency SVG data URI preview card
 * for any website and GitHub repository so thumbnails NEVER appear blank or broken,
 * even when external image CDNs are rate-limited or offline.
 */
function buildInstantSvgPreviewDataUri(params: {
  domain: string;
  websiteName: string;
  repoOwner?: string;
  repoName?: string;
  primaryTechnology?: string;
  language?: string;
}): string {
  const safeDomain = (params.domain || 'website.app').replace(/[<>&"']/g, '');
  const safeName = (params.websiteName || safeDomain)
    .replace(/[<>&"']/g, '')
    .slice(0, 28);
  const safeRepo =
    params.repoOwner && params.repoName
      ? `${params.repoOwner}/${params.repoName}`.replace(/[<>&"']/g, '').slice(0, 34)
      : 'Verified Public Repository';
  const safeTech = (params.primaryTechnology || params.language || 'Open Source')
    .replace(/[<>&"']/g, '')
    .slice(0, 22);
  const safeLang = (params.language || 'Git').replace(/[<>&"']/g, '').slice(0, 16);

  // Pick a deterministic accent palette from domain hash
  let hash = 0;
  for (let i = 0; i < safeDomain.length; i++) {
    hash = (hash * 31 + safeDomain.charCodeAt(i)) | 0;
  }
  const palettes = [
    { bar: '#8B0000', badge: '#1E3A8A', bg: '#090D16' },
    { bar: '#1E3A8A', badge: '#8B0000', bg: '#0F172A' },
    { bar: '#991B1B', badge: '#1D4ED8', bg: '#111827' },
  ];
  const pal = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
    <defs>
      <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1E293B" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="640" height="360" fill="${pal.bg}"/>
    <rect width="640" height="360" fill="url(#g)" opacity="0.85"/>
    <rect x="0" y="0" width="640" height="8" fill="${pal.bar}"/>
    <rect x="28" y="30" width="584" height="300" rx="6" fill="#0F172A" stroke="#334155" stroke-width="2"/>
    <rect x="28" y="30" width="584" height="36" rx="6" fill="#1E293B"/>
    <circle cx="48" cy="48" r="5" fill="#EF4444"/>
    <circle cx="64" cy="48" r="5" fill="#F59E0B"/>
    <circle cx="80" cy="48" r="5" fill="#10B981"/>
    <text x="100" y="53" fill="#CBD5E1" font-family="monospace" font-size="13" font-weight="bold">https://${safeDomain}</text>
    <rect x="52" y="92" width="176" height="24" rx="3" fill="${pal.bar}"/>
    <text x="62" y="108" fill="#FFFFFF" font-family="monospace" font-size="11" font-weight="bold">PUBLIC GITHUB SOURCE</text>
    <text x="52" y="162" fill="#FFFFFF" font-family="Georgia, serif" font-size="30" font-weight="bold">${safeName}</text>
    <text x="52" y="196" fill="#93C5FD" font-family="monospace" font-size="15" font-weight="bold">github.com/${safeRepo}</text>
    <line x1="52" y1="252" x2="588" y2="252" stroke="#334155" stroke-width="1.5"/>
    <rect x="52" y="268" width="160" height="30" rx="3" fill="${pal.badge}"/>
    <text x="64" y="288" fill="#FFFFFF" font-family="monospace" font-size="12" font-weight="bold">${safeTech}</text>
    <text x="588" y="288" text-anchor="end" fill="#F8FAFC" font-family="monospace" font-size="13" font-weight="bold">${safeLang} · VERIFIED</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Renders a multi-tier resilient Website + GitHub Repository preview image:
 * 1. Always renders an instant SVG architectural preview canvas underneath so there is NEVER a blank box.
 * 2. Overlays the official GitHub OpenGraph card (`opengraph.githubassets.com`) or website screenshot (`image.thum.io`) when loaded.
 * 3. Includes the website's live favicon in the top browser bar.
 */
export const WebsiteThumbnail: React.FC<WebsiteThumbnailProps> = ({
  domain,
  websiteName,
  repoOwner,
  repoName,
  primaryTechnology,
  language,
  customImageUrl,
  className = '',
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const cleanDomain = (domain || '').replace(/^https?:\/\//i, '').split('/')[0];

  React.useEffect(() => {
    setSourceIndex(0);
    setRemoteLoaded(false);
    setFaviconError(false);
  }, [cleanDomain, repoOwner, repoName, customImageUrl]);

  // Candidate remote image sources in priority order
  const imageCandidates = useMemo(() => {
    const list: string[] = [];
    if (customImageUrl && /^https?:\/\//i.test(customImageUrl)) {
      list.push(customImageUrl);
    }
    if (repoOwner && repoName) {
      list.push(
        `https://opengraph.githubassets.com/1/${encodeURIComponent(
          repoOwner
        )}/${encodeURIComponent(repoName)}`
      );
    }
    if (cleanDomain) {
      list.push(`https://image.thum.io/get/width/640/crop/360/noanimate/https://${cleanDomain}`);
    }
    return list;
  }, [customImageUrl, repoOwner, repoName, cleanDomain]);

  const fallbackSvgUri = useMemo(
    () =>
      buildInstantSvgPreviewDataUri({
        domain: cleanDomain || domain,
        websiteName,
        repoOwner,
        repoName,
        primaryTechnology,
        language,
      }),
    [cleanDomain, domain, websiteName, repoOwner, repoName, primaryTechnology, language]
  );

  const activeRemoteSrc =
    sourceIndex < imageCandidates.length ? imageCandidates[sourceIndex] : null;

  const faviconUrl = cleanDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`
    : null;

  return (
    <div
      className={`relative overflow-hidden bg-slate-950 border-b-2 border-slate-900 aspect-[16/9] select-none ${className}`}
    >
      {/* Top Browser / Terminal Bar Framing with Live Website Favicon */}
      <div className="h-7 px-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-[11px] font-mono text-slate-800">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-[#8B0000] inline-block shrink-0" />
          <span className="w-2 h-2 rounded-full bg-blue-800 inline-block shrink-0" />
          {faviconUrl && !faviconError && (
            <img
              src={faviconUrl}
              alt=""
              width={14}
              height={14}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFaviconError(true)}
              className="w-3.5 h-3.5 rounded-xs object-contain ml-1 shrink-0"
            />
          )}
          <span className="ml-1 truncate font-bold text-slate-950">{domain}</span>
        </div>
        {repoOwner && repoName && (
          <span className="text-[10px] font-bold text-blue-900 truncate ml-2">
            {repoOwner}/{repoName}
          </span>
        )}
      </div>

      {/* Main Viewport Area */}
      <div className="relative w-full h-[calc(100%-1.75rem)] bg-slate-950">
        {/* Layer 1: Always-present instant SVG preview card (never fails in production) */}
        <img
          src={fallbackSvgUri}
          alt={`${websiteName} (${domain}) preview`}
          className="w-full h-full object-cover object-center block"
        />

        {/* Layer 2: Live GitHub OpenGraph / Website Screenshot Overlay when available */}
        {activeRemoteSrc && (
          <img
            key={activeRemoteSrc}
            src={activeRemoteSrc}
            alt={`${websiteName} (${domain}) — public GitHub repository ${
              repoOwner && repoName ? `${repoOwner}/${repoName}` : 'preview'
            }`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setRemoteLoaded(true)}
            onError={() => {
              setRemoteLoaded(false);
              setSourceIndex((prev) => prev + 1);
            }}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-200 bg-white ${
              remoteLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
    </div>
  );
};
