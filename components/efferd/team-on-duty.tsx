'use client';

import { StatusIndicator } from '@/components/efferd/indicator';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { initials } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { EllipsisIcon, ListChecksIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

export type Teammate = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  /** Unfinished tickets currently assigned to this teammate. */
  open: number;
  completed: number;
};

export function TeamOnDuty({
  className,
  teammates,
  onViewTickets,
  ...props
}: ComponentProps<typeof Card> & {
  teammates: Teammate[];
  onViewTickets: (id: string) => void;
}) {
  return (
    <Card className={cn('shadow-none dark:ring-0', className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Beban kerja tim</CardTitle>
        <CardDescription>Siapa yang sedang memegang antrean.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {teammates.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {teammates.map((t) => (
              <li className="flex items-center gap-2 p-3 first:pt-0 last:pb-0 sm:gap-3" key={t.id}>
                <Avatar className="size-8">
                  <AvatarFallback>{initials(t.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pr-1">
                  <p className="truncate font-medium text-foreground text-sm leading-snug">
                    {t.name}
                  </p>
                  <p className="flex items-center gap-2 text-[10px] text-muted-foreground leading-snug">
                    <span className="flex shrink-0 items-center gap-1">
                      <StatusIndicator color={t.active ? 'emerald' : 'amber'} pulse={t.active} />
                      {t.role}
                    </span>
                    <span className="inline-flex size-1 rounded-full bg-foreground/80" />
                    <span className="tabular-nums">{t.open} aktif</span>
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-label={`Aksi untuk ${t.name}`} size="icon-xs" variant="ghost">
                      <EllipsisIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-60">
                    <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
                      {t.name} · {t.completed} selesai
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => onViewTickets(t.id)}>
                        <ListChecksIcon />
                        Lihat tiket yang ditugaskan
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Belum ada anggota</EmptyTitle>
              <EmptyDescription>Tambahkan anggota tim untuk melihat beban kerja.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
