import Workspace from '@/components/Workspace';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return ['categories', 'roles', 'projects'].map((section) => ({ section }));
}
export default async function SettingsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!['categories', 'roles', 'projects'].includes(section)) notFound();
  return <Workspace initialView="settings" initialSettings={section} />;
}
