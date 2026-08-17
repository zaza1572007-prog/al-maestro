import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}
const adapter = new PrismaPg({ connectionString });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const safeSettingsSelect: Prisma.SystemSettingsSelect = {
  id: true,
  platformName: true,
  isRegistrationOpen: true,
  logo: true,
  favicon: true,
  primaryColor: true,
  secondaryColor: true,
  backgroundImage: true,
  welcomeMessage: true,
  loginBackground: true,
  enableWhatsApp: true,
  autoSendCredentials: true,
  lateThreshold: true,
  enableDarkMode: true,
  waGatewayUrl: true,
  waApiToken: true,
  waSenderNumber: true,
  waTplStudent: true,
  waTplParent: true,
  waTplAttendance: true,
  waTplAbsent: true,
  waTplMonthlyReport: true,
  waTplPayment: true,
  waTplReminder: true,
  contactPhone: true,
  contactWhatsapp: true,
  motivationQuote: true,
  portraitOpacity: true,
  portraitScale: true,
  portraitPosition: true,
  portraitConfig: true,
  logoScale: true,
  autoSendEnabled: true,
  sendMode: true,
  scheduledDay: true,
  scheduledTime: true,
  createdAt: true,
  updatedAt: true,
};

