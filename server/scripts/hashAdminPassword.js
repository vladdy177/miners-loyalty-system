// Run this script once to generate a bcrypt hash for the admin password.
// Usage: node scripts/hashAdminPassword.js <yourPassword>
// Then copy the printed SQL and run it against your database.

const bcrypt = require('bcryptjs');

const plaintext = process.argv[2];
if (!plaintext) {
    console.error('Usage: node scripts/hashAdminPassword.js <yourPassword>');
    process.exit(1);
}

bcrypt.hash(plaintext, 12).then(hash => {
    console.log('\nRun this SQL to update the admin password:\n');
    console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'admin';\n`);
});
