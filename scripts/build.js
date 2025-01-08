const { buildExtension } = require('./build-utils');

async function main() {
    try {
        await buildExtension(false);
    } catch (error) {
        process.exit(1);
    }
}

main(); 