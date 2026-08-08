'use client';

import { useEffect, useState, useCallback } from 'react';

export interface SmartPortraitConfig {
  opacity: number;
  mode?: 'subtle' | 'balanced' | 'vivid';
  position: 'side' | 'center';
  visible: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
}

export type DevicePortraitConfig = SmartPortraitConfig;

export interface MultiDevicePortraitConfig {
  desktop: DevicePortraitConfig;
  tablet: DevicePortraitConfig;
  mobile: DevicePortraitConfig;
}

export const DEFAULT_SMART_CONFIG: SmartPortraitConfig = {
  opacity: 0.18,
  mode: 'subtle',
  position: 'side',
  visible: true,
  scale: 1.0,
};

export const DEFAULT_PORTRAIT_CONFIG: MultiDevicePortraitConfig = {
  desktop: { ...DEFAULT_SMART_CONFIG },
  tablet: { ...DEFAULT_SMART_CONFIG, opacity: 0.14 },
  mobile: { ...DEFAULT_SMART_CONFIG, opacity: 0.10, position: 'center' },
};

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export default function TeacherOverlay() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [config, setConfig] = useState<SmartPortraitConfig>(DEFAULT_SMART_CONFIG);
  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());

  // 1. Auto-detect screen size and device type intelligently
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setDevice('desktop');
      } else if (w >= 768) {
        setDevice('tablet');
      } else {
        setDevice('mobile');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Fetch config from server
  const fetchConfigAndImage = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        let loadedConfig: SmartPortraitConfig = { ...DEFAULT_SMART_CONFIG };

        if (s.portraitConfig) {
          try {
            const parsed = typeof s.portraitConfig === 'string' ? JSON.parse(s.portraitConfig) : s.portraitConfig;
            // Handle both new smart format and legacy device format
            if (parsed.mode || parsed.opacity !== undefined) {
              loadedConfig = {
                ...DEFAULT_SMART_CONFIG,
                opacity: parsed.opacity ?? DEFAULT_SMART_CONFIG.opacity,
                mode: parsed.mode ?? 'subtle',
                position: parsed.position ?? 'side',
                visible: parsed.visible ?? true,
                scale: parsed.scale ?? 1.0,
              };
            } else if (parsed.desktop) {
              loadedConfig = {
                ...DEFAULT_SMART_CONFIG,
                opacity: parsed.desktop.opacity ?? 0.18,
                position: parsed.desktop.position ?? 'side',
                visible: parsed.desktop.visible ?? true,
                scale: parsed.desktop.scale ?? 1.0,
              };
            }
          } catch {
            // fallback
          }
        } else {
          if (s.portraitOpacity !== undefined) loadedConfig.opacity = s.portraitOpacity;
          if (s.portraitPosition !== undefined) loadedConfig.position = s.portraitPosition;
        }

        setConfig(loadedConfig);
      }

      // Check if image exists
      const imgRes = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
      setHasCustomImage(imgRes.ok);
      setImageTimestamp(Date.now());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchConfigAndImage();

    const refresh = () => fetchConfigAndImage();

    // Live preview event listener for instant responsiveness in settings
    const handleLivePreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setConfig((prev) => ({
          ...prev,
          ...customEvent.detail,
        }));
      }
    };

    window.addEventListener('maestro-portrait-updated', refresh);
    window.addEventListener('maestro-portrait-config-updated', refresh);
    window.addEventListener('maestro-portrait-live-preview', handleLivePreview);

    return () => {
      window.removeEventListener('maestro-portrait-updated', refresh);
      window.removeEventListener('maestro-portrait-config-updated', refresh);
      window.removeEventListener('maestro-portrait-live-preview', handleLivePreview);
    };
  }, [fetchConfigAndImage]);

  if (!hasCustomImage || !config.visible) return null;

  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isCenter = config.position === 'center' || isMobile;

  // Auto-calculated smart dimensions and positioning based on screen size
  let containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: isCenter ? 'center' : 'flex-start',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  if (isMobile) {
    // Smartphone: Centered watermark at the bottom
    containerStyle = {
      ...containerStyle,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(92vw, 360px)',
      height: 'clamp(200px, 38vh, 320px)',
    };
  } else if (isTablet) {
    // Tablet: Scaled and anchored neatly
    containerStyle = {
      ...containerStyle,
      left: isCenter ? '50%' : '1rem',
      transform: isCenter ? 'translateX(-50%)' : 'none',
      width: isCenter ? 'min(85vw, 650px)' : 'min(42vw, 420px)',
      height: 'clamp(280px, 50vh, 440px)',
    };
  } else {
    // Desktop: Smart Corner or Center fit
    containerStyle = {
      ...containerStyle,
      left: isCenter ? '50%' : '1.5rem',
      transform: isCenter ? 'translateX(-50%)' : 'none',
      width: isCenter ? 'min(80vw, 850px)' : 'min(35vw, 520px)',
      height: 'clamp(340px, 62vh, 580px)',
    };
  }

  // Smart 360-degree soft feathering mask to remove all sharp borders/blackboard edges
  const maskImageStyle = isCenter
    ? 'radial-gradient(ellipse 90% 85% at 50% 85%, black 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 75%, transparent 100%)'
    : 'radial-gradient(ellipse 95% 88% at 30% 85%, black 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 75%, transparent 100%)';

  // Smart opacity tuning: adapts based on device to guarantee readability of foreground cards
  const effectiveOpacity = isMobile
    ? Math.min(config.opacity, 0.15)
    : isTablet
    ? Math.min(config.opacity, 0.22)
    : config.opacity;

  const imgSrc = `/api/settings/branding?type=portrait&t=${imageTimestamp}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none overflow-hidden"
      style={containerStyle}
    >
      <div
        className="w-full h-full flex items-end justify-center overflow-hidden transition-all duration-300"
        style={{
          maskImage: maskImageStyle,
          WebkitMaskImage: maskImageStyle,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="صورة المستر"
          className="w-full h-full object-contain object-bottom pointer-events-none transition-opacity duration-300"
          style={{
            opacity: effectiveOpacity,
            filter: 'contrast(1.04) saturate(1.04)',
          }}
          onError={() => setHasCustomImage(false)}
        />
      </div>
    </div>
  );
}
