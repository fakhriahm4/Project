const bcrypt = require('bcrypt');

const password = 'admin123';

bcrypt.hash(password, 12).then((hash) => {
  console.log('');
  console.log('========================================');
  console.log('PASSWORD :', password);
  console.log('HASH     :', hash);
  console.log('========================================');
  console.log('');
  console.log('Copy HASH di atas, pakai untuk insert super admin.');
  console.log('');
});