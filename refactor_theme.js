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
        // Replace purple with sky
        if (content.includes('purple-')) {
            content = content.replace(/purple-/g, 'sky-');
            changed = true;
        }
        // Replace pink with blue
        if (content.includes('pink-')) {
            content = content.replace(/pink-/g, 'blue-');
            changed = true;
        }
        // Specific gradient fix if needed, but the above covers classes

        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated ' + file);
        }
    });
    console.log('Done');
} catch (e) {
    console.error(e);
}
