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
const tempDir = path.join(__dirname, 'temp');

// 確保目錄存在
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
  console.log(`已建立輸出目錄：${jsonDir}`);
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 生成預報小時數列表（000, 006, 012, ..., 084）
function generateForecastHours() {
  const hours = [];
  for (let i = 0; i <= 84; i += 6) {
    hours.push(String(i).padStart(3, '0'));
  }
  return hours;
}

// 生成下載 URL
function generateDownloadUrl(num) {
  return `https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Model/M-A0061-${num}.grb2`;
}

// 下載檔案
async function downloadFile(url, outputPath) {
  try {
    console.log(`  正在下載：${path.basename(outputPath)}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✓ 下載完成：${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`  ✗ 下載失敗：${error.message}`);
    return false;
  }
}

// 取得所有 .grb2 檔案（從本地目錄，作為備用）
function getGrb2Files(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
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
    // 生成所有需要下載的檔案 URL
    const forecastHours = generateForecastHours();
    console.log(`準備下載 ${forecastHours.length} 個 GRIB2 檔案...\n`);
    
    // 下載所有檔案到臨時目錄
    const downloadedFiles = [];
    let downloadSuccessCount = 0;
    let downloadFailCount = 0;
    
    for (const hour of forecastHours) {
      const url = generateDownloadUrl(hour);
      const fileName = `M-A0061-${hour}.grb2`;
      const tempFilePath = path.join(tempDir, fileName);
      
      const success = await downloadFile(url, tempFilePath);
      if (success) {
        downloadedFiles.push(tempFilePath);
        downloadSuccessCount++;
      } else {
        downloadFailCount++;
      }
    }
    
    console.log(`\n下載完成！`);
    console.log(`  成功：${downloadSuccessCount} 個檔案`);
    if (downloadFailCount > 0) {
      console.log(`  失敗：${downloadFailCount} 個檔案`);
    }
    
    if (downloadedFiles.length === 0) {
      console.log('\n沒有成功下載任何檔案，無法繼續處理');
      process.exit(1);
    }
    
    console.log(`\n開始處理 ${downloadedFiles.length} 個 GRIB2 檔案...\n`);
    
    // 批次處理所有下載的檔案
    let successCount = 0;
    let failCount = 0;
    
    for (const file of downloadedFiles) {
      try {
        await processFile(file);
        successCount++;
        
        // 處理完成後刪除臨時檔案
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn(`  警告：無法刪除臨時檔案 ${file}`);
        }
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

