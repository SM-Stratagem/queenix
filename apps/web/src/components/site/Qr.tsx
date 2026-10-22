/** Decorative QR-style glyph for the app pass (not a scannable code). */
const N = 21;

function on(x: number, y: number): boolean {
  const finder = (fx: number, fy: number) => {
    const dx = x - fx, dy = y - fy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]] as const) {
    const f = finder(fx, fy);
    if (f !== null) return f;
    if (x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7) return false;
  }
  return ((x * 7 + y * 13 + x * y * 3) % 5) < 2;
}

export function Qr({ className }: { className?: string }) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (on(x, y)) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />);
  return (
    <svg className={className} viewBox={`0 0 ${N} ${N}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden>
      {cells}
    </svg>
  );
}
