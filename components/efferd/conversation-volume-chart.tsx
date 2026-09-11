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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/shadcn/chart';
import { cn } from '@/lib/utils';
import { type ComponentProps, useId } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

export type VolumeRow = {
  date: string;
  created: number;
  completed: number;
};

const chartConfig = {
  created: {
    label: 'Tiket masuk',
    color: 'var(--chart-1)',
  },
  completed: {
    label: 'Selesai',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

export function ConversationVolumeChart({
  className,
  rows,
  periodDays,
  growth,
  ...props
}: ComponentProps<typeof Card> & {
  rows: VolumeRow[];
  periodDays: number;
  /** Relative change of incoming tickets versus the previous period, or `null` without history. */
  growth: number | null;
}) {
  const chartUid = useId().replace(/:/g, '');
  const gradientId = (key: keyof typeof chartConfig) => `ticket-volume-${key}-${chartUid}`;
  const minTickGap = periodDays >= 60 ? 20 : 28;

  return (
    <Card
      className={cn('shadow-none md:col-span-2 lg:col-span-3 dark:ring-0', className)}
      {...props}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Volume tiket</CardTitle>
          {growth !== null && (
            <Delta value={growth} variant="badge">
              <DeltaIcon variant="trend" />
              <DeltaValue />
            </Delta>
          )}
        </div>
        <CardDescription>
          Tiket masuk dan tiket selesai per hari, {periodDays} hari terakhir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={rows}
            margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              {(['created', 'completed'] as const).map((key) => (
                <linearGradient id={gradientId(key)} key={key} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.4} />
                  <stop offset="55%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={periodDays <= 7 ? 0 : 'preserveStartEnd'}
              {...(periodDays > 7 && { minTickGap })}
              tickFormatter={(value) => formatChartAxisTick(String(value), periodDays)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ className: 'tabular-nums' }}
              tickLine={false}
              tickMargin={8}
              width={32}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-40"
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as VolumeRow | undefined;
                    return row?.date ? formatChartTooltipDate(row.date, 'long') : '';
                  }}
                />
              }
              cursor={false}
            />
            {(['completed', 'created'] as const).map((key) => (
              <Area
                dataKey={key}
                dot={false}
                fill={`url(#${gradientId(key)})`}
                key={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                type="monotone"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
