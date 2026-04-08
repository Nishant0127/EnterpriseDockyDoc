import { PrismaClient, WorkspaceType, WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ------------------------------------------------------------------ //
  // Users
  // ------------------------------------------------------------------ //

  const alice = await prisma.user.upsert({
    where: { email: 'alice@acmecorp.com' },
    update: {},
    create: {
      email: 'alice@acmecorp.com',
      firstName: 'Alice',
      lastName: 'Chen',
      isActive: true,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@acmecorp.com' },
    update: {},
    create: {
      email: 'bob@acmecorp.com',
      firstName: 'Bob',
      lastName: 'Martinez',
      isActive: true,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@acmecorp.com' },
    update: {},
    create: {
      email: 'carol@acmecorp.com',
      firstName: 'Carol',
      lastName: 'Nguyen',
      isActive: true,
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: 'dave@personal.com' },
    update: {},
    create: {
      email: 'dave@personal.com',
      firstName: 'Dave',
      lastName: 'Kim',
      isActive: true,
    },
  });

  console.log(`Created users: ${alice.email}, ${bob.email}, ${carol.email}, ${dave.email}`);

  // ------------------------------------------------------------------ //
  // Workspaces
  // ------------------------------------------------------------------ //

  const acmeWorkspace = await prisma.workspace.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      type: WorkspaceType.ENTERPRISE,
    },
  });

  const davePersonal = await prisma.workspace.upsert({
    where: { slug: 'dave-personal' },
    update: {},
    create: {
      name: "Dave's Workspace",
      slug: 'dave-personal',
      type: WorkspaceType.PERSONAL,
    },
  });

  console.log(`Created workspaces: "${acmeWorkspace.name}", "${davePersonal.name}"`);

  // ------------------------------------------------------------------ //
  // Workspace memberships
  // ------------------------------------------------------------------ //

  // Acme: Alice = OWNER, Bob = ADMIN, Carol = EDITOR
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: alice.id, workspaceId: acmeWorkspace.id } },
    update: {},
    create: {
      userId: alice.id,
      workspaceId: acmeWorkspace.id,
      role: WorkspaceUserRole.OWNER,
      status: WorkspaceUserStatus.ACTIVE,
    },
  });

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: bob.id, workspaceId: acmeWorkspace.id } },
    update: {},
    create: {
      userId: bob.id,
      workspaceId: acmeWorkspace.id,
      role: WorkspaceUserRole.ADMIN,
      status: WorkspaceUserStatus.ACTIVE,
    },
  });

  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: carol.id, workspaceId: acmeWorkspace.id } },
    update: {},
    create: {
      userId: carol.id,
      workspaceId: acmeWorkspace.id,
      role: WorkspaceUserRole.EDITOR,
      status: WorkspaceUserStatus.ACTIVE,
    },
  });

  // Dave's personal workspace: Dave = OWNER
  await prisma.workspaceUser.upsert({
    where: { userId_workspaceId: { userId: dave.id, workspaceId: davePersonal.id } },
    update: {},
    create: {
      userId: dave.id,
      workspaceId: davePersonal.id,
      role: WorkspaceUserRole.OWNER,
      status: WorkspaceUserStatus.ACTIVE,
    },
  });

  console.log('Created workspace memberships');
  console.log('\nSeed complete.');
  console.log('\nSample data:');
  console.log('  Enterprise workspace : Acme Corporation (slug: acme-corp)');
  console.log('    - alice@acmecorp.com  → OWNER');
  console.log('    - bob@acmecorp.com    → ADMIN');
  console.log('    - carol@acmecorp.com  → EDITOR');
  console.log("  Personal workspace   : Dave's Workspace (slug: dave-personal)");
  console.log('    - dave@personal.com  → OWNER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
