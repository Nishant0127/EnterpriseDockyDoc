/**
 * One-time provisioning script — adds nishant@metalmanauto.com as OWNER
 * of the first workspace in the database.
 *
 * Run from the api/ directory:
 *   node provision-user.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const EMAIL = 'nishant@metalmanauto.com';
const FIRST = 'Nishant';
const LAST  = 'Jairath';

async function main() {
  // Find or create the user
  let user = await p.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    user = await p.user.create({
      data: { email: EMAIL, firstName: FIRST, lastName: LAST, isActive: true },
    });
    console.log('Created user:', user.id);
  } else {
    console.log('Found existing user:', user.id, user.email);
  }

  // Use the first workspace (Acme Corp in seeded data)
  const ws = await p.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!ws) throw new Error('No workspace found — run the seed first.');
  console.log('Workspace:', ws.name, '(' + ws.id + ')');

  // Upsert membership as OWNER
  const existing = await p.workspaceUser.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: ws.id } },
  });

  if (existing) {
    await p.workspaceUser.update({
      where: { id: existing.id },
      data: { role: 'OWNER', status: 'ACTIVE' },
    });
    console.log('Updated existing membership → OWNER');
  } else {
    await p.workspaceUser.create({
      data: { userId: user.id, workspaceId: ws.id, role: 'OWNER', status: 'ACTIVE' },
    });
    console.log('Created OWNER membership');
  }

  console.log('\nDone! ' + EMAIL + ' is now OWNER of "' + ws.name + '".');
  await p.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
