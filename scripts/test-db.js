import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const result = await sql`SELECT version()`;
    console.log("Success! DB Version:", result[0].version);
  } catch (error) {
    console.error("DB Connection Error:", error);
  }
}

main();
