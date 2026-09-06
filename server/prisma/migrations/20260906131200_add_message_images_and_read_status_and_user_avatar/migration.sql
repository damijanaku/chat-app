-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'text',
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;
