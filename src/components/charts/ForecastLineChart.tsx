import type { ForecastMonth } from "@/lib/analytics";
import { formatEuro } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ForecastLineChartProps {
  data: ForecastMonth[];
  height?: number;
}

export function ForecastLineChart({ data, height = 180 }: ForecastLineChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickFormatter={(label: string) =>
              label.split(" ")[0]?.toLocaleUpperCase("el-GR") ?? label
            }
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--cream)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "var(--text-muted)", fontSize: "11px" }}
            formatter={(value: number) => [formatEuro(value), "Σωρευτικό"]}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="var(--gold)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--gold)", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "var(--gold)" }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
