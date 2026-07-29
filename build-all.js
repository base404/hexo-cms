import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('🚀 [1/6] 编译前端静态页面 (Vite build)...');
  execSync('npm run build:client', { stdio: 'inherit' });

  console.log('\n📦 [2/6] 打包后端 TS 为 CJS 单文件 (esbuild)...');
  if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });
  execSync('npx -y esbuild server/src/index.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/server.bundle.js', { stdio: 'inherit' });

  console.log('\n⚙️ [3/6] 生成 Node SEA Blob (node --experimental-sea-config)...');
  execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });

  const releaseDir = path.join(process.cwd(), 'release-pkgs');
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  const winDir = path.join(releaseDir, 'hexo-cms-win-x64');
  fs.mkdirSync(winDir, { recursive: true });

  console.log('\n🪟 [4/6] 构建 Windows (x64) 独立可执行发行包...');
  const nodeExePath = process.execPath;
  const targetWinExe = path.join(winDir, 'hexo-cms.exe');
  fs.copyFileSync(nodeExePath, targetWinExe);

  const fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
  execSync(`npx -y postject "${targetWinExe}" NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse ${fuse}`, { stdio: 'inherit' });

  fs.cpSync(path.join(process.cwd(), 'client/dist'), path.join(winDir, 'client/dist'), { recursive: true });

  const winZipPath = path.join(releaseDir, 'hexo-cms-win-x64.zip');
  console.log('   正在压缩 hexo-cms-win-x64.zip ...');
  execSync(`powershell -Command "Compress-Archive -Path '${winDir}/*' -DestinationPath '${winZipPath}' -Force"`, { stdio: 'inherit' });

  console.log('\n🐧 [5/6] 构建 Linux (x64) 独立可执行发行包...');
  const linuxDir = path.join(releaseDir, 'hexo-cms-linux-x64');
  fs.mkdirSync(linuxDir, { recursive: true });

  const tmpLinuxTar = path.join(process.cwd(), 'node-linux.tar.xz');
  const nodeLinuxUrl = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz';
  
  console.log(`   正在从 Node.js 官方获取 Linux 二进制底座 (${nodeLinuxUrl})...`);
  try {
    if (!fs.existsSync(tmpLinuxTar)) {
      await downloadFile(nodeLinuxUrl, tmpLinuxTar);
    }
    console.log('   解压 Linux node 底座 (提取 bin/node)...');
    execSync(`tar -xf "${tmpLinuxTar}" --wildcards "*/bin/node" -C "${releaseDir}"`, { stdio: 'inherit' });

    const linuxNodeBin = path.join(releaseDir, 'node-v20.18.0-linux-x64/bin/node');
    const targetLinuxBin = path.join(linuxDir, 'hexo-cms');
    fs.copyFileSync(linuxNodeBin, targetLinuxBin);

    console.log('   使用 postject 注入 Linux 二进制 (SEA)...');
    execSync(`npx -y postject "${targetLinuxBin}" NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse ${fuse} --macho-segment-name NODE_SEA`, { stdio: 'inherit' });

    fs.cpSync(path.join(process.cwd(), 'client/dist'), path.join(linuxDir, 'client/dist'), { recursive: true });

    const linuxZipPath = path.join(releaseDir, 'hexo-cms-linux-x64.zip');
    console.log('   正在压缩 hexo-cms-linux-x64.zip ...');
    execSync(`powershell -Command "Compress-Archive -Path '${linuxDir}/*' -DestinationPath '${linuxZipPath}' -Force"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ Linux SEA 注入降级处理:', err.message);
    const targetLinuxBin = path.join(linuxDir, 'hexo-cms');
    const launcherScript = `#!/usr/bin/env node\nrequire('./server.bundle.js');\n`;
    fs.writeFileSync(targetLinuxBin, launcherScript, { mode: 0o755 });
    fs.copyFileSync('dist/server.bundle.js', path.join(linuxDir, 'server.bundle.js'));
    fs.cpSync(path.join(process.cwd(), 'client/dist'), path.join(linuxDir, 'client/dist'), { recursive: true });

    const linuxZipPath = path.join(releaseDir, 'hexo-cms-linux-x64.zip');
    execSync(`powershell -Command "Compress-Archive -Path '${linuxDir}/*' -DestinationPath '${linuxZipPath}' -Force"`, { stdio: 'inherit' });
  }

  console.log('\n🎉 [SUCCESS] 所有的全平台 Release 发行包已成功打出！');
  console.log(`   Windows 安装包: ${path.join(releaseDir, 'hexo-cms-win-x64.zip')}`);
  console.log(`   Linux   安装包: ${path.join(releaseDir, 'hexo-cms-linux-x64.zip')}`);
}

main().catch(err => {
  console.error('❌ 打包失败:', err);
  process.exit(1);
});
