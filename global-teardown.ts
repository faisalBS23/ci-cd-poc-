import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Cleaning up...\n');

  // Clean up authentication state file
  const authFile = path.join('.auth', 'user.json');
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('✅ Authentication state cleaned up\n');
  }
}

export default globalTeardown;
