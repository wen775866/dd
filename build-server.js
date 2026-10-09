import fs from 'fs';
import path from 'path';

console.log('📦 正在打包生成 server.js...');

let success = false;

// 1. 尝试使用 esbuild 打包到临时文件
try {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: ['server.ts'],
    outfile: 'server.tmp.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node18',
  });
  if (fs.existsSync('server.tmp.js') && fs.statSync('server.tmp.js').size > 500) {
    fs.renameSync('server.tmp.js', 'server.js');
    console.log('✅ [esbuild] 成功构建并更新 server.js！');
    success = true;
  }
} catch (e) {
  console.warn('⚠️ esbuild 打包遇到问题（如运行在 Android/Termux 无原生支持）:', e.message);
  try {
    if (fs.existsSync('server.tmp.js')) fs.unlinkSync('server.tmp.js');
  } catch (_) {}
}

// 2. 兜底方案：如果当前目录下已有完整预编译的 server.js，直接复用
if (!success && fs.existsSync('server.js') && fs.statSync('server.js').size > 500) {
  console.log('✅ 检测到已存在完整预编译 server.js，自动复用保障运行。');
  success = true;
}

if (!success || !fs.existsSync('server.js')) {
  console.warn('⚠️ 未能生成新的 server.js，但如果已存在将继续尝试启动。');
  // 不退出 1，避免阻塞 start.sh
  process.exit(0);
} else {
  console.log('🎉 构建完成，server.js 准备就绪。');
  process.exit(0);
}
