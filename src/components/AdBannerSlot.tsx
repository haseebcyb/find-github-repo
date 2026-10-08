import React, { useState, useEffect, useRef } from 'react';

interface AdBannerSlotProps {
  position: 'left' | 'right' | 'inline' | 'top';
  stackCount?: number;
  onInquireClick?: () => void;
}

export const AD_UNITS = {
  domain: 'findgithubrepo.vercel.app',
  skyscraper160x600: {
    name: 'Banner 160x600',
    unitId: '31626365',
    key: '8598d7eec91f5c98557c69c7a1238a3f',
    scriptUrl: 'https://bicea.org/22/8598d7eec91f5c98557c69c7a1238a3f',
    width: 160,
    height: 600,
  },
  leaderboard728x90: {
    name: 'Banner 728x90',
    unitId: '31626366',
    key: 'cc6fba8235a43953fbadb92601335cdb',
    scriptUrl: 'https://bicea.org/22/cc6fba8235a43953fbadb92601335cdb',
    width: 728,
    height: 90,
  },
} as const;

function buildAdIframeSrcDoc(config: {
  key: string;
  scriptUrl: string;
  width: number;
  height: number;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key' : '${config.key}',
        'format' : 'iframe',
        'height' : ${config.height},
        'width' : ${config.width},
        'params' : {}
      };
    </script>
    <script type="text/javascript" src="${config.scriptUrl}"></script>
  </body>
</html>`;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  position,
  stackCount,
}) => {
  const asideRef = useRef<HTMLElement | null>(null);
  const [mainHeight, setMainHeight] = useState<number>(0);

  useEffect(() => {
    if (position === 'inline' || position === 'top') return;

    const updateSlotsForHeight = () => {
      const parentEl = asideRef.current?.parentElement?.parentElement;
      const mainEl = parentEl?.querySelector('main');
      if (!mainEl) return;

      const measuredHeight = Math.floor(mainEl.getBoundingClientRect().height);
      if (measuredHeight > 0) {
        setMainHeight(measuredHeight);
      }
    };

    updateSlotsForHeight();
    const timer = setInterval(updateSlotsForHeight, 400);
    window.addEventListener('resize', updateSlotsForHeight);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', updateSlotsForHeight);
    };
  }, [position]);

  if (position === 'inline' || position === 'top') {
    const unit = AD_UNITS.leaderboard728x90;
    const srcDoc = buildAdIframeSrcDoc(unit);

    return (
      <aside
        aria-label="Advertisement"
        data-ad-domain={AD_UNITS.domain}
        data-ad-unit-id={unit.unitId}
        data-ad-key={unit.key}
        data-ad-size="728x90"
        className={`${
          position === 'top' ? 'mt-4 mb-2' : 'my-3'
        } flex items-center justify-center`}
      >
        <div
          id={`ad-unit-${unit.unitId}-${position}`}
          data-zone-id={unit.unitId}
          className="w-full max-w-[728px] min-h-[90px] overflow-hidden flex items-center justify-center"
        >
          <iframe
            title={`Ad ${unit.unitId}`}
            srcDoc={srcDoc}
            width={unit.width}
            height={unit.height}
            scrolling="no"
            frameBorder={0}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            className="w-[728px] h-[90px] max-w-full border-0 shrink-0 block"
          />
        </div>
      </aside>
    );
  }

  const skyUnit = AD_UNITS.skyscraper160x600;
  const skySrcDoc = buildAdIframeSrcDoc(skyUnit);

  // Use Math.floor so side ad columns NEVER exceed the main content height or push the footer down
  const fittedCount =
    mainHeight > 0
      ? Math.max(1, Math.min(20, Math.floor((mainHeight - 24) / 616)))
      : 2;
  const countToRender = stackCount || fittedCount;
  const slots = Array.from({ length: countToRender }, (_, idx) => idx);

  return (
    <aside
      ref={asideRef}
      aria-label="Advertisement"
      data-ad-domain={AD_UNITS.domain}
      data-ad-unit-id={skyUnit.unitId}
      data-ad-key={skyUnit.key}
      data-ad-size="160x600"
      data-ad-slot-position={position}
      style={mainHeight > 0 ? { maxHeight: `${mainHeight}px` } : undefined}
      className="w-[160px] shrink-0 select-none flex flex-col gap-4 overflow-hidden"
    >
      {slots.map((idx) => (
        <div
          key={`${position}-sky-${idx}`}
          id={`ad-unit-${skyUnit.unitId}-${position}-${idx + 1}`}
          data-zone-id={skyUnit.unitId}
          className="w-[160px] h-[600px] shrink-0 overflow-hidden flex items-center justify-center"
        >
          <iframe
            title={`Ad ${skyUnit.unitId} ${position} ${idx + 1}`}
            srcDoc={skySrcDoc}
            width={skyUnit.width}
            height={skyUnit.height}
            scrolling="no"
            frameBorder={0}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            className="w-[160px] h-[600px] border-0 block"
          />
        </div>
      ))}
    </aside>
  );
};
