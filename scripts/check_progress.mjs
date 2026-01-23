import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(PROJECT_ROOT, 'data', 'kinki_master.json');

// マスターデータ読み込み
const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf-8'));

function sanitize(str) {
  return str.replace(/[/:]/g, '_');
}

// ファイル数をカウント
function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  try {
    const files = fs.readdirSync(dirPath, { recursive: true });
    return files.filter(f => typeof f === 'string' && f.endsWith('.json')).length;
  } catch (error) {
    return 0;
  }
}

// エリアデータの進捗を取得
function getAreaProgress(dataType) {
  const results = {};
  
  for (const prefName in master.prefectures) {
    const cities = master.prefectures[prefName].cities || [];
    const total = cities.length;
    
    const areaDir = path.join(PROJECT_ROOT, 'data', dataType, 'area', sanitize(prefName));
    const generated = countFiles(areaDir);
    
    results[prefName] = {
      total,
      generated,
      remaining: total - generated,
      progress: total > 0 ? Math.round((generated / total) * 100) : 0
    };
  }
  
  return results;
}

// 駅データの進捗を取得
function getStationProgress(dataType) {
  const results = {};
  
  for (const prefName in master.prefectures) {
    let total = 0;
    let generated = 0;
    
    const railData = master.prefectures[prefName].rail || {};
    for (const railCompany in railData) {
      const lines = railData[railCompany];
      for (const line in lines) {
        const stations = lines[line];
        total += stations.length;
        
        const stationDir = path.join(PROJECT_ROOT, 'data', dataType, 'station', sanitize(railCompany), sanitize(line));
        if (fs.existsSync(stationDir)) {
          const files = fs.readdirSync(stationDir);
          generated += files.filter(f => f.endsWith('.json')).length;
        }
      }
    }
    
    results[prefName] = {
      total,
      generated,
      remaining: total - generated,
      progress: total > 0 ? Math.round((generated / total) * 100) : 0
    };
  }
  
  return results;
}

// 結果を表示
function displayProgress(title, areaProgress, stationProgress) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${title}`);
  console.log('='.repeat(80));
  
  const prefectures = Object.keys(areaProgress);
  
  for (const pref of prefectures) {
    const area = areaProgress[pref];
    const station = stationProgress[pref];
    
    console.log(`\n📍 ${pref}`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // エリア進捗
    const areaBar = getProgressBar(area.generated, area.total, 30);
    console.log(`  🏘️  エリア: ${areaBar} ${area.generated}/${area.total} (${area.progress}%)`);
    if (area.remaining > 0) {
      console.log(`      ⏳ 残り: ${area.remaining}件`);
    }
    
    // 駅進捗
    const stationBar = getProgressBar(station.generated, station.total, 30);
    console.log(`  🚉 駅:     ${stationBar} ${station.generated}/${station.total} (${station.progress}%)`);
    if (station.remaining > 0) {
      console.log(`      ⏳ 残り: ${station.remaining}件`);
    }
    
    // 合計
    const totalArea = area.total;
    const totalStation = station.total;
    const totalGenerated = area.generated + station.generated;
    const totalAll = totalArea + totalStation;
    const totalProgress = totalAll > 0 ? Math.round((totalGenerated / totalAll) * 100) : 0;
    const totalBar = getProgressBar(totalGenerated, totalAll, 30);
    console.log(`  📦 合計:   ${totalBar} ${totalGenerated}/${totalAll} (${totalProgress}%)`);
  }
  
  // 全体サマリー
  let totalAreaAll = 0;
  let totalStationAll = 0;
  let generatedAreaAll = 0;
  let generatedStationAll = 0;
  
  for (const pref of prefectures) {
    totalAreaAll += areaProgress[pref].total;
    totalStationAll += stationProgress[pref].total;
    generatedAreaAll += areaProgress[pref].generated;
    generatedStationAll += stationProgress[pref].generated;
  }
  
  const totalAll = totalAreaAll + totalStationAll;
  const generatedAll = generatedAreaAll + generatedStationAll;
  const progressAll = totalAll > 0 ? Math.round((generatedAll / totalAll) * 100) : 0;
  const barAll = getProgressBar(generatedAll, totalAll, 30);
  
  console.log('\n' + '━'.repeat(80));
  console.log(`📊 全体サマリー`);
  console.log('━'.repeat(80));
  console.log(`  🏘️  エリア: ${generatedAreaAll}/${totalAreaAll} (${totalAreaAll > 0 ? Math.round((generatedAreaAll / totalAreaAll) * 100) : 0}%)`);
  console.log(`  🚉 駅:     ${generatedStationAll}/${totalStationAll} (${totalStationAll > 0 ? Math.round((generatedStationAll / totalStationAll) * 100) : 0}%)`);
  console.log(`  📦 合計:   ${barAll} ${generatedAll}/${totalAll} (${progressAll}%)`);
}

function getProgressBar(current, total, width = 30) {
  if (total === 0) return '░'.repeat(width);
  const percent = Math.min(current / total, 1); // 100%を超えないように
  const filled = Math.floor(percent * width);
  const empty = Math.max(0, width - filled); // 負の値を防ぐ
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// メイン処理
console.log('\n🔍 データ生成進捗確認中...\n');

const houseAreaProgress = getAreaProgress('house');
const houseStationProgress = getStationProgress('house');
const landAreaProgress = getAreaProgress('land');
const landStationProgress = getStationProgress('land');

displayProgress('建物（house）データ生成進捗', houseAreaProgress, houseStationProgress);
displayProgress('土地（land）データ生成進捗', landAreaProgress, landStationProgress);

console.log('\n' + '='.repeat(80));
console.log('✅ 進捗確認完了');
console.log('='.repeat(80) + '\n');
