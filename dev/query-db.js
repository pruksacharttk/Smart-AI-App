import Database from 'better-sqlite3';

function main() {
  const db = new Database('./data/smart-ai-app.sqlite');

  console.log('llm_usage columns:');
  const cols = db.prepare("PRAGMA table_info(llm_usage)").all();
  console.log(cols);

  console.log('\nAll llm_usage rows:');
  const rows = db.prepare("SELECT * FROM llm_usage ORDER BY id DESC LIMIT 10").all();
  rows.forEach(row => {
    console.log(`\n=== ROW ID: ${row.id} ===`);
    for (const key in row) {
      if (typeof row[key] === 'string' && row[key].length > 400) {
        console.log(`${key}: ${row[key].slice(0, 400)}... (truncated, total: ${row[key].length})`);
      } else {
        console.log(`${key}:`, row[key]);
      }
    }
  });
}

main();
