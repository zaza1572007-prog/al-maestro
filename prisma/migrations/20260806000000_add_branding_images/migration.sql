-- Add branding image columns to SystemSettings
-- These store base64-encoded images to support Vercel's read-only filesystem
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "portraitBase64" TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "logoBase64" TEXT;
