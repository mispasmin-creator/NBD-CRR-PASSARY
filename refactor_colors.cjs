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
            if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
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
        
        // Replace main dark green with Deep Indigo
        if (content.includes('#194D33')) {
            content = content.replace(/#194D33/gi, '#4F46E5');
            changed = true;
        }
        
        // Replace hover dark green with Indigo 700
        if (content.includes('#123B28')) {
            content = content.replace(/#123B28/gi, '#4338CA');
            changed = true;
        }
        
        // Replace active dark green with Indigo 800
        if (content.includes('#0E2D1E')) {
            content = content.replace(/#0E2D1E/gi, '#3730A3');
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated ' + file);
        }
    });
    console.log('Done refactoring colors.');
} catch (e) {
    console.error(e);
}
