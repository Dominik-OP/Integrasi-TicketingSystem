import { Delta, DeltaIcon, DeltaValue } from '@/components/efferd/delta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export type DashboardStat = {
  label: string;
  value: string;
  /** Change versus the previous period; `null` when there is nothing to compare against. */
  delta: number | null;
  /** Unit for the delta, e.g. "%" for relative change or " poin" for percentage points. */
  deltaSuffix?: string;
  footnote: string;
  /** When true, a negative delta is treated as favorable (e.g. response time). */
  lowerIsBetter: boolean;
};

export function DashboardStats({ stats }: { stats: readonly DashboardStat[] }) {
  return (
    <>
      {stats.map((s) => (
        <Card className="shadow-none dark:ring-0" key={s.label}>
          <CardHeader>
            <CardTitle className="font-normal text-muted-foreground text-xs">{s.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="font-semibold text-2xl tabular-nums">{s.value}</p>
            <div className="flex items-center gap-1 text-xs">
              {s.delta === null ? (
                <span className="text-muted-foreground">Belum ada data pembanding</span>
              ) : (
                <>
                  <Delta higherIsBetter={!s.lowerIsBetter} value={s.delta}>
                    <DeltaIcon />
                    <DeltaValue {...(s.deltaSuffix !== undefined && { suffix: s.deltaSuffix })} />
                  </Delta>
                  <span className="text-muted-foreground">{s.footnote}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
