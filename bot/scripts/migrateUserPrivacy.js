import { migrateAllPrivacyData } from "../services/privacyMigrationService.js";

async function main() {
  const changedFiles = await migrateAllPrivacyData();

  console.log(JSON.stringify({
    changed: changedFiles.length > 0,
    changedFiles
  }, null, 2));
}

await main();
