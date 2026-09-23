-- Desk-Rollen: Steuerberater + StB-Sekretär (Practice tax)
ALTER TYPE "desk_role" ADD VALUE IF NOT EXISTS 'steuerberater';--> statement-breakpoint
ALTER TYPE "desk_role" ADD VALUE IF NOT EXISTS 'stb_sekretariat';
