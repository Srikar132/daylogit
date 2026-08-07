import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Recreating tables 'sections' and 'entries' with section_id foreign key...");

  await sql`DROP TABLE IF EXISTS entries CASCADE;`;
  await sql`DROP TABLE IF EXISTS sections CASCADE;`;

  await sql`
    CREATE TABLE sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      date DATE,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      title TEXT,
      summary TEXT NOT NULL,
      section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    );
  `;

  await sql`INSERT INTO sections (name, "order") VALUES ('My Tasks', 0);`;

  console.log("Database schema recreated successfully in Neon Postgres!");
}

main().catch(console.error);
