'use client';

import { Badge } from '@/components/shadcn/badge';
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { LabelList, Pie, PieChart } from 'recharts';

export type CategoryShare = { name: string; count: number };

export function ChannelBreakdownChart({
  className,
  shares,
  ...props
}: ComponentProps<typeof Card> & { shares: CategoryShare[] }) {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  // Chart keys become CSS custom properties, so category names are mapped to safe ids.
  const data = shares.map((share, index) => ({
    key: `c${index}`,
    count: share.count,
    fill: `var(--color-c${index})`,
  }));
  const chartConfig = Object.fromEntries([
    ['count', { label: 'Tiket' }],
    ...shares.map((share, index) => [
      `c${index}`,
      { label: share.name, color: `var(--chart-${index + 1})` },
    ]),
  ]) satisfies ChartConfig;

  return (
    <Card className={cn('flex flex-col shadow-none dark:ring-0', className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Distribusi kategori</CardTitle>
          <Badge variant="secondary">{total} tiket</Badge>
        </div>
        <CardDescription>Kendala yang paling sering dilaporkan.</CardDescription>
      </CardHeader>
      <CardContent className="my-auto">
        {total ? (
          <ChartContainer className="mx-auto aspect-square max-h-72 w-full" config={chartConfig}>
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
              <Pie
                cornerRadius={8}
                data={data}
                dataKey="count"
                innerRadius={36}
                nameKey="key"
                outerRadius="88%"
                stroke="var(--card)"
                strokeWidth={4}
              >
                <LabelList
                  className="fill-background font-medium"
                  dataKey="count"
                  fill="currentColor"
                  fontWeight={500}
                  formatter={(label) => {
                    const n = Number(label);
                    return Number.isFinite(n) && total ? `${Math.round((n / total) * 100)}%` : '';
                  }}
                  position="inside"
                  stroke="none"
                />
              </Pie>
              <ChartLegend
                className="flex-wrap gap-y-1"
                content={<ChartLegendContent nameKey="key" />}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Belum ada tiket</EmptyTitle>
              <EmptyDescription>Distribusi muncul setelah ada laporan masuk.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
