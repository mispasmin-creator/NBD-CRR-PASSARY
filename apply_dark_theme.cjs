const fs = require('fs');
const path = require('path');

function walk(dir) {
    const results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results.push(...walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

try {
    const files = walk('./src');
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let changed = false;

        const replacements = {
            'bg-white': 'bg-card',
            'bg-slate-50': 'bg-muted',
            'bg-slate-100': 'bg-muted/50',
            'border-slate-200': 'border-border',
            'border-slate-300': 'border-border',
            'text-slate-900': 'text-foreground',
            'text-slate-800': 'text-foreground',
            'text-slate-700': 'text-muted-foreground',
            'text-slate-600': 'text-muted-foreground',
            'text-slate-500': 'text-muted-foreground',
            'text-slate-400': 'text-muted-foreground',
            'hover:bg-slate-50': 'hover:bg-muted',
            'hover:bg-slate-100': 'hover:bg-accent hover:text-accent-foreground',
            'bg-[#194D33]': 'bg-primary',
            'bg-emerald-50': 'bg-primary/20',
            'text-emerald-700': 'text-primary',
            'border-emerald-200': 'border-primary/30',
            'bg-emerald-500': 'bg-primary',
            'bg-emerald-600': 'bg-primary',
            'hover:bg-emerald-700': 'hover:bg-primary/80',
            'text-emerald-600': 'text-primary'
        };

        for (const [oldClass, newClass] of Object.entries(replacements)) {
            // Use regex with word boundaries for safe replacement, ignoring cases where it might be part of another word
            const regex = new RegExp(`\\b${oldClass.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\b`, 'g');
            if (regex.test(content)) {
                content = content.replace(regex, newClass);
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated ' + file);
        }
    });
    console.log('Theme refactored successfully to dynamic semantic variables.');
} catch (e) {
    console.error(e);
}
