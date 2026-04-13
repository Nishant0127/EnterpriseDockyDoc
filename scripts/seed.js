import sql from '../src/db.js';

async function seed() {
  console.log('Seeding database...');

  const [category] = await sql`
    INSERT INTO categories (name)
    VALUES ('General')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;

  const [doc] = await sql`
    INSERT INTO documents (title, content, author)
    VALUES (
      'Welcome to EnterpriseDockyDoc',
      'This is the first document in your enterprise documentation platform.',
      'Admin'
    )
    RETURNING id
  `;

  await sql`
    INSERT INTO document_categories (document_id, category_id)
    VALUES (${doc.id}, ${category.id})
    ON CONFLICT DO NOTHING
  `;

  console.log('Seed complete. Created document id:', doc.id);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
