import sql from './src/db.js';

async function main() {
  console.log('Connecting to Neon...');

  const [{ now }] = await sql`SELECT NOW() AS now`;
  console.log('Connected! Server time:', now);

  const docs = await sql`SELECT id, title, author, created_at FROM documents ORDER BY created_at DESC LIMIT 10`;

  if (docs.length === 0) {
    console.log('No documents found. Run: npm run migrate && npm run seed');
  } else {
    console.log(`\nLatest ${docs.length} document(s):`);
    for (const doc of docs) {
      console.log(`  [${doc.id}] ${doc.title} — by ${doc.author} (${doc.created_at.toISOString()})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
