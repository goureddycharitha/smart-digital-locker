const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const defaultMavenPath = path.resolve(process.env.USERPROFILE || 'C:\\Users\\gchar', '.m2/apache-maven-3.9.9/bin/mvn.cmd');
const mvnCmd = fs.existsSync(defaultMavenPath) ? defaultMavenPath : 'mvn';

const args = process.argv.slice(2);
const result = spawnSync(mvnCmd, args, { stdio: 'inherit', shell: true });
process.exit(result.status || 0);
