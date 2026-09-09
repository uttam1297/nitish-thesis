import { ResumeClient } from "@/app/interview/resume/resume-client";

interface ResumePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResumePage({ searchParams }: ResumePageProps) {
  const { token } = await searchParams;
  return <ResumeClient token={token ?? null} />;
}
