import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 監視対象と次のステップの定義
const MONITORING_QUEUE = [
  {
    name: '大阪府（駅）',
    logFile: path.join(PROJECT_ROOT, 'batch_station_osaka.log'),
    pref: '大阪府',
    totalStations: 707
  },
  {
    name: '奈良県（駅）',
    logFile: path.join(PROJECT_ROOT, 'batch_station_nara.log'),
    pref: '奈良県',
    totalStations: 133
  }
];

const NEXT_STEPS = [
  {
    name: '滋賀県（駅）',
    pref: '滋賀県',
    logFile: path.join(PROJECT_ROOT, 'batch_station_shiga.log')
  },
  {
    name: '京都府（駅）',
    pref: '京都府',
    logFile: path.join(PROJECT_ROOT, 'batch_station_kyoto.log')
  }
];

const FINAL_STEP = {
  name: '兵庫県（駅）',
  pref: '兵庫県',
  logFile: path.join(PROJECT_ROOT, 'batch_station_hyogo.log')
};

// プロセス状態確認
function isProcessRunning(pref) {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['aux'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', () => {
      const pattern = new RegExp(`batch_generate.mjs.*--pref ${pref}`);
      resolve(pattern.test(output));
    });
  });
}

// ログから完了を検知
function checkCompletion(logFile, totalStations) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  
  const logContent = fs.readFileSync(logFile, 'utf-8');
  
  // 完了メッセージをチェック
  if (logContent.includes('🎉 一括生成完了！')) {
    return true;
  }
  
  // サマリーから完了を検知
  const summaryMatch = logContent.match(/📝 合計: (\d+)件/);
  if (summaryMatch) {
    const total = parseInt(summaryMatch[1]);
    // 成功+スキップ+エラーが合計に一致するか確認
    const successMatch = logContent.match(/✅ 成功: (\d+)件/);
    const skipMatch = logContent.match(/⏭️.*スキップ: (\d+)件/);
    const errorMatch = logContent.match(/❌ エラー: (\d+)件/);
    
    if (successMatch || skipMatch || errorMatch) {
      // サマリーが存在する = 完了
      return true;
    }
  }
  
  return false;
}

// 次のプロセスを起動
function startNextProcess(step) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 ${step.name} の生成を開始します...`);
    
    const scriptPath = path.join(__dirname, 'batch_generate.mjs');
    const child = spawn('nohup', [
      'node',
      scriptPath,
      '--mode', 'station',
      '--pref', step.pref
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    // ログファイルにリダイレクト
    const logStream = fs.createWriteStream(step.logFile, { flags: 'a' });
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    
    child.on('error', (err) => {
      console.error(`❌ ${step.name} の起動に失敗: ${err.message}`);
      reject(err);
    });
    
    child.unref();
    
    // 少し待ってからプロセスIDを確認
    setTimeout(() => {
      isProcessRunning(step.pref).then((running) => {
        if (running) {
          console.log(`✅ ${step.name} が正常に起動しました`);
          console.log(`📝 ログファイル: ${step.logFile}`);
          resolve();
        } else {
          console.error(`❌ ${step.name} の起動を確認できませんでした`);
          reject(new Error('プロセス起動確認失敗'));
        }
      });
    }, 2000);
  });
}

// メイン監視ループ
async function monitor() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 駅データ生成の自動監視を開始します');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let nextStepIndex = 0;
  let finalStepStarted = false;
  
  while (true) {
    // 監視対象の完了をチェック
    for (const target of MONITORING_QUEUE) {
      const isRunning = await isProcessRunning(target.pref);
      const isCompleted = checkCompletion(target.logFile, target.totalStations);
      
      if (!isRunning && isCompleted) {
        console.log(`✅ ${target.name} が完了しました`);
      } else if (!isRunning && !isCompleted) {
        // プロセスが動いていないが完了していない = エラーで停止した可能性
        console.log(`⚠️  ${target.name} のプロセスが停止しています（完了していない可能性があります）`);
      }
    }
    
    // 両方が完了したかチェック
    const allCompleted = MONITORING_QUEUE.every(target => {
      return !isProcessRunning(target.pref) && checkCompletion(target.logFile, target.totalStations);
    });
    
    // 次のステップを起動
    if (allCompleted && nextStepIndex < NEXT_STEPS.length) {
      const step1 = NEXT_STEPS[nextStepIndex];
      const step2 = NEXT_STEPS[nextStepIndex + 1];
      
      if (step1 && step2) {
        console.log(`\n📋 次のステップ: ${step1.name} と ${step2.name} を起動します`);
        
        try {
          await startNextProcess(step1);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
          await startNextProcess(step2);
          nextStepIndex += 2;
          
          // 監視対象を更新
          MONITORING_QUEUE.length = 0;
          MONITORING_QUEUE.push(
            {
              name: step1.name,
              logFile: step1.logFile,
              pref: step1.pref,
              totalStations: 0 // 後で計算
            },
            {
              name: step2.name,
              logFile: step2.logFile,
              pref: step2.pref,
              totalStations: 0
            }
          );
        } catch (error) {
          console.error(`❌ エラー: ${error.message}`);
        }
      }
    }
    
    // 最後のステップを起動
    if (allCompleted && nextStepIndex >= NEXT_STEPS.length && !finalStepStarted) {
      const allNextCompleted = NEXT_STEPS.every(step => {
        return !isProcessRunning(step.pref) && checkCompletion(step.logFile, 0);
      });
      
      if (allNextCompleted) {
        console.log(`\n📋 最後のステップ: ${FINAL_STEP.name} を起動します`);
        
        try {
          await startNextProcess(FINAL_STEP);
          finalStepStarted = true;
          
          // 監視対象を更新
          MONITORING_QUEUE.length = 0;
          MONITORING_QUEUE.push({
            name: FINAL_STEP.name,
            logFile: FINAL_STEP.logFile,
            pref: FINAL_STEP.pref,
            totalStations: 0
          });
        } catch (error) {
          console.error(`❌ エラー: ${error.message}`);
        }
      }
    }
    
    // 全て完了したかチェック
    if (finalStepStarted) {
      const finalCompleted = !isProcessRunning(FINAL_STEP.pref) && 
                             checkCompletion(FINAL_STEP.logFile, 0);
      
      if (finalCompleted) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 全ての駅データ生成が完了しました！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
      }
    }
    
    // 30秒待機してから再チェック
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error);
});

// シグナルハンドリング
process.on('SIGINT', () => {
  console.log('\n\n監視を終了します...');
  process.exit(0);
});

monitor().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
