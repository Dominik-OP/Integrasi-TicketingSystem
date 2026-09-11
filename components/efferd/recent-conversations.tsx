'use client';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import type { Ticket } from '@/lib/domain';
import { timeAgo } from '@/lib/report-metrics';
import { cn } from '@/lib/utils';
import { ArrowRightIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

function statusVariant(ticket: Ticket, overdue: boolean): ComponentProps<typeof Badge>['variant'] {
  if (overdue) return 'destructive';
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') return 'outline';
  if (ticket.status === 'New / Open') return 'default';
  return 'secondary';
}

export function RecentConversations({
  className,
  tickets,
  overdueIds,
  onSelectTicket,
  onViewAll,
  ...props
}: ComponentProps<typeof Card> & {
  tickets: Ticket[];
  overdueIds: ReadonlySet<string>;
  onSelectTicket: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card className={cn('gap-0 shadow-none md:col-span-2 dark:ring-0', className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Tiket terbaru</CardTitle>
        <CardDescription>{tickets.length} laporan terakhir pada periode ini.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Tiket</TableHead>
                <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                <TableHead className="text-right">Dibuat</TableHead>
                <TableHead className="pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const overdue = overdueIds.has(ticket.id);
                return (
                  <TableRow className="h-14" key={ticket.id}>
                    <TableCell className="max-w-56 pl-6">
                      <span className="block text-muted-foreground text-xs">{ticket.id}</span>
                      <button
                        className="block w-full cursor-pointer truncate text-left font-medium underline-offset-4 hover:underline focus-visible:underline"
                        onClick={() => onSelectTicket(ticket.id)}
                        type="button"
                      >
                        {ticket.title}
                      </button>
                    </TableCell>
                    <TableCell className="hidden max-w-32 truncate text-muted-foreground sm:table-cell">
                      {ticket.category}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {timeAgo(ticket.created)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant={statusVariant(ticket, overdue)}>
                        {overdue ? 'Lewat SLA' : ticket.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Belum ada tiket</EmptyTitle>
              <EmptyDescription>Tidak ada laporan pada periode ini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <div className="flex justify-center border-t py-3">
          <Button onClick={onViewAll} size="sm" variant="ghost">
            Lihat semua tiket
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
