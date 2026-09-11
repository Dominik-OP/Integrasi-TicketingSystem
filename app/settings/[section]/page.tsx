import Workspace from '@/components/Workspace';
import { notFound } from 'next/navigation';

const sections = ['categories', 'roles', 'projects', 'appearance'];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function SettingsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <Workspace initialView="settings" initialSettings={section} />;
}
