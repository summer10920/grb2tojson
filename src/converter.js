/**
 * 將 source.json 的資料轉換為 maplibre-wind 可用的格式
 * 
 * 對於 Lambert Conformal 投影（方案 A）：
 * {
 *   nx: number,
 *   ny: number,
 *   projection: {
 *     type: "lambert-conformal",
 *     lo1: number,      // 起始經度（度）
 *     la1: number,      // 起始緯度（度）
 *     lov: number,      // 中央子午線（度）
 *     latin1: number,   // 第一標準緯線（度）
 *     latin2: number,   // 第二標準緯線（度）
 *     dx: number,       // 網格間距（米）
 *     dy: number        // 網格間距（米）
 *   },
 *   u: number[],
 *   v: number[]
 * }
 * 
 * 對於 lat-lon 網格（向後兼容）：
 * {
 *   dx: number,    // X 方向的網格間距（度）
 *   dy: number,    // Y 方向的網格間距（度）
 *   nx: number,    // X 方向的網格點數
 *   ny: number,    // Y 方向的網格點數
 *   lo1: number,   // 起始經度（度）
 *   la1: number,   // 起始緯度（度）
 *   u: number[],   // U 分量風速陣列
 *   v: number[]    // V 分量風速陣列
 * }
 */
export function convertToWindJson(sourceData) {
  const grid = sourceData.grid || {};
  const isLambert = grid.projection === 'lambert-conformal';
  
  // 初始化結果物件
  const result = {};
  
  // 如果是 Lambert Conformal 投影，使用方案 A 格式
  if (isLambert) {
    // 先建立 projection 物件（放在最前面）
    result.projection = {
      type: 'lambert-conformal',
      lo1: grid.lo1,
      la1: grid.la1,
      lov: grid.lov,
      latin1: grid.latin1,
      latin2: grid.latin2,
      dx: grid.dx,  // 米
      dy: grid.dy   // 米
    };
    
    // 添加資料日期到 projection 物件內（如果有的話）
    if (sourceData.dataDate) {
      result.projection.date = sourceData.dataDate;
    }
    
    // 添加預報小時數到 projection 物件內（預設為 0）
    result.projection.fcst = sourceData.forecastHour !== null && sourceData.forecastHour !== undefined 
      ? sourceData.forecastHour 
      : 0;
    
    // 然後添加基本網格資訊
    result.nx = grid.nx;
    result.ny = grid.ny;
  } else {
    // 對於 lat-lon 網格，使用原有格式（向後兼容）
    result.dx = grid.dx;
    result.dy = grid.dy;
    result.nx = grid.nx;
    result.ny = grid.ny;
    result.lo1 = grid.lo1;
    result.la1 = grid.la1;
    
    // 對於 lat-lon 網格，日期放在頂層
    if (sourceData.dataDate) {
      result.date = sourceData.dataDate;
    }
  }
  
  // 最後添加風速資料陣列
  result.u = [];
  result.v = [];
  
  // 從 windComponents 提取 U 和 V 資料（這是最可靠的來源）
  if (sourceData.windComponents) {
    if (sourceData.windComponents.u && Array.isArray(sourceData.windComponents.u)) {
      result.u = sourceData.windComponents.u;
    }
    if (sourceData.windComponents.v && Array.isArray(sourceData.windComponents.v)) {
      result.v = sourceData.windComponents.v;
    }
  }
  
  // 如果 windComponents 沒有資料，嘗試從 records 中提取
  if (result.u.length === 0 || result.v.length === 0) {
    // 嘗試從 JSON records 中尋找 U 和 V 分量
    if (Array.isArray(sourceData.records)) {
      for (const record of sourceData.records) {
        // 檢查是否為 U 分量（parameterCategory=2, parameterNumber=2 表示 U-component of wind）
        if (record.parameterCategory === 2 && record.parameterNumber === 2) {
          if (record.values && Array.isArray(record.values)) {
            result.u = record.values;
          }
        }
        // 檢查是否為 V 分量（parameterCategory=2, parameterNumber=3 表示 V-component of wind）
        if (record.parameterCategory === 2 && record.parameterNumber === 3) {
          if (record.values && Array.isArray(record.values)) {
            result.v = record.values;
          }
        }
      }
    } else if (sourceData.records && typeof sourceData.records === 'object') {
      // 如果 records 是物件，嘗試尋找相關欄位
      if (sourceData.records.u && Array.isArray(sourceData.records.u)) {
        result.u = sourceData.records.u;
      }
      if (sourceData.records.v && Array.isArray(sourceData.records.v)) {
        result.v = sourceData.records.v;
      }
    }
  }
  
  // 驗證並報告結果
  let requiredFields;
  if (isLambert) {
    requiredFields = ['nx', 'ny', 'projection', 'u', 'v'];
    const projectionFields = ['type', 'lo1', 'la1', 'lov', 'latin1', 'latin2', 'dx', 'dy'];
    const missingProjectionFields = projectionFields.filter(field => {
      return result.projection[field] === null || result.projection[field] === undefined;
    });
    
    if (missingProjectionFields.length > 0) {
      console.warn(`\n警告：wind.json 的 projection 物件缺少以下欄位：${missingProjectionFields.join(', ')}`);
    }
  } else {
    requiredFields = ['dx', 'dy', 'nx', 'ny', 'lo1', 'la1', 'u', 'v'];
  }
  
  const missingFields = requiredFields.filter(field => {
    if (field === 'u' || field === 'v') {
      return !Array.isArray(result[field]) || result[field].length === 0;
    }
    if (field === 'projection') {
      return !result[field] || typeof result[field] !== 'object';
    }
    return result[field] === null || result[field] === undefined;
  });
  
  if (missingFields.length > 0) {
    console.warn(`\n警告：wind.json 缺少以下必要欄位：${missingFields.join(', ')}`);
    console.warn('請檢查 source.json 以了解資料結構');
    console.warn('wind.json 可能無法在 maplibre-wind 中正常使用\n');
  } else {
    console.log('\n✓ 成功提取所有必要欄位：');
    console.log(`  - 網格大小：${result.nx} x ${result.ny}`);
    if (isLambert) {
      console.log(`  - 投影類型：Lambert Conformal`);
      console.log(`  - 起始位置：經度 ${result.projection.lo1}°, 緯度 ${result.projection.la1}°`);
      console.log(`  - 中央子午線：${result.projection.lov}°`);
      console.log(`  - 標準緯線：${result.projection.latin1}°, ${result.projection.latin2}°`);
      console.log(`  - 網格間距：dx=${result.projection.dx} m, dy=${result.projection.dy} m`);
    } else {
      console.log(`  - 起始位置：經度 ${result.lo1}°, 緯度 ${result.la1}°`);
      console.log(`  - 網格間距：dx=${result.dx}°, dy=${result.dy}°`);
    }
    console.log(`  - U 分量資料點：${result.u.length}`);
    console.log(`  - V 分量資料點：${result.v.length}\n`);
  }
  
  return result;
}

