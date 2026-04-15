import { ALL_GURUS, TRADITION_DETAILS, DEFAULT_TRADITION_THEME } from './lib/gurus.ts';
import { en } from './lib/translations/en.ts';
import { hi } from './lib/translations/hi.ts';
import * as fs from 'fs';

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const exportedGurus = ALL_GURUS.map(guru => {
    const traditionConfig = TRADITION_DETAILS[guru.category] || DEFAULT_TRADITION_THEME;
    
    return {
        id: guru.id,
        name: {
            en: getNestedValue(en, `gurus.${guru.id}.name`) || guru.name,
            hi: getNestedValue(hi, `gurus.${guru.id}.name`) || guru.name
        },
        tagline: {
            en: getNestedValue(en, `gurus.${guru.id}.tagline`) || guru.tradition,
            hi: getNestedValue(hi, `gurus.${guru.id}.tagline`) || guru.tradition
        },
        description: {
            en: getNestedValue(en, `gurus.${guru.id}.description`) || `Connect with ${guru.name}, spiritual master of ${guru.tradition}.`,
            hi: getNestedValue(hi, `gurus.${guru.id}.description`) || `${guru.name} से जुड़ें, जो ${guru.tradition} के आध्यात्मिक गुरु हैं।`
        },
        tradition: guru.tradition,
        era: guru.era,
        category: guru.category,
        image: guru.image || null,
        icon: traditionConfig.emoji,
        route: `/${guru.category}/${guru.id}`,
        tags: [
            guru.category,
            guru.era,
            ...guru.tradition.split(/[,()\/]+/).map(t => t.trim()).filter(Boolean)
        ]
    };
});

fs.writeFileSync('gurus_export.json', JSON.stringify(exportedGurus, null, 2));
console.log('✅ Exported gurus to gurus_export.json');
