import {
  PrismaClient,
  WorkspaceType,
  WorkspaceUserRole,
  WorkspaceUserStatus,
  DocumentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ================================================================== //
  // Users
  // ================================================================== //

  const alice = await prisma.user.upsert({
    where: { email: 'alice@acmecorp.com' },
    update: {},
    create: { email: 'alice@acmecorp.com', firstName: 'Alice', lastName: 'Chen', isActive: true },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@acmecorp.com' },
    update: {},
    create: { email: 'bob@acmecorp.com', firstName: 'Bob', lastName: 'Martinez', isActive: true },
  });
  const carol = await prisma.user.upsert({
    where: { email: 'carol@acmecorp.com' },
    update: {},
    create: { email: 'carol@acmecorp.com', firstName: 'Carol', lastName: 'Nguyen', isActive: true },
  });
  const dave = await prisma.user.upsert({
    where: { email: 'dave@personal.com' },
    update: {},
    create: { email: 'dave@personal.com', firstName: 'Dave', lastName: 'Kim', isActive: true },
  });
  console.log(`Users: ${alice.email}, ${bob.email}, ${carol.email}, ${dave.email}`);

  // ================================================================== //
  // Workspaces
  // ================================================================== //

  const acme = await prisma.workspace.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: { name: 'Acme Corporation', slug: 'acme-corp', type: WorkspaceType.ENTERPRISE },
  });
  const daveWs = await prisma.workspace.upsert({
    where: { slug: 'dave-personal' },
    update: {},
    create: { name: "Dave's Workspace", slug: 'dave-personal', type: WorkspaceType.PERSONAL },
  });
  console.log(`Workspaces: "${acme.name}", "${daveWs.name}"`);

  // ================================================================== //
  // Workspace memberships
  // ================================================================== //

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: alice.id, workspaceId: acme.id } },
    update: {},
    create: { userId: alice.id, workspaceId: acme.id, role: WorkspaceUserRole.OWNER, status: WorkspaceUserStatus.ACTIVE },
  });
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: bob.id, workspaceId: acme.id } },
    update: {},
    create: { userId: bob.id, workspaceId: acme.id, role: WorkspaceUserRole.ADMIN, status: WorkspaceUserStatus.ACTIVE },
  });
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: carol.id, workspaceId: acme.id } },
    update: {},
    create: { userId: carol.id, workspaceId: acme.id, role: WorkspaceUserRole.EDITOR, status: WorkspaceUserStatus.ACTIVE },
  });
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: dave.id, workspaceId: daveWs.id } },
    update: {},
    create: { userId: dave.id, workspaceId: daveWs.id, role: WorkspaceUserRole.OWNER, status: WorkspaceUserStatus.ACTIVE },
  });
  // Alice is a VIEWER in Dave's workspace so workspace switching is testable
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: alice.id, workspaceId: daveWs.id } },
    update: {},
    create: { userId: alice.id, workspaceId: daveWs.id, role: WorkspaceUserRole.VIEWER, status: WorkspaceUserStatus.ACTIVE },
  });
  console.log('Workspace memberships created');

  // ================================================================== //
  // Tags (Acme workspace)
  // ================================================================== //

  const tagLegal = await prisma.documentTag.upsert({
    where: { id: 'tag-legal' },
    update: {},
    create: { id: 'tag-legal', workspaceId: acme.id, name: 'Legal', color: '#6366f1' },
  });
  const tagCompliance = await prisma.documentTag.upsert({
    where: { id: 'tag-compliance' },
    update: {},
    create: { id: 'tag-compliance', workspaceId: acme.id, name: 'Compliance', color: '#10b981' },
  });
  const tagHR = await prisma.documentTag.upsert({
    where: { id: 'tag-hr' },
    update: {},
    create: { id: 'tag-hr', workspaceId: acme.id, name: 'HR', color: '#f59e0b' },
  });
  const tagConfidential = await prisma.documentTag.upsert({
    where: { id: 'tag-confidential' },
    update: {},
    create: { id: 'tag-confidential', workspaceId: acme.id, name: 'Confidential', color: '#ef4444' },
  });
  console.log('Tags created');

  // ================================================================== //
  // Folders (Acme workspace)
  // ================================================================== //

  const folderLegal = await prisma.folder.upsert({
    where: { id: 'folder-legal' },
    update: {},
    create: {
      id: 'folder-legal',
      workspaceId: acme.id,
      name: 'Legal',
      parentFolderId: null,
      createdById: alice.id,
    },
  });
  const folderCompliance = await prisma.folder.upsert({
    where: { id: 'folder-compliance' },
    update: {},
    create: {
      id: 'folder-compliance',
      workspaceId: acme.id,
      name: 'Compliance',
      parentFolderId: null,
      createdById: alice.id,
    },
  });
  const folderHR = await prisma.folder.upsert({
    where: { id: 'folder-hr' },
    update: {},
    create: {
      id: 'folder-hr',
      workspaceId: acme.id,
      name: 'HR',
      parentFolderId: null,
      createdById: bob.id,
    },
  });
  const folderContracts = await prisma.folder.upsert({
    where: { id: 'folder-contracts' },
    update: {},
    create: {
      id: 'folder-contracts',
      workspaceId: acme.id,
      name: 'Contracts',
      parentFolderId: folderLegal.id, // child of Legal
      createdById: alice.id,
    },
  });
  console.log('Folders created');

  // ================================================================== //
  // Documents + Versions
  // ================================================================== //

  // Helper to upsert a doc + initial version idempotently
  async function upsertDocument(params: {
    id: string;
    name: string;
    fileName: string;
    fileType: string;
    mimeType: string;
    folderId: string | null;
    ownerUserId: string;
    description?: string;
    status?: DocumentStatus;
    currentVersionNumber?: number;
  }) {
    const doc = await prisma.document.upsert({
      where: { id: params.id },
      update: {},
      create: {
        id: params.id,
        workspaceId: acme.id,
        folderId: params.folderId,
        ownerUserId: params.ownerUserId,
        name: params.name,
        description: params.description ?? null,
        fileName: params.fileName,
        fileType: params.fileType,
        status: params.status ?? DocumentStatus.ACTIVE,
        currentVersionNumber: params.currentVersionNumber ?? 1,
      },
    });

    // v1 always present
    await prisma.documentVersion.upsert({
      where: { documentId_versionNumber: { documentId: doc.id, versionNumber: 1 } },
      update: {},
      create: {
        documentId: doc.id,
        versionNumber: 1,
        storageKey: `uploads/${acme.id}/${doc.id}/v1/${params.fileName}`,
        fileSizeBytes: BigInt(204800), // 200 KB placeholder
        mimeType: params.mimeType,
        uploadedById: params.ownerUserId,
      },
    });

    return doc;
  }

  // 1. Vendor Agreement FY26 — in Contracts folder, 2 versions
  const docVendor = await upsertDocument({
    id: 'doc-vendor-agreement',
    name: 'Vendor Agreement FY26',
    fileName: 'vendor_agreement_fy26.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    folderId: folderContracts.id,
    ownerUserId: alice.id,
    description: 'Master vendor agreement for FY2026, covering all Tier-1 suppliers.',
    currentVersionNumber: 2,
  });
  // v2 for vendor agreement
  await prisma.documentVersion.upsert({
    where: { documentId_versionNumber: { documentId: docVendor.id, versionNumber: 2 } },
    update: {},
    create: {
      documentId: docVendor.id,
      versionNumber: 2,
      storageKey: `uploads/${acme.id}/${docVendor.id}/v2/vendor_agreement_fy26_v2.pdf`,
      fileSizeBytes: BigInt(215040), // 210 KB
      mimeType: 'application/pdf',
      uploadedById: bob.id,
    },
  });

  // 2. ISO 9001 Certificate — in Compliance folder
  const docISO = await upsertDocument({
    id: 'doc-iso-cert',
    name: 'ISO 9001 Certificate',
    fileName: 'iso_9001_certificate_2024.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    folderId: folderCompliance.id,
    ownerUserId: alice.id,
    description: 'ISO 9001:2015 quality management system certification, valid until 2027.',
  });

  // 3. Employee NDA Template — in HR folder
  const docNDA = await upsertDocument({
    id: 'doc-nda-template',
    name: 'Employee NDA Template',
    fileName: 'employee_nda_template.docx',
    fileType: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    folderId: folderHR.id,
    ownerUserId: carol.id,
    description: 'Standard non-disclosure agreement for new hires and contractors.',
  });

  // 4. Plant Insurance Policy — in Legal folder
  const docInsurance = await upsertDocument({
    id: 'doc-insurance-policy',
    name: 'Plant Insurance Policy',
    fileName: 'plant_insurance_policy_2025.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    folderId: folderLegal.id,
    ownerUserId: bob.id,
    description: 'Comprehensive property and liability insurance for manufacturing facilities.',
  });

  // 5. Employee Handbook — in HR folder, 2 versions
  const docHandbook = await upsertDocument({
    id: 'doc-employee-handbook',
    name: 'Employee Handbook',
    fileName: 'employee_handbook_2025.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    folderId: folderHR.id,
    ownerUserId: carol.id,
    description: 'Company policies, benefits, and code of conduct for all employees.',
    currentVersionNumber: 2,
  });
  await prisma.documentVersion.upsert({
    where: { documentId_versionNumber: { documentId: docHandbook.id, versionNumber: 2 } },
    update: {},
    create: {
      documentId: docHandbook.id,
      versionNumber: 2,
      storageKey: `uploads/${acme.id}/${docHandbook.id}/v2/employee_handbook_2025_v2.pdf`,
      fileSizeBytes: BigInt(512000), // 500 KB
      mimeType: 'application/pdf',
      uploadedById: carol.id,
    },
  });

  console.log('Documents and versions created');

  // ================================================================== //
  // Tag mappings
  // ================================================================== //

  async function addTag(documentId: string, tagId: string) {
    await prisma.documentTagMapping.upsert({
      where: { documentId_tagId: { documentId, tagId } },
      update: {},
      create: { documentId, tagId },
    });
  }

  await addTag(docVendor.id, tagLegal.id);
  await addTag(docVendor.id, tagConfidential.id);
  await addTag(docISO.id, tagCompliance.id);
  await addTag(docNDA.id, tagHR.id);
  await addTag(docNDA.id, tagConfidential.id);
  await addTag(docInsurance.id, tagLegal.id);
  await addTag(docHandbook.id, tagHR.id);
  console.log('Tag mappings created');

  // ================================================================== //
  // Document metadata
  // ================================================================== //

  async function addMeta(documentId: string, key: string, value: string) {
    // metadata has no unique key constraint, so we check first
    const existing = await prisma.documentMetadata.findFirst({
      where: { documentId, key },
    });
    if (!existing) {
      await prisma.documentMetadata.create({ data: { documentId, key, value } });
    }
  }

  await addMeta(docVendor.id, 'department', 'Finance');
  await addMeta(docVendor.id, 'expiresAt', '2026-12-31');
  await addMeta(docVendor.id, 'signedBy', 'Alice Chen');
  await addMeta(docVendor.id, 'counterparty', 'GlobalSupply Ltd.');

  await addMeta(docISO.id, 'certNumber', 'ISO-9001-2024-AE7712');
  await addMeta(docISO.id, 'issuedBy', 'Bureau Veritas');
  await addMeta(docISO.id, 'validUntil', '2027-04-30');

  await addMeta(docNDA.id, 'jurisdiction', 'State of California');
  await addMeta(docNDA.id, 'reviewedBy', 'Legal Team');

  await addMeta(docInsurance.id, 'provider', 'Marsh & McLennan');
  await addMeta(docInsurance.id, 'policyNumber', 'MM-2025-88123');
  await addMeta(docInsurance.id, 'coverageAmount', '$5,000,000');

  console.log('Document metadata created');

  // ================================================================== //
  // Summary
  // ================================================================== //

  console.log('\nSeed complete.\n');
  console.log('Users:');
  console.log('  alice@acmecorp.com  (Acme: OWNER, Dave\'s: VIEWER)');
  console.log('  bob@acmecorp.com    (Acme: ADMIN)');
  console.log('  carol@acmecorp.com  (Acme: EDITOR)');
  console.log('  dave@personal.com   (Personal: OWNER)');
  console.log('\nWorkspaces:');
  console.log('  Acme Corporation (ENTERPRISE)');
  console.log("  Dave's Workspace (PERSONAL)");
  console.log('\nFolders in Acme:');
  console.log('  Legal/');
  console.log('    Contracts/');
  console.log('  Compliance/');
  console.log('  HR/');
  console.log('\nDocuments in Acme:');
  console.log('  Vendor Agreement FY26        (v2, Legal/Contracts)');
  console.log('  ISO 9001 Certificate         (v1, Compliance)');
  console.log('  Employee NDA Template        (v1, HR)');
  console.log('  Plant Insurance Policy       (v1, Legal)');
  console.log('  Employee Handbook            (v2, HR)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
