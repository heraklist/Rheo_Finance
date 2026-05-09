import { formatEuro } from "@/lib/utils";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export interface MonthlyDataPoint {
  month: string; // e.g., "Μάι"
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: MonthlyDataPoint[];
  height?: number;
}

export function IncomeExpenseChart({ data, height = 140 }: IncomeExpenseChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickFormatter={(month: string) => month.toLocaleUpperCase("el-GR")}
            tick={{
              fontSize: 10,
              fill: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--cream)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "var(--text-muted)", fontSize: "11px" }}
            formatter={(value: number, name: string) => [
              formatEuro(value, { compact: true }),
              name === "income" ? "Έσοδα" : "Έξοδα",
            ]}
            cursor={{ fill: "var(--sand)", opacity: 0.5 }}
          />
          <Bar dataKey="income" fill="var(--income)" radius={[1, 1, 0, 0]} maxBarSize={12} />
          <Bar dataKey="expense" fill="var(--expense)" radius={[1, 1, 0, 0]} maxBarSize={12} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
