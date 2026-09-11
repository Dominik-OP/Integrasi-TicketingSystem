'use client';

import { formatChartAxisTick, formatChartTooltipDate } from '@/components/efferd/formater';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/shadcn/chart';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { Bar, BarChart, Rectangle, XAxis } from 'recharts';

export type PriorityRow = {
  date: string;
  Low: number;
  Medium: number;
  High: number;
  Urgent: number;
};

const chartConfig = {
  Low: { label: 'Low', color: 'var(--chart-4)' },
  Medium: { label: 'Medium', color: 'var(--chart-2)' },
  High: { label: 'High', color: 'var(--chart-3)' },
  Urgent: { label: 'Urgent', color: 'var(--chart-5)' },
} satisfies ChartConfig;
const stack = ['Low', 'Medium', 'High', 'Urgent'] as const;

/** Half of bar width (8) so ends read as fully rounded “caps”. */
const BAR_RADIUS = 5;

/**
 *  column hover background.
 */
function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
  return (
    <Rectangle
      fill="var(--muted)"
      fillOpacity={0.5}
      radius={BAR_RADIUS * 2}
      stroke="none"
      {...props}
    />
  );
}

export function CsatResponsesChart({
  className,
  rows,
  ...props
}: ComponentProps<typeof Card> & { rows: PriorityRow[] }) {
  return (
    <Card className={cn('shadow-none md:col-span-2 dark:ring-0', className)} {...props}>
      <CardHeader>
        <CardTitle>Tiket per prioritas</CardTitle>
        <CardDescription>Laporan masuk per hari berdasarkan prioritas final.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <BarChart accessibilityLayer data={rows}>
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={0}
              minTickGap={8}
              tickFormatter={(value) => formatChartAxisTick(String(value), rows.length)}
              tickLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as PriorityRow | undefined;
                    return row?.date ? formatChartTooltipDate(row.date) : '';
                  }}
                />
              }
              cursor={<ColumnHoverCursor />}
            />
            {stack.map((key, index) => (
              <Bar
                barSize={8}
                dataKey={key}
                fill={`var(--color-${key})`}
                key={key}
                overflow="visible"
                radius={
                  index === 0
                    ? [0, 0, BAR_RADIUS, BAR_RADIUS]
                    : index === stack.length - 1
                      ? [BAR_RADIUS, BAR_RADIUS, 0, 0]
                      : 0
                }
                stackId="priority"
                {...(index === 0 && { background: { fill: 'var(--muted)', radius: BAR_RADIUS } })}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
