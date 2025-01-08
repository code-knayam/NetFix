const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { buildExtension, incrementVersion, updateReadmeVersion } = require('./build-utils');

async function createBundle() {
    try {
        // Update version in manifest
        const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const oldVersion = manifest.version;
        manifest.version = incrementVersion(oldVersion);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`Version bumped from ${oldVersion} to ${manifest.version}`);

        // Update README version
        updateReadmeVersion(manifest.version);

        // Build the extension
        const distDir = await buildExtension(true);

        // Create uploads directory
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }

        // Create zip file
        const zipFileName = `netflix-extension-v${manifest.version}.zip`;
        const output = fs.createWriteStream(path.join(uploadsDir, zipFileName));
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`\nArchive ${zipFileName} created successfully!`);
            console.log('Total bytes:', archive.pointer());
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Warning:', err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(distDir, false);
        await archive.finalize();

    } catch (error) {
        console.error('Bundle process failed:', error);
        process.exit(1);
    }
}

createBundle(); 