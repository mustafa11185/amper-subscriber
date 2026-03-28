/**
 * Migration script: convert old 6-digit access codes to new GOV-DIST-SEQ-PRIVACY format.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/migrate-codes.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Inline province codes (no Next.js imports) ──
const PROVINCE_CODES: Record<string, string> = {
  baghdad: "BG", basra: "BS", nineveh: "MO",
  erbil: "ER", sulaymaniyah: "SL", kirkuk: "KK",
  diyala: "DY", anbar: "AN", saladin: "SD",
  najaf: "NJ", karbala: "KB", babylon: "BB",
  wasit: "WS", dhi_qar: "DQ", maysan: "MY",
  muthanna: "MT", qadisiyah: "QD", dohuk: "DH",
};

// ── Inline district num lookup ──
const DISTRICT_NUMS: Record<string, Record<string, string>> = {
  baghdad: { karkh: "01", rasafa: "02", kadhimiya: "03", adhamiya: "04", krada: "05", mansour: "06", dora: "07", sadr: "08", shaab: "09" },
  basra: { markaz: "01", zubair: "02", abul_khaseeb: "03", qurna: "04", midaina: "05" },
  nineveh: { mosul: "01", tal_afar: "02", sinjar: "03", hamdaniya: "04", baashiqa: "05" },
  kirkuk: { markaz: "01", hawija: "02", dibis: "03" },
  diyala: { baquba: "01", khanaqin: "02", mandali: "03" },
  wasit: { kut: "01", numaniyah: "02", suwaira: "03" },
};

function getGovCode(provinceKey: string | null): string {
  return PROVINCE_CODES[provinceKey ?? ""] ?? "BG";
}

function getDistCode(provinceKey: string | null, districtKey: string | null): string {
  const prov = provinceKey ?? "";
  const dist = districtKey ?? "";
  return DISTRICT_NUMS[prov]?.[dist] ?? "01";
}

function generatePrivacy(): string {
  return String(Math.floor(Math.random() * 900 + 100));
}

function generateAccessCode(
  provinceKey: string | null,
  districtKey: string | null,
  seq: number
): string {
  const gov = getGovCode(provinceKey);
  const dist = getDistCode(provinceKey, districtKey);
  const seqStr = seq.toString().padStart(3, "0");
  const privacy = generatePrivacy();
  return `${gov}-${dist}-${seqStr}-${privacy}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Connecting to:", dbUrl.replace(/:[^@]*@/, ":***@"));

  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connected ✓");

    // Get all branches
    const branches = await prisma.branch.findMany({
      where: { is_active: true },
      select: { id: true, name: true, province_key: true, district_key: true },
    });
    console.log(`Found ${branches.length} branches`);

    let migrated = 0;
    let skipped = 0;
    let total = 0;

    for (const branch of branches) {
      // Get subscribers for this branch, ordered by creation date
      const subscribers = await prisma.subscriber.findMany({
        where: { branch_id: branch.id, is_active: true },
        orderBy: { created_at: "asc" },
        select: { id: true, name: true, access_code: true },
      });

      console.log(`\nBranch: ${branch.name} (${subscribers.length} subscribers)`);
      console.log(`  Province: ${branch.province_key || "null"}, District: ${branch.district_key || "null"}`);

      for (let i = 0; i < subscribers.length; i++) {
        const sub = subscribers[i];
        total++;
        const seq = i + 1;

        // Skip if already in new format (contains hyphens)
        if (sub.access_code && sub.access_code.includes("-")) {
          console.log(`  [SKIP] ${sub.name}: ${sub.access_code} (already migrated)`);
          skipped++;
          continue;
        }

        // Generate new code
        let newCode = generateAccessCode(branch.province_key, branch.district_key, seq);

        // Check uniqueness
        for (let attempt = 0; attempt < 20; attempt++) {
          const exists = await prisma.subscriber.findFirst({
            where: { access_code: newCode, id: { not: sub.id } },
          });
          if (!exists) break;
          newCode = generateAccessCode(branch.province_key, branch.district_key, seq);
        }

        // Update
        await prisma.subscriber.update({
          where: { id: sub.id },
          data: { access_code: newCode },
        });

        console.log(`  [OK] ${sub.name}: ${sub.access_code || "null"} → ${newCode}`);
        migrated++;
      }
    }

    console.log(`\n════════════════════════════════`);
    console.log(`Total: ${total} | Migrated: ${migrated} | Skipped: ${skipped}`);
    console.log(`════════════════════════════════`);
  } catch (err) {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
