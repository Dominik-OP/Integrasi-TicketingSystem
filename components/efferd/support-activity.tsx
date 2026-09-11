'use client';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { timeAgo } from '@/lib/report-metrics';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CircleCheckIcon,
  FilePlusIcon,
  type LucideIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  TagIcon,
  UserRoundIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';

export type ActivityItem = {
  ticketId: string;
  text: string;
  at: string;
  actorName?: string | undefined;
};

function activityIcon(text: string): LucideIcon {
  if (/Resolved|Closed|ditutup/i.test(text)) return CircleCheckIcon;
  if (/balasan|catatan|komentar/i.test(text)) return MessageSquareIcon;
  if (/agent|reviewer/i.test(text)) return UserRoundIcon;
  if (/kategori|prioritas/i.test(text)) return TagIcon;
  if (/status/i.test(text)) return RefreshCwIcon;
  return FilePlusIcon;
}

export function SupportActivity({
  className,
  items,
  onSelectTicket,
  onViewAll,
  ...props
}: ComponentProps<typeof Card> & {
  items: ActivityItem[];
  onSelectTicket: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card className={cn('gap-0 shadow-none dark:ring-0', className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Aktivitas terbaru</CardTitle>
        <CardDescription>Perubahan terakhir pada tiket.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {items.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const Icon = activityIcon(item.text);
              return (
                <li
                  className="flex min-h-18 items-center gap-3 px-3"
                  key={`${item.ticketId}-${item.at}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
                  >
                    <Icon />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
                    <button
                      className="cursor-pointer text-pretty text-left text-foreground text-xs leading-snug underline-offset-4 hover:underline focus-visible:underline"
                      onClick={() => onSelectTicket(item.ticketId)}
                      type="button"
                    >
                      <span className="line-clamp-2">{item.text}</span>
                    </button>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {item.ticketId} · {item.actorName ? `${item.actorName} · ` : ''}
                      {timeAgo(item.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Belum ada aktivitas</EmptyTitle>
              <EmptyDescription>Riwayat tiket akan tampil di sini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      <div className="flex items-center justify-center">
        <Button onClick={onViewAll} size="sm" variant="ghost">
          Lihat semua tiket
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  );
}
