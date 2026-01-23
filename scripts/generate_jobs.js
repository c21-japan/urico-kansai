#!/usr/bin/env node

/**
 * ジョブ生成スクリプト
 * area_data.jsonとrailway_data.jsonから、各市区町村・各沿線駅のジョブファイルを生成
 */

const fs = require('fs');
const path = require('path');

const AREA_DATA_PATH = path.join(__dirname, '../area_data.json');
const RAILWAY_DATA_PATH = path.join(__dirname, '../railway_data.json');
const JOBS_DIR = path.join(__dirname, '../jobs');
const PROMPTS_DIR = path.join(__dirname, '../prompts');

// ジョブタイプ
const JOB_TYPES = {
  HOUSE: 'house',
  LAND: 'land',
  MANSION: 'mansion'
};

/**
 * ジョブファイルを生成
 */
function generateJobs() {
  // ディレクトリ作成
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }

  // プロンプトテンプレートを読み込み
  const houseTemplate = fs.readFileSync(
    path.join(PROMPTS_DIR, 'house_template.txt'),
    'utf-8'
  );
  const landTemplate = fs.readFileSync(
    path.join(PROMPTS_DIR, 'land_template.txt'),
    'utf-8'
  );
  const mansionTemplate = fs.readFileSync(
    path.join(PROMPTS_DIR, 'mansion_template.txt'),
    'utf-8'
  );

  // area_data.jsonを読み込み
  const areaData = JSON.parse(fs.readFileSync(AREA_DATA_PATH, 'utf-8'));
  
  // railway_data.jsonを読み込み
  const railwayData = JSON.parse(fs.readFileSync(RAILWAY_DATA_PATH, 'utf-8'));

  const jobs = [];

  // 市区町村のジョブを生成
  for (const [prefecture, cities] of Object.entries(areaData)) {
    for (const city of cities) {
      // 戸建
      const houseJob = {
        id: `house_area_${prefecture}_${city}`,
        type: JOB_TYPES.HOUSE,
        area: city,
        prefecture: prefecture,
        prompt: houseTemplate.replace(/\{\{AREA_NAME\}\}/g, city),
        outputFile: `house_area_${prefecture}_${city.replace(/\s+/g, '_')}.txt`
      };
      jobs.push(houseJob);
      fs.writeFileSync(
        path.join(JOBS_DIR, `${houseJob.id}.json`),
        JSON.stringify(houseJob, null, 2),
        'utf-8'
      );

      // 土地
      const landJob = {
        id: `land_area_${prefecture}_${city}`,
        type: JOB_TYPES.LAND,
        area: city,
        prefecture: prefecture,
        prompt: landTemplate.replace(/\{\{AREA_NAME\}\}/g, city),
        outputFile: `land_area_${prefecture}_${city.replace(/\s+/g, '_')}.txt`
      };
      jobs.push(landJob);
      fs.writeFileSync(
        path.join(JOBS_DIR, `${landJob.id}.json`),
        JSON.stringify(landJob, null, 2),
        'utf-8'
      );

      // マンション（既にデータがあるためスキップ）
      // const mansionJob = {
      //   id: `mansion_area_${prefecture}_${city}`,
      //   type: JOB_TYPES.MANSION,
      //   area: city,
      //   prefecture: prefecture,
      //   prompt: mansionTemplate.replace(/\{\{AREA_NAME\}\}/g, city),
      //   outputFile: `mansion_area_${prefecture}_${city.replace(/\s+/g, '_')}.txt`
      // };
      // jobs.push(mansionJob);
      // fs.writeFileSync(
      //   path.join(JOBS_DIR, `${mansionJob.id}.json`),
      //   JSON.stringify(mansionJob, null, 2),
      //   'utf-8'
      // );
    }
  }

  // 沿線駅のジョブを生成
  for (const [company, lines] of Object.entries(railwayData)) {
    for (const [lineName, stations] of Object.entries(lines)) {
      for (const station of stations) {
        // 戸建
        const houseJob = {
          id: `house_station_${company}_${lineName}_${station}`,
          type: JOB_TYPES.HOUSE,
          area: `${station}駅`,
          prefecture: null, // 駅は都道府県判定が複雑なためnull
          prompt: houseTemplate.replace(/\{\{AREA_NAME\}\}/g, `${station}駅周辺`),
          outputFile: `house_station_${company}_${lineName}_${station}.txt`
        };
        jobs.push(houseJob);
        fs.writeFileSync(
          path.join(JOBS_DIR, `${houseJob.id}.json`),
          JSON.stringify(houseJob, null, 2),
          'utf-8'
        );

        // 土地
        const landJob = {
          id: `land_station_${company}_${lineName}_${station}`,
          type: JOB_TYPES.LAND,
          area: `${station}駅`,
          prefecture: null, // 駅は都道府県判定が複雑なためnull
          prompt: landTemplate.replace(/\{\{AREA_NAME\}\}/g, `${station}駅周辺`),
          outputFile: `land_station_${company}_${lineName}_${station}.txt`
        };
        jobs.push(landJob);
        fs.writeFileSync(
          path.join(JOBS_DIR, `${landJob.id}.json`),
          JSON.stringify(landJob, null, 2),
          'utf-8'
        );

        // マンション（既にデータがあるためスキップ）
        // const mansionJob = {
        //   id: `mansion_station_${company}_${lineName}_${station}`,
        //   type: JOB_TYPES.MANSION,
        //   area: `${station}駅`,
        //   prefecture: null, // 駅は都道府県判定が複雑なためnull
        //   prompt: mansionTemplate.replace(/\{\{AREA_NAME\}\}/g, `${station}駅周辺`),
        //   outputFile: `mansion_station_${company}_${lineName}_${station}.txt`
        // };
        // jobs.push(mansionJob);
        // fs.writeFileSync(
        //   path.join(JOBS_DIR, `${mansionJob.id}.json`),
        //   JSON.stringify(mansionJob, null, 2),
        //   'utf-8'
        // );
      }
    }
  }

  // ジョブ一覧を保存
  fs.writeFileSync(
    path.join(JOBS_DIR, '_jobs_list.json'),
    JSON.stringify(jobs, null, 2),
    'utf-8'
  );

  console.log(`✅ ${jobs.length}件のジョブを生成しました`);
  console.log(`   - 戸建: ${jobs.filter(j => j.type === JOB_TYPES.HOUSE).length}件`);
  console.log(`   - 土地: ${jobs.filter(j => j.type === JOB_TYPES.LAND).length}件`);
  console.log(`   - マンション: ${jobs.filter(j => j.type === JOB_TYPES.MANSION).length}件（既にデータがあるためスキップ）`);
}

// 実行
generateJobs();
