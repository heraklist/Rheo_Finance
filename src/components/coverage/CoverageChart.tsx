import { formatEuro } from "@/lib/utils";

interface CoverageChartProps {
  data: Array<{ day: string; balance: number }>;
}

function pointPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function CoverageChart({ data }: CoverageChartProps) {
  const width = 360;
  const height = 176;
  const paddingTop = 16;
  const paddingRight = 10;
  const paddingBottom = 24;
  const paddingLeft = 10;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const values = data.map((point) => point.balance);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const span = Math.max(1, maxValue - minValue);
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    x: paddingLeft + index * step,
    y: paddingTop + plotHeight - ((point.balance - minValue) / span) * plotHeight,
  }));

  return (
    <div className="h-44 w-full">
      <svg
        aria-label="Σωρευτική κάλυψη μήνα"
        className="h-full w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 1, 2].map((line) => {
          const y = paddingTop + (plotHeight / 2) * line;
          return (
            <line
              key={line}
              stroke="var(--border-light)"
              strokeDasharray="3 3"
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
            />
          );
        })}
        {points.length > 0 ? (
          <path d={pointPath(points)} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
        ) : null}
        {points.map((point, index) => {
          const source = data[index];
          if (!source) return null;
          const showLabel =
            index === 0 || index === data.length - 1 || Number(source.day) % 7 === 0;
          return (
            <g key={source.day}>
              <circle cx={point.x} cy={point.y} fill="var(--gold)" r="1.75">
                <title>{`Ημέρα ${source.day}: ${formatEuro(source.balance)}`}</title>
              </circle>
              {showLabel ? (
                <text
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  x={point.x}
                  y={height - 7}
                >
                  {source.day}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
