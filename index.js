#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGrib2 } from './src/parser.js';
import { convertToWindJson } from './src/converter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 取得命令列參數
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('錯誤：請提供 GRIB2 檔案路徑');
  console.log('使用方法：node index.js <input.grb2>');
  process.exit(1);
}

const inputFile = args[0];

// 檢查檔案是否存在
if (!fs.existsSync(inputFile)) {
  console.error(`錯誤：檔案不存在：${inputFile}`);
  process.exit(1);
}

// 檢查是否為 .grb2 檔案
if (!inputFile.toLowerCase().endsWith('.grb2')) {
  console.warn('警告：檔案副檔名不是 .grb2');
}

async function main() {
  try {
    console.log(`正在解析 GRIB2 檔案：${inputFile}`);
    
    // 解析 GRIB2 檔案
    const sourceData = await parseGrib2(inputFile);
    
    // 儲存 source.json
    const sourceJsonPath = path.join(__dirname, 'source.json');
    fs.writeFileSync(sourceJsonPath, JSON.stringify(sourceData, null, 2));
    console.log(`✓ 已生成 source.json`);
    
    // 轉換為 wind.json 格式
    const windData = convertToWindJson(sourceData);
    
    // 儲存 wind.json
    const windJsonPath = path.join(__dirname, 'wind.json');
    fs.writeFileSync(windJsonPath, JSON.stringify(windData, null, 2));
    console.log(`✓ 已生成 wind.json`);
    
    console.log('\n轉換完成！');
  } catch (error) {
    console.error('錯誤：', error.message);
    process.exit(1);
  }
}

main();

