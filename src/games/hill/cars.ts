/** Auto-Formen (SVG-Pfade im 200×96-Raster aus dem Design „Garage & Shop“). Räder bei x=60 und x=146, y=72. */
export const SHAPES: Record<string, { name: string; body: string; win: string }> = {
  flitzer: { name: 'Stadtflitzer', body: 'M30 70 L36 57 Q50 51 72 49 L90 39 Q102 34 118 36 L138 47 Q158 49 164 58 L166 70 Z', win: 'M78 49 L93 41 Q102 38 114 40 L126 48 Z' },
  renner: { name: 'Rennwagen', body: 'M24 70 L30 60 Q60 56 84 52 L100 44 Q112 41 126 43 L146 52 Q170 54 176 62 L178 70 Z', win: 'M90 52 L104 46 Q112 44 122 45 L134 52 Z' },
  gelaende: { name: 'Geländewagen', body: 'M30 70 L30 50 Q32 44 40 44 L60 44 L70 30 L130 30 L142 44 L162 46 Q168 48 168 56 L168 70 Z', win: 'M76 33 L126 33 L136 44 L70 44 Z' },
  bus: { name: 'Mini-Bus', body: 'M26 70 L26 34 Q26 28 32 28 L150 28 Q162 28 166 40 L172 56 L172 70 Z', win: 'M36 34 L150 34 L160 46 L36 46 Z' },
};
/** Fahrerkopf (Fenstermitte) je Auto im 200×96-Raster. */
export const DRIVER: Record<string, [number, number]> = { flitzer: [104, 44], renner: [112, 48], gelaende: [104, 38], bus: [128, 40] };
