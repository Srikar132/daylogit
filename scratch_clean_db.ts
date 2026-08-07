import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Cleaning sections and dummy entries...");
  await sql`DELETE FROM sections;`;
  await sql`INSERT INTO sections (name, "order") VALUES ('My Logs', 0);`;
  console.log("Database reset complete! Created default 'My Logs' section.");
}

main().catch(console.error);
