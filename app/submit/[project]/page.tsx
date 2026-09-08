import Workspace from '@/components/Workspace';

export default async function SubmitProjectPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  return <Workspace initialView="submit" initialPublicProject={project} />;
}
