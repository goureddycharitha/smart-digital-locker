/**
 * Database Inspector for Smart Digital Locker (MySQL 8)
 */
const { execSync } = require('child_process');

try {
  console.log('\n============================================================');
  console.log('   SMART DIGITAL LOCKER - MYSQL DATABASE STATUS');
  console.log('============================================================\n');

  const mysqlCmd = '"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -proot smart_digital_locker -e';
  
  console.log('--- USERS TABLE (Preserved & Migrated Records) ---');
  const usersOutput = execSync(`${mysqlCmd} "SELECT id, full_name, email, role, created_at FROM users;"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  console.log(usersOutput);

  console.log('--- DOCUMENTS TABLE (Active Vault Files) ---');
  const docsOutput = execSync(`${mysqlCmd} "SELECT id, user_id, title, category, original_file_name, file_size, uploaded_at FROM documents;"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  console.log(docsOutput);

} catch (err) {
  console.error('Failed to query MySQL database:', err.message);
}
