'use client';

import { Delta, DeltaIcon, DeltaValue } from '@/components/efferd/delta';
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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/shadcn/chart';
import { formatHours } from '@/lib/report-metrics';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from 'recharts';

export type ReplyRow = { date: string; hours: number | null };

const chartConfig = {
  hours: {
    label: 'Respons pertama',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function FirstReplyTimeChart({
  className,
  rows,
  ...props
}: ComponentProps<typeof Card> & { rows: ReplyRow[] }) {
  const measured = rows.filter((row) => row.hours !== null);
  const first = measured[0]?.hours ?? 0;
  const last = measured.at(-1)?.hours ?? first;
  /** Positive when the first response got faster over the window. */
  const improvement = measured.length > 1 && first > 0 ? ((first - last) / first) * 100 : null;

  return (
    <Card className={cn('shadow-none md:col-span-2 dark:ring-0', className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Respons pertama</CardTitle>
          {improvement !== null && (
            <Delta value={improvement} variant="badge">
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          )}
        </div>
        <CardDescription>
          Rata-rata waktu hingga tim merespons, per hari tiket dibuat ({rows.length} hari).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={rows}
            margin={{ top: 24, left: 20, right: 20, bottom: 8 }}
          >
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={0}
              tickFormatter={(value) => formatChartAxisTick(String(value), rows.length)}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatHours(Number(value))}
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as ReplyRow | undefined;
                    return row?.date ? formatChartTooltipDate(row.date) : '';
                  }}
                />
              }
              cursor={false}
            />
            <Line
              activeDot={{ r: 6 }}
              connectNulls
              dataKey="hours"
              dot={{ fill: 'var(--color-hours)' }}
              stroke="var(--color-hours)"
              strokeWidth={2}
              type="monotone"
            >
              <LabelList
                className="fill-foreground"
                dataKey="hours"
                fontSize={11}
                formatter={(label) => {
                  const n = Number(label);
                  return label !== null && Number.isFinite(n) ? formatHours(n) : '';
                }}
                offset={12}
                position="top"
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
