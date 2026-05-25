-- Remove campo fotoDriveId do Morador (integração com Google Drive removida)
ALTER TABLE "moradores" DROP COLUMN IF EXISTS "foto_drive_id";
