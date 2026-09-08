import Workspace from '@/components/Workspace';
import { notFound } from 'next/navigation';
const views = [
  'board',
  'tickets',
  'reports',
  'analytics',
  'team',
  'members',
  'settings',
  'submit',
  'track',
  'login',
];
export function generateStaticParams() {
  return views.map((view) => ({ view }));
}
export default async function Page({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  return (
    <Workspace
      initialView={view === 'analytics' ? 'reports' : view === 'members' ? 'team' : view}
    />
  );
}
