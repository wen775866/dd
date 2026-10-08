import fs from 'fs';
import path from 'path';

console.log('📦 正在打包生成 server.js...');

let success = false;

// 判断是否为 Termux / Android 环境
const isTermux = Boolean(
  process.env.TERMUX_VERSION ||
  (process.env.PREFIX && process.env.PREFIX.includes('termux')) ||
  fs.existsSync('/data/data/com.termux')
);

// Helper function: 使用 100% 纯 JS 引擎 (TypeScript transpileModule) 打包 server.ts
function buildWithTypeScript() {
  try {
    console.log('🔄 正在使用 100% 纯 JS TypeScript 引擎转译 server.ts ...');
    const tsModule = import('typescript');
    return tsModule.then((m) => {
      const ts = m.default || m;
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
        console.log('✅ [纯 JS 引擎] 成功生成 server.js！');
        return true;
      }
      return false;
    });
  } catch (e) {
    console.error('❌ TypeScript 纯 JS 转译失败:', e);
    return Promise.resolve(false);
  }
}

// 如果在 Termux 环境，为了绝对避免 esbuild 二进制子进程 IPC 挂起卡死，直接使用纯 JS 引擎
if (isTermux) {
  console.log('📱 检测到 Termux Android 环境，使用纯 JS 引擎快速编译...');
  success = await buildWithTypeScript();
} else {
  // 非 Termux 环境，优先尝试 esbuild，并设置 1.5 秒超时控制
  try {
    const esbuildBuildPromise = (async () => {
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
      return fs.existsSync('server.js') && fs.statSync('server.js').size > 0;
    })();

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 1500));
    const result = await Promise.race([esbuildBuildPromise, timeoutPromise]);

    if (result === 'TIMEOUT') {
      console.warn('⚠️ esbuild 响应超时 (可能处于受限容器/安卓架构)，自动切换为纯 JS 引擎...');
      success = await buildWithTypeScript();
    } else if (result) {
      console.log('✅ 使用 esbuild 成功生成 server.js！');
      success = true;
    } else {
      success = await buildWithTypeScript();
    }
  } catch (e) {
    console.warn('⚠️ esbuild 打包跳过，自动使用纯 JS 引擎...', e?.message || e);
    success = await buildWithTypeScript();
  }
}

if (!success || !fs.existsSync('server.js')) {
  console.error('❌ server.js 生成失败！');
  process.exit(1);
} else {
  console.log('🎉 构建完成，server.js 准备就绪。');
  process.exit(0);
}
