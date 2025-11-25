import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * 檢查系統是否安裝了 wgrib2
 */
async function checkWgrib2() {
  try {
    await execAsync('which wgrib2');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 使用 wgrib2 解析 GRIB2 檔案並取得 JSON 格式
 */
async function parseGrib2WithWgrib2(filePath) {
  try {
    // 使用 wgrib2 的 -json 選項輸出 JSON（不需要 -）
    const { stdout } = await execAsync(`wgrib2 "${filePath}" -json`);
    const jsonData = JSON.parse(stdout);
    return jsonData;
  } catch (error) {
    throw new Error(`wgrib2 解析失敗：${error.message}`);
  }
}

/**
 * 使用 wgrib2 取得網格資訊
 */
async function getGridInfo(filePath) {
  try {
    // wgrib2 會自動輸出到標準輸出，不需要 - 
    const { stdout } = await execAsync(`wgrib2 "${filePath}" -grid`);
    return stdout;
  } catch (error) {
    throw new Error(`無法取得網格資訊：${error.message}`);
  }
}

/**
 * 解析網格資訊字串
 */
function parseGridInfo(gridInfo) {
  const info = {};
  
  // gridInfo 可能是多行格式，合併所有行來解析
  const allLines = gridInfo.split('\n').join(' ').replace(/\s+/g, ' ');
  
  // 解析 lat-lon grid（標準經緯度網格）
  // 格式範例：lat-lon grid:(361 x 181) lat 90.000000 to -90.000000 lon 0.000000 to 359.000000
  let gridMatch = allLines.match(/lat-lon grid:\s*\((\d+)\s*x\s*(\d+)\)/i);
  if (gridMatch) {
    info.nx = parseInt(gridMatch[1]);
    info.ny = parseInt(gridMatch[2]);
    info.projection = 'lat-lon';
    
    // 解析 lat-lon 的經緯度範圍
    const latMatch = allLines.match(/lat\s+([\d.\-]+)\s+to\s+([\d.\-]+)/i);
    if (latMatch) {
      info.la1 = parseFloat(latMatch[1]);
      info.la2 = parseFloat(latMatch[2]);
    }
    
    const lonMatch = allLines.match(/lon\s+([\d.\-]+)\s+to\s+([\d.\-]+)/i);
    if (lonMatch) {
      info.lo1 = parseFloat(lonMatch[1]);
      info.lo2 = parseFloat(lonMatch[2]);
    }
    
    // 計算 dx 和 dy（度）
    if (info.nx && info.lo1 !== undefined && info.lo2 !== undefined) {
      const lonRange = info.lo2 >= info.lo1 
        ? info.lo2 - info.lo1 
        : (360 + info.lo2) - info.lo1;
      info.dx = lonRange / (info.nx - 1);
    }
    if (info.ny && info.la1 !== undefined && info.la2 !== undefined) {
      info.dy = Math.abs(info.la1 - info.la2) / (info.ny - 1);
    }
  }
  
  // 解析 Lambert Conformal 投影
  // 格式範例：Lambert Conformal: (1158 x 673) Lat1 14.022240 Lon1 105.250000 LoV 120.000000
  //          LatD 10.000000 Latin1 10.000000 Latin2 40.000000
  //          North Pole (1158 x 673) Dx 3000.000000 m Dy 3000.000000 m
  const lambertMatch = allLines.match(/Lambert Conformal:\s*\((\d+)\s*x\s*(\d+)\)/i);
  if (lambertMatch) {
    info.nx = parseInt(lambertMatch[1]);
    info.ny = parseInt(lambertMatch[2]);
    info.projection = 'lambert-conformal';
    
    // 解析起始點
    const lat1Match = allLines.match(/Lat1\s+([\d.\-]+)/i);
    const lon1Match = allLines.match(/Lon1\s+([\d.\-]+)/i);
    if (lat1Match) info.la1 = parseFloat(lat1Match[1]);
    if (lon1Match) info.lo1 = parseFloat(lon1Match[1]);
    
    // 解析投影參數：LoV（中央子午線）
    const lovMatch = allLines.match(/LoV\s+([\d.\-]+)/i);
    if (lovMatch) info.lov = parseFloat(lovMatch[1]);
    
    // 解析投影參數：Latin1（第一標準緯線）
    const latin1Match = allLines.match(/Latin1\s+([\d.\-]+)/i);
    if (latin1Match) info.latin1 = parseFloat(latin1Match[1]);
    
    // 解析投影參數：Latin2（第二標準緯線）
    const latin2Match = allLines.match(/Latin2\s+([\d.\-]+)/i);
    if (latin2Match) info.latin2 = parseFloat(latin2Match[1]);
    
    // 解析網格間距（米）- 保留為米，不要轉換為度
    const dxMatch = allLines.match(/Dx\s+([\d.]+)\s+m/i);
    const dyMatch = allLines.match(/Dy\s+([\d.]+)\s+m/i);
    if (dxMatch) {
      info.dx = parseFloat(dxMatch[1]); // 保留為米
    }
    if (dyMatch) {
      info.dy = parseFloat(dyMatch[1]); // 保留為米
    }
    
    // 對於 Lambert 投影，我們需要計算一個近似的經緯度範圍（用於顯示）
    // 使用起始點和網格大小來估算（這裡使用近似轉換，僅用於顯示）
    if (info.lo1 !== undefined && info.dx !== undefined) {
      const dxDegrees = info.dx / 111000; // 僅用於估算顯示範圍
      info.lo2 = info.lo1 + (dxDegrees * (info.nx - 1));
    }
    if (info.la1 !== undefined && info.dy !== undefined) {
      const dyDegrees = info.dy / 111000; // 僅用於估算顯示範圍
      info.la2 = info.la1 - (dyDegrees * (info.ny - 1)); // 通常從北到南
    }
  }
  
  return info;
}

/**
 * 使用 wgrib2 提取 U 和 V 分量資料
 */
async function extractWindComponents(filePath) {
  try {
    // 列出所有記錄
    const { stdout: listOutput } = await execAsync(`wgrib2 "${filePath}" -s`);
    const lines = listOutput.trim().split('\n').filter(line => line.trim());
    
    let uRecord = null;
    let vRecord = null;
    
    // 尋找 U 和 V 分量（優先尋找 10 m above ground 的風速，這是地面風速）
    // 格式：67:154320564:d=2025111400:UGRD:10 m above ground:84 hour fcst:
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      // 優先尋找 10 m above ground 的 U 分量
      if (!uRecord && (upperLine.includes(':UGRD:10 M ABOVE GROUND') || 
          upperLine.includes(':UGRD:10M ABOVE GROUND'))) {
        const match = line.match(/^(\d+):/);
        if (match) {
          uRecord = match[1];
          console.log(`找到 10m 高度的 U 分量記錄：${line}`);
        }
      }
      
      // 優先尋找 10 m above ground 的 V 分量
      if (!vRecord && (upperLine.includes(':VGRD:10 M ABOVE GROUND') || 
          upperLine.includes(':VGRD:10M ABOVE GROUND'))) {
        const match = line.match(/^(\d+):/);
        if (match) {
          vRecord = match[1];
          console.log(`找到 10m 高度的 V 分量記錄：${line}`);
        }
      }
    }
    
    // 如果沒找到 10m 的，尋找其他高度的 UGRD/VGRD
    if (!uRecord || !vRecord) {
      for (const line of lines) {
        const upperLine = line.toUpperCase();
        
        // 尋找任何 UGRD 記錄
        if (!uRecord && upperLine.includes(':UGRD:')) {
          const match = line.match(/^(\d+):/);
          if (match) {
            uRecord = match[1];
            console.log(`找到 U 分量記錄：${line}`);
          }
        }
        
        // 尋找任何 VGRD 記錄
        if (!vRecord && upperLine.includes(':VGRD:')) {
          const match = line.match(/^(\d+):/);
          if (match) {
            vRecord = match[1];
            console.log(`找到 V 分量記錄：${line}`);
          }
        }
      }
    }
    
    const result = {};
    
    // 提取 U 分量資料
    if (uRecord) {
      try {
        // 使用 -csv 選項輸出 CSV 格式，或使用臨時檔案
        // 先嘗試使用 -csv 輸出到標準輸出
        const { stdout: uData } = await execAsync(`wgrib2 "${filePath}" -d ${uRecord} -csv -`);
        const csvLines = uData.trim().split('\n');
        result.u = [];
        for (const line of csvLines) {
          if (line.trim()) {
            // CSV 格式：lon,lat,value
            const parts = line.split(',');
            if (parts.length >= 3) {
              const value = parseFloat(parts[2]);
              if (!isNaN(value)) {
                result.u.push(value);
              }
            }
          }
        }
        console.log(`找到 U 分量記錄：${uRecord}，資料點數：${result.u.length}`);
      } catch (error) {
        // 如果 -csv 失敗，嘗試使用臨時檔案
        try {
          const tmpFile = `/tmp/wgrib2_u_${Date.now()}.txt`;
          await execAsync(`wgrib2 "${filePath}" -d ${uRecord} -text ${tmpFile}`);
          const uData = fs.readFileSync(tmpFile, 'utf8');
          result.u = parseTextData(uData);
          fs.unlinkSync(tmpFile); // 刪除臨時檔案
          console.log(`找到 U 分量記錄：${uRecord}，資料點數：${result.u.length}`);
        } catch (error2) {
          console.warn(`提取 U 分量失敗：${error2.message}`);
        }
      }
    } else {
      console.warn('未找到 U 分量記錄');
    }
    
    // 提取 V 分量資料
    if (vRecord) {
      try {
        // 使用 -csv 選項輸出 CSV 格式
        const { stdout: vData } = await execAsync(`wgrib2 "${filePath}" -d ${vRecord} -csv -`);
        const csvLines = vData.trim().split('\n');
        result.v = [];
        for (const line of csvLines) {
          if (line.trim()) {
            // CSV 格式：lon,lat,value
            const parts = line.split(',');
            if (parts.length >= 3) {
              const value = parseFloat(parts[2]);
              if (!isNaN(value)) {
                result.v.push(value);
              }
            }
          }
        }
        console.log(`找到 V 分量記錄：${vRecord}，資料點數：${result.v.length}`);
      } catch (error) {
        // 如果 -csv 失敗，嘗試使用臨時檔案
        try {
          const tmpFile = `/tmp/wgrib2_v_${Date.now()}.txt`;
          await execAsync(`wgrib2 "${filePath}" -d ${vRecord} -text ${tmpFile}`);
          const vData = fs.readFileSync(tmpFile, 'utf8');
          result.v = parseTextData(vData);
          fs.unlinkSync(tmpFile); // 刪除臨時檔案
          console.log(`找到 V 分量記錄：${vRecord}，資料點數：${result.v.length}`);
        } catch (error2) {
          console.warn(`提取 V 分量失敗：${error2.message}`);
        }
      }
    } else {
      console.warn('未找到 V 分量記錄');
    }
    
    return result;
  } catch (error) {
    throw new Error(`提取風速分量失敗：${error.message}`);
  }
}

/**
 * 解析文字格式的資料
 */
function parseTextData(textData) {
  const lines = textData.trim().split('\n');
  const values = [];
  
  // wgrib2 -text 輸出到檔案時，記錄資訊會輸出到 stderr
  // 檔案內容：第一行是網格大小（格式如：1158 673），之後才是資料值
  // 所以我們只需要跳過第一行（網格大小）
  let skipFirstLine = true;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳過空行和註解
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // 跳過第一行（網格大小）
    if (skipFirstLine) {
      // 檢查是否為網格大小格式（兩個整數）
      const gridMatch = trimmedLine.match(/^\d+\s+\d+$/);
      if (gridMatch) {
        skipFirstLine = false;
        continue;
      }
    }
    
    // 解析數值
    const number = parseFloat(trimmedLine);
    if (!isNaN(number)) {
      values.push(number);
    } else {
      // 如果包含多個數字，嘗試分割
      const numbers = trimmedLine.split(/\s+/).map(Number);
      values.push(...numbers.filter(n => !isNaN(n)));
    }
  }
  
  return values;
}

