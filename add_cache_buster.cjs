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
        
        // Find axios.get(`${scriptUrl}?sheet=${someVariable}`)
        // Ensure it doesn't already have &t=
        // Using a regex with lookahead or just simple string replacement
        const regex = /axios\.get\(\`\$\{scriptUrl\}\?sheet=\$\{([^\}]+)\}\`\)/g;
        
        content = content.replace(regex, (match, variable) => {
            changed = true;
            return `axios.get(\`\${scriptUrl}?sheet=\${${variable}}&t=\${Date.now()}\`)`;
        });
        
        // Handle encoded URI version
        const regexEncoded = /axios\.get\(\`\$\{scriptUrl\}\?sheet=\$\{encodeURIComponent\(([^\)]+)\)\}\`\)/g;
        content = content.replace(regexEncoded, (match, variable) => {
            changed = true;
            return `axios.get(\`\${scriptUrl}?sheet=\${encodeURIComponent(${variable})}&t=\${Date.now()}\`)`;
        });

        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Added cache buster to ' + file);
        }
    });
    console.log('Done adding cache busters.');
} catch (e) {
    console.error(e);
}
