/**
 * 將 source.json 的資料轉換為 maplibre-wind 可用的格式
 * maplibre-wind 需要的格式：
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
  const result = {
    dx: null,
    dy: null,
    nx: null,
    ny: null,
    lo1: null,
    la1: null,
    u: [],
    v: []
  };
  
  // 優先從 grid 資訊提取網格參數
  if (sourceData.grid) {
    result.dx = sourceData.grid.dx;
    result.dy = sourceData.grid.dy;
    result.nx = sourceData.grid.nx;
    result.ny = sourceData.grid.ny;
    result.lo1 = sourceData.grid.lo1;
    result.la1 = sourceData.grid.la1;
  }
  
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
          // 從 record 中提取網格資訊
          if (record.gridDefinitionTemplate) {
            const grid = record.gridDefinitionTemplate;
            result.dx = result.dx || grid.dx;
            result.dy = result.dy || grid.dy;
            result.nx = result.nx || grid.nx;
            result.ny = result.ny || grid.ny;
            result.lo1 = result.lo1 || grid.lo1;
            result.la1 = result.la1 || grid.la1;
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
  const requiredFields = ['dx', 'dy', 'nx', 'ny', 'lo1', 'la1', 'u', 'v'];
  const missingFields = requiredFields.filter(field => {
    if (field === 'u' || field === 'v') {
      return !Array.isArray(result[field]) || result[field].length === 0;
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
    console.log(`  - 起始位置：經度 ${result.lo1}°, 緯度 ${result.la1}°`);
    console.log(`  - 網格間距：dx=${result.dx}°, dy=${result.dy}°`);
    console.log(`  - U 分量資料點：${result.u.length}`);
    console.log(`  - V 分量資料點：${result.v.length}\n`);
  }
  
  return result;
}

