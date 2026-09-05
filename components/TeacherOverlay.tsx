'use client';

import { useEffect, useState, useCallback } from 'react';

export interface DevicePortraitConfig {
  opacity: number;
  scale: number;
  position: 'side' | 'center' | 'fullscreen';
  posX: number; // horizontal pan offset % (-60% to +60%)
  posY: number; // vertical pan offset % (-60% to +60%)
  visible: boolean;
  mode?: 'subtle' | 'balanced' | 'vivid';
  fit?: 'contain' | 'cover';
}

export type SmartPortraitConfig = DevicePortraitConfig;

export interface MultiDevicePortraitConfig {
  desktop: DevicePortraitConfig;
  tablet: DevicePortraitConfig;
  mobile: DevicePortraitConfig;
}

export const DEFAULT_PORTRAIT_CONFIG: MultiDevicePortraitConfig = {
  desktop: {
    opacity: 0.22,
    scale: 1.0,
    position: 'side',
    posX: 0,
    posY: 0,
    visible: true,
    fit: 'contain',
  },
  tablet: {
    opacity: 0.18,
    scale: 1.0,
    position: 'center',
    posX: 0,
    posY: 0,
    visible: true,
    fit: 'contain',
  },
  mobile: {
    opacity: 0.18,
    scale: 1.0,
    position: 'center',
    posX: 0,
    posY: 0,
    visible: true,
    fit: 'contain',
  },
};

export const DEFAULT_SMART_CONFIG: SmartPortraitConfig = DEFAULT_PORTRAIT_CONFIG.desktop;

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export default function TeacherOverlay() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [config, setConfig] = useState<MultiDevicePortraitConfig>(DEFAULT_PORTRAIT_CONFIG);
  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());

  // 1. Auto-detect screen size and device breakpoint
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

  // 2. Fetch multi-device configuration from server
  const fetchConfigAndImage = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        let loadedConfig: MultiDevicePortraitConfig = { ...DEFAULT_PORTRAIT_CONFIG };

        if (s.portraitConfig) {
          try {
            const parsed = typeof s.portraitConfig === 'string' ? JSON.parse(s.portraitConfig) : s.portraitConfig;
            if (parsed.desktop || parsed.tablet || parsed.mobile) {
              loadedConfig = {
                desktop: { ...DEFAULT_PORTRAIT_CONFIG.desktop, ...(parsed.desktop || {}) },
                tablet: { ...DEFAULT_PORTRAIT_CONFIG.tablet, ...(parsed.tablet || {}) },
                mobile: { ...DEFAULT_PORTRAIT_CONFIG.mobile, ...(parsed.mobile || {}) },
              };
            } else {
              // Legacy flat format
              const base: DevicePortraitConfig = {
                opacity: parsed.opacity ?? s.portraitOpacity ?? 0.20,
                scale: parsed.scale ?? 1.0,
                position: parsed.position ?? s.portraitPosition ?? 'side',
                posX: parsed.posX ?? 0,
                posY: parsed.posY ?? 0,
                visible: parsed.visible ?? true,
                fit: parsed.fit ?? 'contain',
              };
              loadedConfig = {
                desktop: { ...base },
                tablet: { ...base, opacity: Math.min(base.opacity, 0.18) },
                mobile: { ...base, opacity: Math.min(base.opacity, 0.14), position: 'center' },
              };
            }
          } catch {
            // fallback
          }
        } else {
          if (s.portraitOpacity !== undefined) loadedConfig.desktop.opacity = s.portraitOpacity;
          if (s.portraitScale !== undefined) loadedConfig.desktop.scale = s.portraitScale;
          if (s.portraitPosition !== undefined) loadedConfig.desktop.position = s.portraitPosition;
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

    // Live preview event listener for instant slider feedback
    const handleLivePreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { device: targetDevice, config: newDeviceConfig, allConfig } = customEvent.detail;
        if (allConfig) {
          setConfig(allConfig);
        } else if (targetDevice && newDeviceConfig) {
          setConfig((prev) => ({
            ...prev,
            [targetDevice]: { ...prev[targetDevice as DeviceType], ...newDeviceConfig },
          }));
        } else {
          setConfig((prev) => ({
            ...prev,
            [device]: {
              ...prev[device],
              ...customEvent.detail,
            },
          }));
        }
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
  }, [fetchConfigAndImage, device]);

  if (!hasCustomImage) return null;

  const currentConfig = config[device] || DEFAULT_PORTRAIT_CONFIG[device];
  if (!currentConfig.visible) return null;

  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFullscreen = currentConfig.position === 'fullscreen';
  const isCenter = currentConfig.position === 'center' || isMobile;

  // Determine specific device image endpoint
  const imageType = isMobile ? 'portrait-mobile' : isTablet ? 'portrait-tablet' : 'portrait';
  const imgSrc = `/api/settings/branding?type=${imageType}&t=${imageTimestamp}`;

  // Smart unconstrained dimensions allowing image to fill entire screen height behind hero & cards
  let containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 0,
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: isFullscreen ? 'center' : isMobile ? 'center' : (isCenter ? 'center' : 'flex-end'),
    justifyContent: isCenter || isFullscreen || isMobile ? 'center' : 'flex-start',
    transition: 'all 0.3s ease-out',
  };

  if (!isFullscreen && !isMobile && !isCenter) {
    // Desktop / Tablet side placement
    containerStyle = {
      ...containerStyle,
      left: 0,
      right: 'auto',
      width: isTablet ? 'clamp(450px, 60vw, 850px)' : 'clamp(600px, 65vw, 1200px)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    };
  }

  // Smart Hero Studio downward fade mask: Focused smoothly behind the Hero Header with seamless vertical fade
  let maskImageStyle = '';
  if (isFullscreen) {
    maskImageStyle = 'linear-gradient(to bottom, black 35%, rgba(0,0,0,0.85) 60%, transparent 90%)';
  } else if (isMobile) {
    // Mobile mask: crisp at top hero area with smooth linear fade toward bottom
    maskImageStyle = 'linear-gradient(to bottom, black 30%, rgba(0,0,0,0.85) 55%, transparent 85%)';
  } else if (isCenter) {
    maskImageStyle = 'linear-gradient(to bottom, black 30%, rgba(0,0,0,0.85) 55%, transparent 85%)';
  } else {
    // Desktop side placement: smooth downward & side fade
    maskImageStyle = 'linear-gradient(to bottom, black 35%, rgba(0,0,0,0.8) 60%, transparent 85%)';
  }

  const scale = currentConfig.scale ?? 1.0;
  const imageTransform = `scale(${scale}) translate(${currentConfig.posX || 0}%, ${
    (currentConfig.posY || 0) + (1 - scale) * 4
  }%)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none overflow-hidden"
      style={containerStyle}
    >
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          transform: imageTransform,
          transformOrigin: isFullscreen || isMobile ? 'center center' : isCenter ? 'center bottom' : 'left bottom',
          maskImage: maskImageStyle,
          WebkitMaskImage: maskImageStyle,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="صورة المستر"
          className="w-full h-full pointer-events-none transition-opacity duration-300"
          style={{
            opacity: currentConfig.opacity,
            objectFit: isFullscreen ? 'cover' : (currentConfig.fit || 'contain'),
            objectPosition: isMobile ? 'center 35%' : (isFullscreen ? 'center center' : (isCenter ? 'center bottom' : 'left bottom')),
            filter: 'contrast(1.04) saturate(1.04)',
          }}
          onError={() => setHasCustomImage(false)}
        />
      </div>
    </div>
  );
}