/**
 * 主解析函數
 */
export async function parseGrib2(filePath) {
  // 檢查 wgrib2 是否可用
  const hasWgrib2 = await checkWgrib2();
  
  if (!hasWgrib2) {
    throw new Error(
      '未找到 wgrib2 工具。請先安裝 wgrib2：\n' +
      'macOS: brew install wgrib2\n' +
      'Linux: apt-get install wgrib2 或 yum install wgrib2\n' +
      'Windows: 從 https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/ 下載'
    );
  }
  
  console.log('使用 wgrib2 解析 GRIB2 檔案...');
  
  try {
    // 取得基本資訊
    console.log('取得網格資訊...');
    const gridInfo = await getGridInfo(filePath);
    const gridData = parseGridInfo(gridInfo);
    console.log('網格資訊：', gridData);
    
    // 取得所有記錄的列表
    console.log('列出所有記錄...');
    const { stdout: listOutput } = await execAsync(`wgrib2 "${filePath}" -s`);
    const recordsList = listOutput.trim().split('\n').filter(line => line.trim());
    console.log(`找到 ${recordsList.length} 個記錄`);
    
    // 取得 JSON 格式的完整資料（如果支援）
    let jsonData = null;
    try {
      jsonData = await parseGrib2WithWgrib2(filePath);
      console.log('成功使用 -json 選項解析');
    } catch (error) {
      console.warn('無法使用 -json 選項，將使用文字格式提取資料');
      jsonData = {
        records: recordsList,
        note: 'JSON 格式不可用，使用文字格式'
      };
    }
    
    // 取得風速分量資料
    console.log('提取風速分量...');
    const windComponents = await extractWindComponents(filePath);
    
    // 從 recordsList 提取日期資訊（格式：d=2025112418，包含小時）
    let dataDate = null;
    if (recordsList.length > 0) {
      const firstRecord = recordsList[0];
      const dateMatch = firstRecord.match(/d=(\d{10})/);
      if (dateMatch) {
        dataDate = dateMatch[1]; // 提取 YYYYMMDDHH 格式的日期（例如：2025112418）
      }
    }
    
    // 從 recordsList 提取預報小時數（格式：84 hour fcst）
    // 如果沒有找到 hour fcst，則設為 0（表示分析資料）
    let forecastHour = 0;
    if (recordsList.length > 0) {
      const firstRecord = recordsList[0];
      const fcstMatch = firstRecord.match(/(\d+)\s+hour\s+fcst/i);
      if (fcstMatch) {
        forecastHour = parseInt(fcstMatch[1]); // 提取預報小時數
      }
      // 如果沒有找到 hour fcst（例如：anl: 表示分析資料），forecastHour 保持為 0
    }
    
    // 組合所有資料
    const result = {
      file: filePath,
      grid: gridData,
      gridInfo: gridInfo,
      recordsList: recordsList,
      records: jsonData,
      windComponents: windComponents,
      dataDate: dataDate,
      forecastHour: forecastHour,
      metadata: {
        parsedAt: new Date().toISOString(),
        parser: 'wgrib2',
        totalRecords: recordsList.length
      }
    };
    
    return result;
  } catch (error) {
    throw new Error(`解析 GRIB2 檔案失敗：${error.message}`);
  }
}


