#!/usr/bin/env tsx
/**
 * Buzón de Sugerencias - Comedor UNSCH
 * CLI Script for Nightly Maintenance & Storage Purge
 * Executed via cron or Docker container:
 *   npx tsx scripts/nightly-cleanup.ts
 */

import { executeNightlyMaintenance } from "../src/lib/maintenance/cleanup";

async function main() {
  console.log("[Maintenance] Starting automated nightly cleanup routine...");
  try {
    const report = await executeNightlyMaintenance();
    console.log("[Maintenance] Cleanup completed successfully!");
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("[Maintenance] Cleanup failed with error:", error);
    process.exit(1);
  }
}

void main();
