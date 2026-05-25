import { formatEuro } from "@/lib/utils";

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: MonthlyDataPoint[];
  height?: number;
}

function chartHeightClass(height: number): string {
  if (height <= 150) return "h-36";
  if (height <= 190) return "h-44";
  return "h-56";
}

export function IncomeExpenseChart({ data, height = 140 }: IncomeExpenseChartProps) {
  const width = 360;
  const svgHeight = 140;
  const paddingTop = 8;
  const paddingBottom = 24;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const groupWidth = data.length > 0 ? width / data.length : width;
  const barWidth = Math.min(12, groupWidth / 4);
  const maxValue = Math.max(1, ...data.flatMap((point) => [point.income, point.expense]));

  return (
    <div className={chartHeightClass(height)}>
      <svg
        aria-label="Έσοδα και έξοδα ανά μήνα"
        className="h-full w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${svgHeight}`}
      >
        {data.map((point, index) => {
          const centerX = index * groupWidth + groupWidth / 2;
          const incomeHeight = (point.income / maxValue) * plotHeight;
          const expenseHeight = (point.expense / maxValue) * plotHeight;
          const incomeX = centerX - barWidth - 2;
          const expenseX = centerX + 2;
          const incomeY = paddingTop + plotHeight - incomeHeight;
          const expenseY = paddingTop + plotHeight - expenseHeight;

          return (
            <g key={point.month}>
              <rect
                fill="var(--income)"
                height={incomeHeight}
                rx="1"
                width={barWidth}
                x={incomeX}
                y={incomeY}
              >
                <title>{`Έσοδα ${point.month}: ${formatEuro(point.income)}`}</title>
              </rect>
              <rect
                fill="var(--expense)"
                height={expenseHeight}
                rx="1"
                width={barWidth}
                x={expenseX}
                y={expenseY}
              >
                <title>{`Έξοδα ${point.month}: ${formatEuro(point.expense)}`}</title>
              </rect>
              <text
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="middle"
                x={centerX}
                y={svgHeight - 6}
              >
                {point.month.toLocaleUpperCase("el-GR")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
