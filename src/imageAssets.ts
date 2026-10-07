import heroSourceDiscoveryImg from './assets/images/hero_source_discovery_1791382394317.jpg';
import analyzerSignalRadarImg from './assets/images/analyzer_signal_radar_1791382414629.jpg';
import directoryArchiveShowcaseImg from './assets/images/directory_archive_showcase_1791382431169.jpg';
import securityVerificationVaultImg from './assets/images/security_verification_vault_1791382445931.jpg';

export const BUNDLED_SHOWCASE_IMAGES = {
  heroObservatory: heroSourceDiscoveryImg,
  signalRadar: analyzerSignalRadarImg,
  directoryArchive: directoryArchiveShowcaseImg,
  securityVault: securityVerificationVaultImg,
};

/**
 * Free, open-source high-resolution fallback photography (Unsplash CDN)
 * used automatically if any image fails to load in any environment.
 */
export const FREE_SOURCE_FALLBACK_IMAGES = {
  heroObservatory:
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  signalRadar:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  directoryArchive:
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
  securityVault:
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
};
