"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface Props {
  src: string;
  alt?: string;
  size?: number; // output square size in px
  className?: string;
  style?: React.CSSProperties;
}

export default function CroppedSprite({ src, alt = '', size = 64, className, style }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;

  const img = document.createElement('img') as HTMLImageElement;
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        const ctx = tmp.getContext('2d');
        if (!ctx) {
          if (!cancelled) setDataUrl(src);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
  // disable smoothing on source context where supported
  // some browsers ignore imageSmoothing on the source canvas, but set anyway
  try { ctx.imageSmoothingEnabled = false; ctx.imageSmoothingQuality = 'low'; } catch {}
  const imageData = ctx.getImageData(0, 0, w, h).data;

        // find bounding box of non-transparent pixels
        let minX = w, minY = h, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const alpha = imageData[idx + 3];
            if (alpha > 8) { // threshold
              found = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!found) {
          if (!cancelled) setDataUrl(src);
          return;
        }

        const cropW = Math.max(1, maxX - minX + 1);
        const cropH = Math.max(1, maxY - minY + 1);

        // destination canvas
        const dst = document.createElement('canvas');
        dst.width = size;
        dst.height = size;
        const dctx = dst.getContext('2d');
        if (!dctx) {
          if (!cancelled) setDataUrl(src);
          return;
        }
        // disable smoothing on destination to ensure nearest-neighbor scaling
        try { dctx.imageSmoothingEnabled = false; dctx.imageSmoothingQuality = 'low'; } catch {}
        dctx.clearRect(0, 0, size, size);

        // compute scale to fit into square while preserving aspect
        const scale = Math.min(size / cropW, size / cropH);
        const drawW = cropW * scale;
        const drawH = cropH * scale;
        const offsetX = (size - drawW) / 2;
        const offsetY = (size - drawH) / 2;

        dctx.drawImage(tmp, minX, minY, cropW, cropH, offsetX, offsetY, drawW, drawH);

        const out = dst.toDataURL('image/png');
        if (!cancelled) setDataUrl(out);
      } catch {
        if (!cancelled) setDataUrl(src);
      }
    };

    img.onerror = () => {
      if (!cancelled) setDataUrl(src);
    };

    return () => { cancelled = true; };
  }, [src, size]);

  // while processing show the source (will be replaced when dataUrl ready)
  const finalSrc = dataUrl || src;

  return (
    <div style={{ width: size, height: size, position: 'relative' }} className={className}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[70%] h-[70%] rounded-full border border-slate-600/40 animate-pulse flex items-center justify-center">
            <img src="/icons/pokeball.svg" alt="pokéball" className="w-8 h-8 opacity-90" />
          </div>
        </div>
      )}
      {(() => {
        const imgStyle: React.CSSProperties = { objectFit: 'contain', imageRendering: 'pixelated', ...style };
        return <Image src={finalSrc} alt={alt} fill style={imgStyle} unoptimized priority sizes={`${size}px`} onLoadingComplete={() => setLoaded(true)} />;
      })()}
    </div>
  );
}
