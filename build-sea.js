import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 [1/5] 构建前端静态资源 (Vite)...');
execSync('npm run build:client', { stdio: 'inherit' });

console.log('\n📦 [2/5] 打包后端 TS 代码为单文件 Bundle (esbuild)...');
if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });
execSync('npx -y esbuild server/src/index.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/server.bundle.js', { stdio: 'inherit' });

console.log('\n⚙️ [3/5] 生成 Node SEA Blob (node --experimental-sea-config)...');
execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });

console.log('\n📋 [4/5] 复制 Node.js 二进制文件底座...');
const nodeExePath = process.execPath;
const targetExePath = path.join(process.cwd(), 'dist/hexo-cms.exe');

if (fs.existsSync(targetExePath)) {
  try {
    fs.unlinkSync(targetExePath);
  } catch (err) {
    try {
      execSync('taskkill /F /IM hexo-cms.exe', { stdio: 'ignore' });
      fs.unlinkSync(targetExePath);
    } catch (e) {
      // ignore
    }
  }
}

fs.copyFileSync(nodeExePath, targetExePath);
console.log(`   目标路径: ${targetExePath}`);

console.log('\n💉 [5/5] 使用 postject 注入 SEA Blob 到二进制文件...');
const fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
execSync(`npx -y postject "${targetExePath}" NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse ${fuse}`, { stdio: 'inherit' });

console.log('\n📁 [6/6] 自动同步 client/dist 静态网页包到 dist/client/dist...');
const distClientDir = path.join(process.cwd(), 'dist/client/dist');
fs.cpSync(path.join(process.cwd(), 'client/dist'), distClientDir, { recursive: true });

console.log('\n🎉 [SUCCESS] Node SEA 打包完成！');
console.log('   独立绿色可分发包目录: dist/');
console.log('   主可执行程序路径: dist/hexo-cms.exe');
