import Workspace from '@/components/Workspace';

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <Workspace initialView="track" initialToken={token} />;
}
