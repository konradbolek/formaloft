import { useId } from "react";

export function StandFigure({
  height,
  width,
  depth,
  frame,
  top,
  woodColor,
  woodEdge,
}) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `logs-${rawId}`;
  const woodId = `wood-${rawId}`;

  const s = 2.15;
  const postH = Math.max(height - top, 1) * s;
  const topT = Math.max(top, 0.4) * s;
  const W = width * s;
  const fw = Math.min(Math.max(frame * s, 4), W * 0.28);
  const ox = depth * s * 0.5;
  const oy = depth * s * 0.3;
  const padX = 8;
  const padTop = 10;
  const padBottom = 16;
  const vbW = padX * 2 + W + ox;
  const vbH = padTop + oy + topT + postH + padBottom;

  const x = padX;
  const ySteel = padTop + oy + topT;
  const yBottom = ySteel + postH;
  const yBoard = ySteel - topT;

  const innerX = x + fw;
  const innerY = ySteel + fw;
  const innerW = Math.max(W - fw * 2, 0);
  const innerH = Math.max(postH - fw * 2, 0);
  const rows = Math.max(3, Math.min(8, Math.round(innerH / 20)));
  const logColors = ["#c4a06a", "#8d5a32", "#d7c3a2", "#6e4a30", "#b98a58", "#a97848"];

  const logs = [];
  if (innerW > 8 && innerH > 12) {
    const gap = 2.4;
    const stackH = innerH * 0.96;
    const rowH = stackH / rows;
    for (let row = 0; row < rows; row += 1) {
      const h = Math.max(rowH - gap, 3);
      const y = innerY + innerH - (row + 1) * rowH + gap / 2;
      const shorten = innerW * (row % 3 === 0 ? 0.02 : 0.1);
      const w = Math.max(innerW - shorten, innerW * 0.72);
      logs.push({
        x: innerX + (row % 2 === 0 ? 0 : innerW - w),
        y,
        w,
        h,
        fill: logColors[row % logColors.length],
      });
    }
  }

  return (
    <svg
      className="stand-svg"
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={vbW}
      height={vbH}
      role="img"
      aria-label={`Podgląd stojaka, ${height} na ${width} na ${depth} centymetrów`}
    >
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={woodColor} />
          <stop offset="100%" stopColor={woodEdge} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={innerX} y={innerY} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      <ellipse
        cx={x + W / 2 + ox * 0.35}
        cy={yBottom + 5}
        rx={(W + ox) * 0.46}
        ry="7"
        fill="rgba(40, 28, 16, 0.28)"
      />

      <path
        d={`M ${x + ox} ${ySteel - oy} H ${x + W + ox} V ${yBottom - oy} H ${x + ox} Z`}
        fill="#3a342f"
      />
      <path
        d={`M ${x + W} ${ySteel} L ${x + W + ox} ${ySteel - oy} V ${yBottom - oy} L ${x + W} ${yBottom} Z`}
        fill="#2a2623"
      />

      <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="#24180f" />
      <g clipPath={`url(#${clipId})`}>
        {logs.map((log) => (
          <rect
            key={`${log.x}-${log.y}`}
            x={log.x}
            y={log.y}
            width={log.w}
            height={log.h}
            rx="3"
            fill={log.fill}
          />
        ))}
      </g>

      <rect x={x} y={ySteel} width={fw} height={postH} fill="#161311" />
      <rect x={x + W - fw} y={ySteel} width={fw} height={postH} fill="#161311" />
      <rect x={x} y={ySteel} width={W} height={fw} fill="#1c1916" />
      <rect x={x} y={yBottom - fw} width={W} height={fw} fill="#100e0c" />

      <path
        d={`M ${x} ${yBoard} H ${x + W} L ${x + W + ox} ${yBoard - oy} H ${x + ox} Z`}
        fill={`url(#${woodId})`}
      />
      <path
        d={`M ${x} ${yBoard} H ${x + W} V ${ySteel} H ${x} Z`}
        fill={woodEdge}
      />
      <path
        d={`M ${x + W} ${yBoard} L ${x + W + ox} ${yBoard - oy} V ${ySteel - oy} L ${x + W} ${ySteel} Z`}
        fill={woodEdge}
        opacity="0.85"
      />
      <path
        d={`M ${x + 8} ${yBoard + topT * 0.35} H ${x + W * 0.72}`}
        stroke={woodColor}
        strokeWidth="1.2"
        opacity="0.45"
      />
    </svg>
  );
}
