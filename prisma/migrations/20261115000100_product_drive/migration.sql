CREATE TABLE "ProductDriveConnection" (
    "environment" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPermissionId" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "rootFolderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductDriveConnection_pkey" PRIMARY KEY ("environment")
);
CREATE TABLE "ProductDriveFolder" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductDriveFolder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductDriveUpload" (
    "id" TEXT NOT NULL,
    "folderRecordId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "encryptedSession" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductDriveUpload_pkey" PRIMARY KEY ("id")
);
CREATE TYPE "DriveDeliveryStatus" AS ENUM ('PENDING_ACCESS', 'GRANTED', 'PENDING_REVOCATION', 'REVOKED');
CREATE TABLE "DriveProductDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "pendingRecipientEmail" TEXT,
    "status" "DriveDeliveryStatus" NOT NULL DEFAULT 'PENDING_ACCESS',
    "grantedAt" TIMESTAMP(3),
    "grantedBy" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriveProductDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductDriveFolder_folderId_key" ON "ProductDriveFolder"("folderId");
CREATE UNIQUE INDEX "ProductDriveFolder_environment_productId_key" ON "ProductDriveFolder"("environment", "productId");
CREATE UNIQUE INDEX "ProductDriveUpload_fileId_key" ON "ProductDriveUpload"("fileId");
CREATE UNIQUE INDEX "ProductDriveUpload_folderRecordId_fileKey_sha256_key" ON "ProductDriveUpload"("folderRecordId", "fileKey", "sha256");
CREATE UNIQUE INDEX "DriveProductDelivery_orderId_key" ON "DriveProductDelivery"("orderId");
CREATE INDEX "DriveProductDelivery_environment_folderId_recipientEmail_st_idx" ON "DriveProductDelivery"("environment", "folderId", "recipientEmail", "status");
ALTER TABLE "ProductDriveUpload" ADD CONSTRAINT "ProductDriveUpload_folderRecordId_fkey" FOREIGN KEY ("folderRecordId") REFERENCES "ProductDriveFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriveProductDelivery" ADD CONSTRAINT "DriveProductDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
