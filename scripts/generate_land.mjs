import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import crypto from 'crypto';

// パス設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(PROJECT_ROOT, 'data', 'kinki_master.json');
const LOCK_DIR = path.join(PROJECT_ROOT, 'data', '.locks');

// ロックディレクトリ作成
if (!fs.existsSync(LOCK_DIR)) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

// ファイルロック関数
function acquireLock(targetPath) {
  const lockId = crypto.createHash('md5').update(targetPath).digest('hex');
  const lockFile = path.join(LOCK_DIR, `${lockId}.lock`);
  
  // 既にロックが存在する場合は待機
  let attempts = 0;
  while (fs.existsSync(lockFile)) {
    attempts++;
    if (attempts > 60) { // 最大60秒待機
      throw new Error(`ロック取得タイムアウト: ${targetPath}`);
    }
    // 1秒待機
    const now = Date.now();
    while (Date.now() - now < 1000) {
      // busy wait
    }
  }
  
  // ロックファイル作成
  fs.writeFileSync(lockFile, process.pid.toString(), 'utf-8');
  return lockFile;
}

function releaseLock(lockFile) {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

// コマンドライン引数パース
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, '');
  const value = process.argv[i + 1];
  args[key] = value;
}

const { mode, pref, city, rail, line, station } = args;

// プロセスID表示（並列実行時の識別用）
const PID = process.pid;
console.log(`[PID:${PID}] 実行開始`);

// 引数検証
if (!mode || !['area', 'station'].includes(mode)) {
  console.error(`[PID:${PID}] [エラー] --mode は "area" または "station" を指定してください`);
  process.exit(1);
}

if (mode === 'area' && (!pref || !city)) {
  console.error(`[PID:${PID}] [エラー] mode=area の場合、--pref と --city が必須です`);
  process.exit(1);
}

if (mode === 'station' && (!rail || !line || !station)) {
  console.error(`[PID:${PID}] [エラー] mode=station の場合、--rail, --line, --station が必須です`);
  process.exit(1);
}

// 出力ファイルパス決定（早期チェック）
function sanitize(str) {
  return str.replace(/[/:]/g, '_');
}

let outputPath;
if (mode === 'area') {
  outputPath = path.join(PROJECT_ROOT, 'data', 'land', 'area', sanitize(pref), `${sanitize(city)}.json`);
} else {
  outputPath = path.join(PROJECT_ROOT, 'data', 'land', 'station', sanitize(rail), sanitize(line), `${sanitize(station)}.json`);
}

// 既に生成済みかチェック（スキップ機能）
if (fs.existsSync(outputPath)) {
  console.log(`[PID:${PID}] ⏭️  スキップ: 既に生成済み (${outputPath})`);
  process.exit(0);
}

console.log(`[PID:${PID}] 🎯 ターゲット: ${outputPath}`);

// マスターデータ読み込みと存在確認
console.log(`[PID:${PID}] [1/6] マスターデータ読み込み中...`);
const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf-8'));

if (mode === 'area') {
  if (!master.prefectures[pref]) {
    console.error(`[PID:${PID}] [エラー] 都道府県 "${pref}" が見つかりません`);
    process.exit(1);
  }
  if (!master.prefectures[pref].cities.includes(city)) {
    console.error(`[PID:${PID}] [エラー] 市区町村 "${city}" が "${pref}" に存在しません`);
    process.exit(1);
  }
  console.log(`[PID:${PID}] [確認OK] ${pref} > ${city}`);
} else {
  let found = false;
  for (const prefName in master.prefectures) {
    const railData = master.prefectures[prefName].rail[rail];
    if (railData && railData[line]) {
      if (railData[line].includes(station)) {
        found = true;
        break;
      }
    }
  }
  if (!found) {
    console.error(`[PID:${PID}] [エラー] 駅 "${station}" が "${rail} > ${line}" に存在しません`);
    process.exit(1);
  }
  console.log(`[PID:${PID}] [確認OK] ${rail} > ${line} > ${station}`);
}

// プロンプト生成
console.log(`[PID:${PID}] [2/6] プロンプト生成中...`);

let templatePath, prompt;
if (mode === 'area') {
  templatePath = path.join(__dirname, 'templates', 'area_prompt_land.txt');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const cityList = master.prefectures[pref].cities.map(c => `- ${c}`).join('\n');
  
  prompt = template
    .replace(/\{\{PREF\}\}/g, pref)
    .replace(/\{\{CITY\}\}/g, city)
    .replace(/\{\{ALLOWED_CITY_LIST_FOR_PREF_ONLY\}\}/g, cityList);
} else {
  templatePath = path.join(__dirname, 'templates', 'station_prompt_land.txt');
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  let stationList = '';
  for (const prefName in master.prefectures) {
    const railData = master.prefectures[prefName].rail[rail];
    if (railData && railData[line]) {
      stationList = railData[line].map(s => `- ${s}`).join('\n');
      break;
    }
  }
  
  prompt = template
    .replace(/\{\{RAIL\}\}/g, rail)
    .replace(/\{\{LINE\}\}/g, line)
    .replace(/\{\{STATION\}\}/g, station)
    .replace(/\{\{ALLOWED_STATION_LIST_FOR_THIS_LINE_ONLY\}\}/g, stationList);
}

console.log(`[PID:${PID}] [プロンプト完成] ${prompt.length}文字`);

// Claude CLI実行関数
async function executeClaude(prompt) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';
    
    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    claude.on('close', (code) => {
      if (code !== 0) {
        // stderrの内容をエラーメッセージに含める
        const errorMsg = stderr.trim() || `終了コード: ${code}`;
        reject(new Error(`Claude CLI終了コード: ${code}\n${errorMsg}`));
      } else {
        resolve(stdout);
      }
    });
    
    claude.on('error', (err) => {
      reject(new Error(`Claude CLI実行エラー: ${err.message}`));
    });
    
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

