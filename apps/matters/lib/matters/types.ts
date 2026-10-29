import type {
  ClientKind,
  MatterPartyRole,
  MatterStatus,
} from "@/lib/db/schema";

export type MatterListItem = {
  id: string;
  title: string;
  reference: string;
  fileNumber: string;
  subject: string;
  status: MatterStatus;
  clientId: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientListItem = {
  id: string;
  name: string;
  kind: ClientKind;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
};

export type StaffListItem = {
  id: string;
  name: string;
};

export type MatterPartyItem = {
  id: string;
  role: MatterPartyRole;
  kind: ClientKind;
  name: string;
  firstName: string;
  lastName: string;
  city: string;
};

export type MatterDetail = {
  id: string;
  clientId: string;
  clientName: string;
  clientKind: ClientKind;
  clientFirstName: string;
  clientLastName: string;
  clientStreet: string;
  clientPostalCode: string;
  clientCity: string;
  title: string;
  fileNumber: string;
  subject: string;
  legalArea: string;
  lawyerId: string | null;
  lawyerName: string;
  assistantId: string | null;
  assistantName: string;
  openedAt: string;
  status: MatterStatus;
  closedAt: string | null;
  amountInDispute: string;
  proceedingInstance: string;
  courtName: string;
  courtFileNumber: string;
  notes: string;
  parties: MatterPartyItem[];
};

export type MatterCardInput = {
  title: string;
  subject: string;
  legalArea: string;
  lawyerId: string | null;
  assistantId: string | null;
  openedAt: string;
  status: MatterStatus;
  closedAt: string | null;
  amountInDispute: string;
  proceedingInstance: string;
  courtName: string;
  courtFileNumber: string;
  notes: string;
  clientKind: ClientKind;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientStreet: string;
  clientPostalCode: string;
  clientCity: string;
};

export type CreateMatterInput = {
  clientId?: string;
  clientKind?: ClientKind;
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientStreet?: string;
  clientPostalCode?: string;
  clientCity?: string;
  opponentName?: string;
  subject?: string;
  title?: string;
  legalArea?: string;
  courtName?: string;
  courtFileNumber?: string;
  amountInDispute?: string;
  lawyerId?: string | null;
  assistantId?: string | null;
  collisionReason?: string;
};

export type { MatterCollisionMatch } from "@/lib/db/schema";
