'use client';

import {
  type CategoryShare,
  ChannelBreakdownChart,
} from '@/components/efferd/channel-breakdown-chart';
import {
  ConversationVolumeChart,
  type VolumeRow,
} from '@/components/efferd/conversation-volume-chart';
import { CsatResponsesChart, type PriorityRow } from '@/components/efferd/csat-responses-chart';
import { FirstReplyTimeChart, type ReplyRow } from '@/components/efferd/first-reply-time-chart';
import { RecentConversations } from '@/components/efferd/recent-conversations';
import { type DashboardStat, DashboardStats } from '@/components/efferd/stats';
import { type ActivityItem, SupportActivity } from '@/components/efferd/support-activity';
import { type Teammate, TeamOnDuty } from '@/components/efferd/team-on-duty';
import type { Ticket } from '@/lib/domain';

export type DashboardProps = {
  stats: DashboardStat[];
  periodDays: number;
  volume: VolumeRow[];
  volumeGrowth: number | null;
  categories: CategoryShare[];
  priorities: PriorityRow[];
  firstResponse: ReplyRow[];
  teammates: Teammate[];
  recentTickets: Ticket[];
  overdueIds: ReadonlySet<string>;
  activity: ActivityItem[];
  onSelectTicket: (id: string) => void;
  onViewTickets: () => void;
  onViewAgentTickets: (id: string) => void;
};

export function Dashboard(props: DashboardProps) {
  return (
    // `ui-scope` opts this subtree into the shadcn tokens and reset from app/shadcn.css.
    <div className="ui-scope grid grid-cols-1 gap-4 font-sans text-sm sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStats stats={props.stats} />
      <ConversationVolumeChart
        growth={props.volumeGrowth}
        periodDays={props.periodDays}
        rows={props.volume}
      />
      <ChannelBreakdownChart shares={props.categories} />
      <CsatResponsesChart rows={props.priorities} />
      <FirstReplyTimeChart rows={props.firstResponse} />
      <TeamOnDuty onViewTickets={props.onViewAgentTickets} teammates={props.teammates} />
      <RecentConversations
        onSelectTicket={props.onSelectTicket}
        onViewAll={props.onViewTickets}
        overdueIds={props.overdueIds}
        tickets={props.recentTickets}
      />
      <SupportActivity
        items={props.activity}
        onSelectTicket={props.onSelectTicket}
        onViewAll={props.onViewTickets}
      />
    </div>
  );
}
