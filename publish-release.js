import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OWNER = 'base404';
const REPO = 'hexo-cms';
const TAG = '3.0';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('❌ 错误: 找不到 GITHUB_TOKEN 环境变量！');
  process.exit(1);
}

// 统一的 GitHub fetch 包装
async function githubRequest(urlPath, options = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `https://api.github.com/repos/${OWNER}/${REPO}${urlPath}`;
  const headers = {
    'Authorization': `token ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'node.js-publisher',
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (response.status === 204) {
    return null;
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`GitHub API Error (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log(`🔍 [1/7] 正在检测旧的 Release (${TAG})...`);
  let oldReleaseId = null;
  try {
    const release = await githubRequest(`/releases/tags/${TAG}`);
    if (release && release.id) {
      oldReleaseId = release.id;
      console.log(`   发现已存在的 Release ID: ${oldReleaseId}`);
    }
  } catch (err) {
    console.log(`   未找到已有的 Release ${TAG}，或获取失败（正常，将跳过删除）。`);
  }

  if (oldReleaseId) {
    console.log(`🗑️ [2/7] 正在删除 GitHub 上的旧 Release (ID: ${oldReleaseId})...`);
    await githubRequest(`/releases/${oldReleaseId}`, { method: 'DELETE' });
    console.log('   旧 Release 已成功删除。');
  }

  console.log(`🗑️ [3/7] 正在删除远程的 GitHub Tag (${TAG})...`);
  try {
    await githubRequest(`/git/refs/tags/${TAG}`, { method: 'DELETE' });
    console.log('   远程 Tag 已成功删除。');
  } catch (err) {
    console.log('   未发现远程 Tag 或已删除，跳过。');
  }

  console.log(`🧹 [4/7] 正在清理本地 Tag (${TAG})...`);
  try {
    execSync(`git tag -d ${TAG}`, { stdio: 'ignore' });
    console.log('   本地 Tag 已清理。');
  } catch (err) {
    console.log('   本地没有发现该 Tag，跳过。');
  }

  console.log(`🏷️ [5/7] 重新在本地创建 Tag (${TAG}) 并推送到 GitHub...`);
  try {
    execSync(`git tag ${TAG}`, { stdio: 'inherit' });
    execSync(`git push origin ${TAG} --force`, { stdio: 'inherit' });
    console.log('   Tag 创建并推送成功！');
  } catch (err) {
    console.error('❌ 推送 Tag 失败:', err.message);
    process.exit(1);
  }

  console.log(`🎁 [6/7] 正在创建新的 GitHub Release (${TAG})...`);
  const releaseBody = {
    tag_name: TAG,
    target_commitish: 'main',
    name: `v${TAG}`,
    body: `Hexo CMS v${TAG} 发行版。包含了全平台的独立运行包。\n\n### 更改日志:\n- 网站图标已更新为新设计（favicon.png & logo.png）。\n- 重新打包的 Windows 和 Linux 二进制发行包。`,
    draft: false,
    prerelease: false
  };

  const newRelease = await githubRequest('/releases', {
    method: 'POST',
    body: JSON.stringify(releaseBody),
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(`   新 Release 创建成功！ID: ${newRelease.id}`);

  console.log(`📤 [7/7] 正在上传编译产物 (Release Assets)...`);
  const releaseDir = path.join(process.cwd(), 'release-pkgs');
  const filesToUpload = [
    { name: 'hexo-cms-win-x64.zip', path: path.join(releaseDir, 'hexo-cms-win-x64.zip') },
    { name: 'hexo-cms-linux-x64.zip', path: path.join(releaseDir, 'hexo-cms-linux-x64.zip') }
  ];

  const uploadUrlTemplate = newRelease.upload_url;
  const baseUrl = uploadUrlTemplate.split('{')[0];

  for (const fileInfo of filesToUpload) {
    if (!fs.existsSync(fileInfo.path)) {
      console.warn(`⚠️ 警告: 找不到待上传文件: ${fileInfo.path}，跳过该文件。`);
      continue;
    }

    console.log(`   正在上传 ${fileInfo.name} (${(fs.statSync(fileInfo.path).size / (1024 * 1024)).toFixed(2)} MB)...`);
    const fileBuffer = fs.readFileSync(fileInfo.path);
    const uploadUrl = `${baseUrl}?name=${encodeURIComponent(fileInfo.name)}`;
    
    await githubRequest(uploadUrl, {
      method: 'POST',
      body: fileBuffer,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': fileBuffer.length.toString()
      }
    });
    console.log(`   ✅ ${fileInfo.name} 上传成功！`);
  }

  console.log('🎉 [FINISHED] 所有 Release 发布任务已圆满完成！');
}

main().catch(err => {
  console.error('❌ 发布失败:', err);
  process.exit(1);
});
