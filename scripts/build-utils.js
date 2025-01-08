const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Utility functions
function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

async function buildExtension(isProd = false) {
    try {
        // Build Angular app
        console.log('Building Angular app...');
        await runCommand('ng build --configuration production');
        console.log('Angular build complete');

        // Build extension scripts
        console.log('Building extension scripts...');
        await runCommand('tsc --project tsconfig.extension.json');
        console.log('TypeScript compilation complete');

        // Ensure the dist directory exists
        const distDir = path.join(__dirname, '..', 'dist', 'netfix');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        // Copy compiled files
        await copyExtensionFiles(distDir);
        
        console.log('Extension build complete!');
        return distDir;
    } catch (error) {
        console.error('Build failed:', error);
        throw error;
    }
}

function copyExtensionFiles(distDir) {
    const copies = [
        ['dist/background.js', 'background.js'],
        ['src/netfix-logo.png', 'netfix-logo.png'],
        ['dist/content.js', 'content.js'],
        ['src/content.css', 'content.css']
    ];

    copies.forEach(([src, dest]) => {
        fs.copyFileSync(
            path.join(__dirname, '..', src),
            path.join(distDir, dest)
        );
    });
}

function incrementVersion(version) {
    const parts = version.split('.');
    parts[2] = (parseInt(parts[2]) + 1).toString();
    return parts.join('.');
}

function updateReadmeVersion(version) {
    const readmePath = path.join(__dirname, '..', 'README.md');
    let content = fs.readFileSync(readmePath, 'utf8');
    
    // Update version badge
    content = content.replace(
        /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d\.]+-blue\)/,
        `![Version](https://img.shields.io/badge/version-${version}-blue)`
    );
    
    fs.writeFileSync(readmePath, content);
    console.log('README version updated');
}

module.exports = {
    buildExtension,
    incrementVersion,
    runCommand,
    updateReadmeVersion
}; 