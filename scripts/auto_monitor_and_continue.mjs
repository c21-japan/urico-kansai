import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 監視対象のプロセスパターンと再起動コマンド
const MONITOR_TARGETS = [
  {
    name: '大阪府（駅・建物）',
    pattern: 'batch_generate.mjs.*--mode station.*--pref 大阪府',
    script: 'batch_generate.mjs',
    args: ['--mode', 'station', '--pref', '大阪府'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_osaka_house.log')
  },
  {
    name: '滋賀県（駅・建物）',
    pattern: 'batch_generate.mjs.*--mode station.*--pref 滋賀県',
    script: 'batch_generate.mjs',
    args: ['--mode', 'station', '--pref', '滋賀県'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_shiga_house.log')
  },
  {
    name: '京都府（駅・建物）',
    pattern: 'batch_generate.mjs.*--mode station.*--pref 京都府',
    script: 'batch_generate.mjs',
    args: ['--mode', 'station', '--pref', '京都府'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_kyoto_house.log')
  },
  {
    name: '兵庫県（駅・建物）',
    pattern: 'batch_generate.mjs.*--mode station.*--pref 兵庫県',
    script: 'batch_generate.mjs',
    args: ['--mode', 'station', '--pref', '兵庫県'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_hyogo_house.log')
  },
  {
    name: '大阪府（駅・土地）',
    pattern: 'batch_generate_land.mjs.*--mode station.*--pref 大阪府',
    script: 'batch_generate_land.mjs',
    args: ['--mode', 'station', '--pref', '大阪府'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_osaka_land.log')
  },
  {
    name: '兵庫県（駅・土地）',
    pattern: 'batch_generate_land.mjs.*--mode station.*--pref 兵庫県',
    script: 'batch_generate_land.mjs',
    args: ['--mode', 'station', '--pref', '兵庫県'],
    logFile: path.join(PROJECT_ROOT, 'batch_station_hyogo_land.log')
  }
];

// プロセスが実行中か確認（ログファイルの更新時刻で判定）
function isProcessRunning(pattern, logFile) {
  return new Promise((resolve) => {
    // ログファイルの最終更新時刻を確認
    if (!fs.existsSync(logFile)) {
      resolve(false);
      return;
    }
    
    const stats = fs.statSync(logFile);
    const now = Date.now();
    const lastModified = stats.mtime.getTime();
    const timeDiff = now - lastModified;
    
    // 5分以内に更新されていれば実行中とみなす
    const isRunning = timeDiff < 5 * 60 * 1000;
    
    // さらに、ログの最後の行を確認
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n');
      const lastLines = lines.slice(-10).join('\n');
      
      // 完了メッセージがない、かつ最近更新されている場合は実行中
      if (!content.includes('🎉 一括生成完了！') && isRunning) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      resolve(isRunning);
    }
  });
}

// ログから完了を確認
function isCompleted(logFile) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  
  const content = fs.readFileSync(logFile, 'utf-8');
  return content.includes('🎉 一括生成完了！');
}

// プロセスを起動
function startProcess(target) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, target.script);
    const logStream = fs.createWriteStream(target.logFile, { flags: 'a' });
    
    logStream.write(`\n[自動再起動] ${new Date().toISOString()}\n`);
    
    const child = spawn('nohup', ['node', scriptPath, ...target.args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      cwd: PROJECT_ROOT
    });
    
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    
    child.on('error', (err) => {
      logStream.write(`[エラー] 起動失敗: ${err.message}\n`);
      reject(err);
    });
    
    child.unref();
    
    // 少し待ってから確認
    setTimeout(() => {
      isProcessRunning(target.pattern, target.logFile).then((running) => {
        if (running) {
          logStream.write(`[成功] プロセス起動完了 (PID: ${child.pid})\n`);
          resolve();
        } else {
          logStream.write(`[警告] プロセス起動確認できませんでしたが、起動は試みました\n`);
          resolve(); // エラーにしない（ログ更新の遅延を考慮）
        }
      });
    }, 3000);
  });
}

// メイン監視ループ
async function monitor() {
  console.log('\n' + '='.repeat(80));
  console.log('🤖 自動監視・復旧システムを開始します');
  console.log('='.repeat(80));
  console.log(`監視対象: ${MONITOR_TARGETS.length}個のプロセス\n`);
  
  const checkInterval = 60000; // 1分ごとにチェック
  
  let checkCount = 0;
  
  while (true) {
    checkCount++;
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] プロセス状態をチェック中... (${checkCount}回目)`);
    
    for (const target of MONITOR_TARGETS) {
      const completed = isCompleted(target.logFile);
      
      if (completed) {
        console.log(`  ✅ ${target.name}: 完了済み`);
      } else {
        const running = await isProcessRunning(target.pattern, target.logFile);
        
        if (running) {
          console.log(`  🔄 ${target.name}: 実行中`);
        } else {
          console.log(`  ⚠️  ${target.name}: 停止中 → 自動再起動します`);
          
          try {
            await startProcess(target);
            console.log(`  ✅ ${target.name}: 再起動成功`);
          } catch (error) {
            console.error(`  ❌ ${target.name}: 再起動失敗 - ${error.message}`);
          }
        }
      }
    }
    
    // エラー自動修正を実行（5分ごと）
    if (checkCount % 5 === 0) {
      console.log(`\n🔧 エラー自動検出・修正を実行中...`);
      try {
        const fixScript = path.join(__dirname, 'auto_fix_and_continue.mjs');
        await execAsync(`node "${fixScript}" --once`, { cwd: PROJECT_ROOT });
      } catch (error) {
        console.error(`  ⚠️  エラー修正スクリプト実行エラー: ${error.message}`);
      }
    }
    
    // 全て完了したかチェック
    const allCompleted = MONITOR_TARGETS.every(t => isCompleted(t.logFile));
    if (allCompleted) {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 全てのプロセスが完了しました！');
      console.log('🔄 エラー再生成を開始します...');
      console.log('='.repeat(80) + '\n');
      
      // エラー再生成を実行
      const retryScript = path.join(__dirname, 'retry_errors.mjs');
      const child = spawn('node', [retryScript], {
        stdio: 'inherit',
        cwd: PROJECT_ROOT
      });
      
      child.on('close', (code) => {
        console.log(`\n✅ エラー再生成完了 (終了コード: ${code})`);
        process.exit(0);
      });
      
      return;
    }
    
    console.log(`\n⏳ ${checkInterval / 1000}秒後に再チェックします...`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

// シグナルハンドリング
process.on('SIGINT', () => {
  console.log('\n\n監視を終了します...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n監視を終了します...');
  process.exit(0);
});

monitor().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
