import './src/env-config.js';
import { healthCheck } from './src/services/heygen.js';

async function run() {
  console.log("Health check...");
  const health = await healthCheck();
  console.log("Health Check Result:");
  console.log(JSON.stringify(health.avatars, null, 2));
}
run();
