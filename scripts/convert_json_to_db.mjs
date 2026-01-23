import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// JSONファイルを再帰的に読み込む
function loadJsonFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...loadJsonFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(content);
        
        // データが配列の場合、アプリケーションが期待する形式に変換
        if (Array.isArray(data) && data.length > 0) {
          // 各JSONファイルを1つの物件として扱い、配列内の各アイテムをbuyersとして扱う
          const fileName = entry.name.replace('.json', '');
          const address = data[0].city || data[0].station || fileName;
          
          // 駅データの場合
          if (data[0].rail_company && data[0].line && data[0].station) {
            const stationName = `${data[0].rail_company} ${data[0].line} ${data[0].station}`;
            files.push({
              name: `${stationName}周辺の${data[0].type || '物件'}`,
              address: stationName,
              station: stationName,
              buyers: data.map(item => ({
                price: item.price || '価格応相談',
                method: item.method || '未定',
                occupation: item.occupation || '',
                reason: item.reason || '',
                timing: item.timing || '',
                ng: item.ng || '特になし',
                family: item.family || '',
                age: item.age || ''
              }))
            });
          }
          // エリアデータの場合
          else if (data[0].city) {
            files.push({
              name: `${data[0].city}の${data[0].type || '物件'}`,
              address: `${data[0].pref || ''} ${data[0].city}`,
              buyers: data.map(item => ({
                price: item.price || '価格応相談',
                method: item.method || '未定',
                occupation: item.occupation || '',
                reason: item.reason || '',
                timing: item.timing || '',
                ng: item.ng || '特になし',
                family: item.family || '',
                age: item.age || ''
              }))
            });
          }
          // その他の場合（既に正しい形式の可能性）
          else {
            files.push(...data);
          }
        } else if (typeof data === 'object') {
          files.push(data);
        }
      } catch (error) {
        console.error(`エラー: ${fullPath} の読み込みに失敗:`, error.message);
      }
    }
  }
  
  return files;
}

// データベースファイルを生成
function generateDatabaseFiles() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 JSONファイルからデータベースを生成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 建物データ
  const houseAreaDir = path.join(PROJECT_ROOT, 'data', 'house', 'area');
  const houseStationDir = path.join(PROJECT_ROOT, 'data', 'house', 'station');
  
  let houseData = [];
  if (fs.existsSync(houseAreaDir)) {
    const areaData = loadJsonFiles(houseAreaDir);
    houseData.push(...areaData);
    console.log(`✅ 建物エリアデータ: ${areaData.length}件`);
  }
  if (fs.existsSync(houseStationDir)) {
    const stationData = loadJsonFiles(houseStationDir);
    houseData.push(...stationData);
    console.log(`✅ 建物駅データ: ${stationData.length}件`);
  }
  
  // 土地データ
  const landAreaDir = path.join(PROJECT_ROOT, 'data', 'land', 'area');
  const landStationDir = path.join(PROJECT_ROOT, 'data', 'land', 'station');
  
  let landData = [];
  if (fs.existsSync(landAreaDir)) {
    const areaData = loadJsonFiles(landAreaDir);
    landData.push(...areaData);
    console.log(`✅ 土地エリアデータ: ${areaData.length}件`);
  }
  if (fs.existsSync(landStationDir)) {
    const stationData = loadJsonFiles(landStationDir);
    landData.push(...stationData);
    console.log(`✅ 土地駅データ: ${stationData.length}件`);
  }
  
  // データベースファイルを生成
  const houseDbContent = `// 戸建データベース
// AUTO-GENERATED. DO NOT EDIT BY HAND.
// 完成しているJSONファイルから自動生成

export const HOUSE_DB = ${JSON.stringify(houseData, null, 2)};

export default HOUSE_DB;
`;
  
  const landDbContent = `// 土地データベース
// AUTO-GENERATED. DO NOT EDIT BY HAND.
// 完成しているJSONファイルから自動生成

export const LAND_DB = ${JSON.stringify(landData, null, 2)};

export default LAND_DB;
`;
  
  fs.writeFileSync(path.join(PROJECT_ROOT, 'house_db.js'), houseDbContent, 'utf-8');
  fs.writeFileSync(path.join(PROJECT_ROOT, 'land_db.js'), landDbContent, 'utf-8');
  
  console.log(`\n✅ house_db.js を生成しました (${houseData.length}件)`);
  console.log(`✅ land_db.js を生成しました (${landData.length}件)`);
  
  // 購入希望者数の合計
  const houseBuyers = houseData.reduce((sum, item) => sum + (item.buyers?.length || 0), 0);
  const landBuyers = landData.reduce((sum, item) => sum + (item.buyers?.length || 0), 0);
  
  console.log(`\n📊 購入希望者数:`);
  console.log(`   建物: ${houseBuyers.toLocaleString()}組`);
  console.log(`   土地: ${landBuyers.toLocaleString()}組`);
  console.log(`   合計: ${(houseBuyers + landBuyers).toLocaleString()}組`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

generateDatabaseFiles();
