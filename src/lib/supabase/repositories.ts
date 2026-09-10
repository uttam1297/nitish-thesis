import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/server-client";
import { ConsentRepository } from "@/lib/supabase/consent-repository";
import { ParticipantRepository } from "@/lib/supabase/participant-repository";
import { ResponseRepository } from "@/lib/supabase/response-repository";
import { SessionRepository } from "@/lib/supabase/session-repository";
import { StudyRepository } from "@/lib/supabase/study-repository";

export interface ResearchRepositories {
  participants: ParticipantRepository;
  sessions: SessionRepository;
  responses: ResponseRepository;
  consent: ConsentRepository;
  study: StudyRepository;
}

export function createRepositories(): ResearchRepositories {
  const client = getSupabaseServiceClient();
  return {
    participants: new ParticipantRepository(client),
    sessions: new SessionRepository(client),
    responses: new ResponseRepository(client),
    consent: new ConsentRepository(client),
    study: new StudyRepository(client),
  };
}
