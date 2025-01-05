const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build Angular app
console.log('Building Angular app...');
exec('ng build --configuration production', async (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building Angular app: ${error}`);
    return;
  }
  console.log('Angular build complete');
  
  // Build background and content scripts
  console.log('Building extension scripts...');
  
  // Compile TypeScript files
  await new Promise((resolve, reject) => {
    exec('tsc --project tsconfig.extension.json', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error compiling TypeScript: ${error}`);
        reject(error);
        return;
      }
      resolve();
    });
  });
  
  // Ensure the dist directory exists
  const distDir = path.join(__dirname, 'dist', 'netfix');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Copy compiled files
  fs.copyFileSync(
    path.join(__dirname, 'dist', 'background.js'),
    path.join(distDir, 'background.js')
  );

  fs.copyFileSync(
    path.join(__dirname, 'src', 'netfix-logo.png'),
    path.join(distDir, 'netfix-logo.png')
  );
  
  fs.copyFileSync(
    path.join(__dirname, 'dist', 'content.js'),
    path.join(distDir, 'content.js')
  );
  
  fs.copyFileSync(
    path.join(__dirname, 'src', 'content.css'),
    path.join(distDir, 'content.css')
  );
  
  console.log('Extension build complete!');
});