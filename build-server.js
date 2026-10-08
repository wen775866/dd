import fs from 'fs';
import path from 'path';
import ts from 'typescript';

console.log('📦 正在打包生成 server.js...');

let success = false;

// 判断是否为 Termux / Android 环境
const isTermux = Boolean(
  process.env.TERMUX_VERSION ||
  (process.env.PREFIX && process.env.PREFIX.includes('termux')) ||
  fs.existsSync('/data/data/com.termux')
);

function buildWithTypeScript() {
  try {
    console.log('🔄 正在使用 100% 纯 JS TypeScript 引擎转译 server.ts ...');
    const source = fs.readFileSync('server.ts', 'utf-8');

    // 适配 Node.js ESM 环境下的 typescript 模块导出结构
    const TS = ts.default || ts;
    const moduleKind = TS.ModuleKind?.ESNext ?? TS.ModuleKind?.ES2022 ?? 99;
    const scriptTarget = TS.ScriptTarget?.ES2022 ?? TS.ScriptTarget?.ESNext ?? 9;
    const transpileFn = TS.transpileModule || ts.transpileModule;

    const result = transpileFn(source, {
      compilerOptions: {
        module: moduleKind,
        target: scriptTarget,
        removeComments: false,
        esModuleInterop: true,
      },
    });

    fs.writeFileSync('server.js', result.outputText, 'utf-8');
    if (fs.existsSync('server.js') && fs.statSync('server.js').size > 0) {
      console.log('✅ [纯 JS 引擎] 成功生成 server.js！');
      return true;
    }
    return false;
  } catch (e) {
    console.error('❌ TypeScript 纯 JS 转译失败:', e);
    return false;
  }
}

// 如果在 Termux 环境，为了绝对避免 esbuild 二进制子进程 IPC 挂起卡死，直接使用纯 JS 引擎
if (isTermux) {
  console.log('📱 检测到 Termux Android 环境，使用纯 JS 引擎快速编译...');
  success = buildWithTypeScript();
} else {
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
    success = fs.existsSync('server.js') && fs.statSync('server.js').size > 0;
  } catch (e) {
    console.warn('⚠️ esbuild 打包跳过，自动使用纯 JS 引擎...');
    success = buildWithTypeScript();
  }
}

if (!success || !fs.existsSync('server.js')) {
  console.error('❌ server.js 生成失败！');
  process.exit(1);
} else {
  console.log('🎉 构建完成，server.js 准备就绪。');
  process.exit(0);
}

