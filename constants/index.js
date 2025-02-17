const fs = require('fs');
const path = require('path');

const constantsDir = path.join(__dirname, './');

const constants = {};

// Read all JSON files inside the `constants` folder
fs.readdirSync(constantsDir).forEach((file) => {
    if (file.endsWith('.json')) {
        const key = file.replace('.json', ''); // Remove .json extension
        const filePath = path.join(constantsDir, file);
        
        // ✅ Load the JSON content directly instead of nesting it
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // ✅ If the JSON contains only one key, extract its content instead of nesting
        if (Object.keys(jsonData).length === 1) {
            constants[key] = Object.values(jsonData)[0]; // Extract inner array/object
        } else {
            constants[key] = jsonData;
        }
    }
});

module.exports = constants;