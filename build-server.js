import fs from 'fs';
import path from 'path';

console.log('📦 正在打包生成 server.js...');

let success = false;

// 1. 优先尝试使用 esbuild 打包
try {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: ['server.ts'],
    outfile: 'server.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node18',
  });
  if (fs.existsSync('server.js') && fs.statSync('server.js').size > 0) {
    console.log('✅ 使用 esbuild 成功生成 server.js');
    success = true;
  }
} catch (e) {
  console.warn('⚠️ esbuild 打包遇到环境限制，自动切换至 TypeScript 纯 JS 转译器...', e?.message || e);
}

// 2. 备用/双重保险：使用 TypeScript 官方 API 转译 (100% 纯 JS，兼容 Termux 与各种 Android 架构)
if (!success) {
  try {
    console.log('🔄 正在使用 typescript.transpileModule 转译 server.ts 为 server.js...');
    const tsModule = await import('typescript');
    const ts = tsModule.default || tsModule;
    const source = fs.readFileSync('server.ts', 'utf-8');

    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind?.ESNext || 99,
        target: ts.ScriptTarget?.ES2022 || 9,
        removeComments: false,
        esModuleInterop: true,
      },
    });

    fs.writeFileSync('server.js', result.outputText, 'utf-8');
    if (fs.existsSync('server.js') && fs.statSync('server.js').size > 0) {
      console.log('✅ 使用 TypeScript API 成功生成 server.js');
      success = true;
    }
  } catch (e) {
    console.error('❌ TypeScript 转译失败:', e);
  }
}

if (!success || !fs.existsSync('server.js')) {
  console.error('❌ server.js 生成失败！');
  process.exit(1);
}
