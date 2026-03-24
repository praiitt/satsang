const { execSync } = require('child_process');

try {
  const output = execSync('gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=satsang-frontend" --limit=20 --format=json', { maxBuffer: 1024 * 1024 * 10 });
  const logs = JSON.parse(output.toString());
  logs.forEach(log => {
      // Look for errors or interesting lines
      if (log.severity === 'ERROR' || log.textPayload?.includes('Error') || (log.jsonPayload && JSON.stringify(log.jsonPayload).includes('Error'))) {
          console.log("---- ERROR LOG ----");
          console.log(log.textPayload || JSON.stringify(log.jsonPayload, null, 2));
      }
  });
  console.log("Done checking recent logs.");
} catch (e) {
  console.error("Failed to read logs", e.message);
}