// データ抽出・パース関数
function parseClaudeOutput(output) {
  const match = output.match(/const\s+land_db\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('const land_db = [...]; の形式が見つかりません');
  }
  const jsonStr = match[1];
  return JSON.parse(jsonStr);
}

// 検証関数（最小情報のみ版）
function validateData(data, mode, params) {
  // 件数チェック
  if (data.length < 16 || data.length > 63) {
    return { valid: false, error: `件数が範囲外: ${data.length}件（16〜63件必須）` };
  }
  
  // 必須キーチェック（最小限の情報のみ）
  const requiredKeys = ['id', 'type', 'scope', 'area', 'city', 'rail_company', 'line', 'station', 'timing'];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    for (const key of requiredKeys) {
      if (!(key in item)) {
        return { valid: false, error: `レコード${i + 1}: キー "${key}" が欠落` };
      }
    }
    
    // 詳細情報キーが存在する場合はエラー（非表示戦略）
    const forbiddenKeys = ['price', 'walk_time', 'family', 'occupation', 'age', 'land_area', 'reason', 'ng', 'parking'];
    for (const key of forbiddenKeys) {
      if (key in item) {
        return { valid: false, error: `レコード${i + 1}: "${key}" キーは不要（詳細情報は非表示にするため）` };
      }
    }
  }
  
  // 固定値チェック
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    if (item.type !== '土地') {
      return { valid: false, error: `レコード${i + 1}: type="${item.type}" (正: "土地")` };
    }
    
    if (item.scope !== mode) {
      return { valid: false, error: `レコード${i + 1}: scope="${item.scope}" (正: "${mode}")` };
    }
  }
  
  // 混在禁止チェック
  if (mode === 'area') {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.area !== params.pref || item.city !== params.city) {
        return { valid: false, error: `レコード${i + 1}: area/city が指定値と不一致` };
      }
      if (item.rail_company !== null || item.line !== null || item.station !== null) {
        return { valid: false, error: `レコード${i + 1}: mode=area なのに rail_company/line/station が null でない` };
      }
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.rail_company !== params.rail || item.line !== params.line || item.station !== params.station) {
        return { valid: false, error: `レコード${i + 1}: rail_company/line/station が指定値と不一致` };
      }
      if (item.area !== null || item.city !== null) {
        return { valid: false, error: `レコード${i + 1}: mode=station なのに area/city が null でない` };
      }
    }
  }
  
  return { valid: true };
}

// メイン処理（リトライ＋ロック機能含む）
async function main() {
  const MAX_RETRIES = 2;
  let attempt = 0;
  let result = null;
  
  const params = mode === 'area' ? { pref, city } : { rail, line, station };
  
  while (attempt <= MAX_RETRIES) {
    attempt++;
    console.log(`[PID:${PID}] [3/6] Claude実行中... (試行 ${attempt}/${MAX_RETRIES + 1})`);
    
    try {
      const output = await executeClaude(prompt);
      
      console.log(`[PID:${PID}] [4/6] データ解析中...`);
      const parsedData = parseClaudeOutput(output);
      console.log(`[PID:${PID}] [解析完了] ${parsedData.length}件`);
      
      console.log(`[PID:${PID}] [5/6] データ検証中...`);
      const validation = validateData(parsedData, mode, params);
      
      if (validation.valid) {
        console.log(`[PID:${PID}] [検証OK] 全チェック通過`);
        result = parsedData;
        break;
      } else {
        console.error(`[PID:${PID}] [検証NG] ${validation.error}`);
        if (attempt > MAX_RETRIES) {
          console.error(`[PID:${PID}] [エラー] 最大リトライ回数を超えました`);
          process.exit(1);
        }
        console.log(`[PID:${PID}] [リトライ] 再生成します...`);
      }
    } catch (error) {
      console.error(`[PID:${PID}] [エラー] ${error.message}`);
      // stderrの詳細を表示（改行を含む場合があるため）
      if (error.message.includes('Claude CLI終了コード')) {
        const lines = error.message.split('\n');
        if (lines.length > 1) {
          const stderrDetail = lines.slice(1).join('\n').trim();
          if (stderrDetail) {
            console.error(`[PID:${PID}] [詳細] ${stderrDetail.substring(0, 1000)}`);
            // クレジット不足の場合は特別なメッセージ
            if (stderrDetail.includes('Credit balance') || stderrDetail.includes('too low')) {
              console.error(`[PID:${PID}] ⚠️  Claude CLIのクレジット残高が不足しています`);
            }
          }
        }
      }
      if (attempt > MAX_RETRIES) {
        console.error(`[PID:${PID}] [エラー] 最大リトライ回数を超えました`);
        process.exit(1);
      }
      console.log(`[PID:${PID}] [リトライ] 再生成します...`);
    }
  }
  
  // 保存処理（ファイルロック使用）
  console.log(`[PID:${PID}] [6/6] ファイル保存中...`);
  
  let lockFile;
  try {
    lockFile = acquireLock(outputPath);
    
    // 再度、既存ファイルチェック（並列実行中に他プロセスが作成した可能性）
    if (fs.existsSync(outputPath)) {
      console.log(`[PID:${PID}] ⏭️  スキップ: 他プロセスが既に生成済み`);
      return;
    }
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log(`[PID:${PID}] ✅ 生成完了: ${outputPath}`);
    console.log(`[PID:${PID}] 📊 件数: ${result.length}件`);
  } finally {
    if (lockFile) {
      releaseLock(lockFile);
    }
  }
}

main().catch(error => {
  console.error(`[PID:${PID}] [致命的エラー]`, error);
  process.exit(1);
});
