import type { ForecastMonth } from "@/lib/analytics";
import { formatEuro } from "@/lib/utils";

interface ForecastLineChartProps {
  data: ForecastMonth[];
  height?: number;
}

function chartHeightClass(height: number): string {
  if (height <= 150) return "h-36";
  if (height <= 190) return "h-44";
  return "h-56";
}

function pointPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function ForecastLineChart({ data, height = 180 }: ForecastLineChartProps) {
  const width = 360;
  const svgHeight = 180;
  const paddingTop = 16;
  const paddingRight = 10;
  const paddingBottom = 28;
  const paddingLeft = 10;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const values = data.map((point) => point.cumulative);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const span = Math.max(1, maxValue - minValue);
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    x: paddingLeft + index * step,
    y: paddingTop + plotHeight - ((point.cumulative - minValue) / span) * plotHeight,
  }));

  return (
    <div className={chartHeightClass(height)}>
      <svg
        aria-label="Πρόβλεψη ταμειακής ροής"
        className="h-full w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${svgHeight}`}
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
          return (
            <g key={source.label}>
              <circle cx={point.x} cy={point.y} fill="var(--gold)" r="2.5">
                <title>{`${source.label}: ${formatEuro(source.cumulative)}`}</title>
              </circle>
              <text
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="middle"
                x={point.x}
                y={svgHeight - 8}
              >
                {source.label.split(" ")[0]?.toLocaleUpperCase("el-GR") ?? source.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
