const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Project Sync...');

// 1. Ask for Commit Message
rl.question('📝 Enter commit message: ', (message) => {
  if (!message) {
    console.log('\x1b[31m%s\x1b[0m', '❌ Commit message cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const command = `git add . && git commit -m "${message}" && git push`;

  console.log('\x1b[33m%s\x1b[0m', '⏳ Processing git commands...');

  // 2. Execute Git Commands
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      rl.close();
      return;
    }
    if (stderr) {
      // Git often outputs to stderr even on success, so we check content
      if (stderr.includes('error') || stderr.includes('fatal')) {
         console.error(`\x1b[31mGit Error: ${stderr}\x1b[0m`);
      } else {
         console.log(`\x1b[32mGit Output:\n${stderr}\x1b[0m`);
      }
    }
    
    console.log(`\x1b[32m${stdout}\x1b[0m`);
    console.log('\x1b[36m%s\x1b[0m', '✅ Sync Complete! Changes pushed to repo.');
    rl.close();
  });
});