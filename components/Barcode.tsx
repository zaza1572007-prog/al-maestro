'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export default function Barcode({
  value,
  width = 2,
  height = 50,
  displayValue = false,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          lineColor: '#000000',
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} className="w-full h-full max-h-full max-w-full" />;
}
