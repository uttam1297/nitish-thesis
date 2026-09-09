import "server-only";

import { getSheetsClient } from "@/lib/google-sheets/client-factory";
import { ConsentRepository } from "@/lib/google-sheets/consent-repository";
import { ParticipantRepository } from "@/lib/google-sheets/participant-repository";
import { ResearchMetadataRepository } from "@/lib/google-sheets/research-metadata-repository";
import { ResponseRepository } from "@/lib/google-sheets/response-repository";
import { SessionRepository } from "@/lib/google-sheets/session-repository";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

export interface ResearchRepositories {
  participants: ParticipantRepository;
  sessions: SessionRepository;
  responses: ResponseRepository;
  consent: ConsentRepository;
  researchMetadata: ResearchMetadataRepository;
}

export function createRepositories(
  client: SheetsClient = getSheetsClient()
): ResearchRepositories {
  return {
    participants: new ParticipantRepository(client),
    sessions: new SessionRepository(client),
    responses: new ResponseRepository(client),
    consent: new ConsentRepository(client),
    researchMetadata: new ResearchMetadataRepository(client),
  };
}
