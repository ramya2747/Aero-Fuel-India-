// AERO // FUEL INDIA - Static Build Packager
// Copies all production website files into the dist/ directory

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy top level web files
const topLevelFiles = ['index.html', 'privacy.html', 'terms.html', 'favicon.svg'];
topLevelFiles.forEach(file => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
});

// Copy directories
copyDir(path.join(rootDir, 'css'), path.join(distDir, 'css'));
copyDir(path.join(rootDir, 'js'), path.join(distDir, 'js'));

// Ensure backend database migrations (sql folder) are not included in public static dist
const distSql = path.join(distDir, 'sql');
if (fs.existsSync(distSql)) {
  fs.rmSync(distSql, { recursive: true, force: true });
}

// Netlify environment variable injection if building in CI
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const configPath = path.join(distDir, 'js', 'config.js');
  const configContent = `// AERO // FUEL INDIA - Injected Production Configuration
window.AERO_CONFIG = {
  SUPABASE_URL: '${process.env.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}'
};
`;
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('Injected Supabase environment variables into dist/js/config.js');
}

console.log('Build package completed successfully.');
console.log('Production files prepared in:', distDir);

