#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGrib2 } from './src/parser.js';
import { convertToWindJson } from './src/converter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定義目錄路徑
const grb2Dir = path.join(__dirname, 'grb2');
const jsonDir = path.join(__dirname, 'json');

// 確保 json 目錄存在
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
  console.log(`已建立輸出目錄：${jsonDir}`);
}

// 檢查 grb2 目錄是否存在
if (!fs.existsSync(grb2Dir)) {
  console.error(`錯誤：找不到 grb2 目錄：${grb2Dir}`);
  console.log('請先建立 grb2 目錄並將 .grb2 檔案放入其中');
  process.exit(1);
}

// 取得所有 .grb2 檔案
function getGrb2Files(dir) {
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.toLowerCase().endsWith('.grb2'))
    .map(file => path.join(dir, file));
}

async function processFile(inputFile) {
  try {
    console.log(`\n正在處理：${path.basename(inputFile)}`);
    
    // 解析 GRIB2 檔案
    const sourceData = await parseGrib2(inputFile);
    
    // 從輸入檔案名稱取得基礎檔名（不含路徑和副檔名）
    const inputBaseName = path.basename(inputFile, path.extname(inputFile));
    const sourceFileName = `${inputBaseName}.json`;
    
    // 儲存 source.json 到 json 目錄（使用與來源檔案同名的檔名）
    const sourceJsonPath = path.join(jsonDir, sourceFileName);
    fs.writeFileSync(sourceJsonPath, JSON.stringify(sourceData, null, 2));
    console.log(`  ✓ 已生成 ${sourceFileName}`);
    
    // 轉換為 wind.json 格式
    const windData = convertToWindJson(sourceData);
    
    // 根據日期和預報小時數生成檔案名稱
    // 日期格式為 YYYYMMDDHH，預報小時數預設為 0，使用三位數格式（補零）
    let windFileName = 'wind.json';
    if (sourceData.dataDate) {
      const fcst = sourceData.forecastHour !== null && sourceData.forecastHour !== undefined 
        ? sourceData.forecastHour 
        : 0;
      // 將預報小時數格式化為三位數（例如：0 -> 000, 84 -> 084）
      const fcstFormatted = String(fcst).padStart(3, '0');
      windFileName = `wind-${sourceData.dataDate}-${fcstFormatted}.json`;
    }
    
    // 儲存 wind.json 到 json 目錄
    const windJsonPath = path.join(jsonDir, windFileName);
    fs.writeFileSync(windJsonPath, JSON.stringify(windData, null, 2));
    console.log(`  ✓ 已生成 ${windFileName}`);
  } catch (error) {
    console.error(`  ✗ 處理失敗：${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // 取得所有 .grb2 檔案
    const grb2Files = getGrb2Files(grb2Dir);
    
    if (grb2Files.length === 0) {
      console.log(`在 ${grb2Dir} 目錄中找不到任何 .grb2 檔案`);
      process.exit(0);
    }
    
    console.log(`找到 ${grb2Files.length} 個 GRIB2 檔案，開始批次處理...\n`);
    
    // 批次處理所有檔案
    let successCount = 0;
    let failCount = 0;
    
    for (const file of grb2Files) {
      try {
        await processFile(file);
        successCount++;
      } catch (error) {
        failCount++;
        // 繼續處理下一個檔案
      }
    }
    
    console.log(`\n批次處理完成！`);
    console.log(`  成功：${successCount} 個檔案`);
    if (failCount > 0) {
      console.log(`  失敗：${failCount} 個檔案`);
    }
    console.log(`  輸出目錄：${jsonDir}`);
  } catch (error) {
    console.error('錯誤：', error.message);
    process.exit(1);
  }
}

main();

