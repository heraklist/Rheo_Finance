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

interface CoverageChartProps {
  data: Array<{ day: string; balance: number }>;
}

export function CoverageChart({ data }: CoverageChartProps) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--cream)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            formatter={(value: number) => [formatEuro(value), "Σωρευτικό"]}
            labelFormatter={(label) => `Ημέρα ${label}`}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--gold)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "var(--gold)" }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
