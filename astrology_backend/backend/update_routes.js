#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const routeFile = path.join(process.cwd(), 'src/routes/comprehensiveAstrology.js');
let content = fs.readFileSync(routeFile, 'utf8');

// Replace all instances of astrologyFactory. with getAstrologyFactory().astrologyFactory.
// But we need to be careful not to replace the function definition
const updatedContent = content.replace(
    /(const astrologyFactory = getAstrologyFactory\(\);[\s\S]*?)(astrologyFactory\.)/g,
    '$1$2'
);

// Now replace all remaining astrologyFactory. with getAstrologyFactory().astrologyFactory.
const finalContent = updatedContent.replace(
    /(?<!const astrologyFactory = getAstrologyFactory\(\);[\s\S]*?)(astrologyFactory\.)/g,
    'getAstrologyFactory().$1'
);

fs.writeFileSync(routeFile, finalContent);
console.log('✅ Updated all astrologyFactory references in comprehensiveAstrology.js');
