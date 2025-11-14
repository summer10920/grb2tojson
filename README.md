# GRIB2 轉 JSON 工具

將中央氣象局（CWA）提供的 GRIB2 格式風場資料轉換為 JSON 格式的工具。

## 功能

- 將 `.grb2` 檔案解析為完整的 JSON 資料（`source.json`）
- 轉換為 maplibre-wind 套件可用的格式（`wind.json`）

## 取得 GRIB2 檔案

**重要：** 由於 GRIB2 檔案體積較大（通常數百 MB），本專案**不包含**範例檔案。請從以下來源下載：

### 中央氣象局開放資料平台

**風場資料（M-A0064-084）：**
- 資料集網址：https://opendata.cwa.gov.tw/dataset/mathematics/M-A0064-084
- 說明：此資料集包含數值天氣預報模式的風場資料
- 格式：GRIB2（.grb2 副檔名）

**下載步驟：**
1. 前往 [中央氣象局開放資料平台](https://opendata.cwa.gov.tw/dataset/mathematics/M-A0064-084)
2. 選擇需要的資料檔案（通常以日期和預報時段命名，例如：`M-A0064-084.grb2`）
3. 下載檔案到本專案目錄
4. 使用本工具進行轉換

**注意：**
- 檔案大小通常為數百 MB，下載可能需要一些時間
- 確保有足夠的磁碟空間（轉換後的 JSON 檔案可能更大）
- 檔案命名可能因資料版本而異，請確認副檔名為 `.grb2`

## 需求

- Node.js (建議 v14 或以上)
- `wgrib2` 工具（用於解析 GRIB2 檔案）

### 安裝 wgrib2

**macOS:**
```bash
brew install wgrib2
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install wgrib2
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install wgrib2
```

**Windows:**
從 [NOAA 官方網站](https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/) 下載並安裝

## 使用方法

### 基本用法

```bash
node index.js <input.grb2>
```

### 執行範例

```bash
# 轉換單一 GRIB2 檔案
# 請先從中央氣象局開放資料平台下載檔案
node index.js M-A0064-084.grb2
```

**重要提醒：**
- 請先從 [中央氣象局開放資料平台](https://opendata.cwa.gov.tw/dataset/mathematics/M-A0064-084) 下載 GRIB2 檔案
- 將下載的檔案放在專案目錄中
- 執行轉換命令時，請使用實際的檔案名稱

執行後會在當前目錄下產生兩個 JSON 檔案：
- `source.json` - 完整的原始解析資料（約數百 MB）
- `wind.json` - maplibre-wind 可用的格式（約數百 MB）

### 執行過程說明

1. **檢查 wgrib2 工具**：程式會自動檢查系統是否安裝 wgrib2
2. **解析網格資訊**：提取網格大小、投影類型、起始位置等資訊
3. **列出所有記錄**：顯示 GRIB2 檔案中包含的所有資料記錄
4. **提取風速分量**：自動尋找並提取 U 和 V 風速分量（優先提取 10 m above ground 的地面風速）
5. **生成 JSON 檔案**：
   - `source.json`：包含完整的解析結果，包括所有 metadata
   - `wind.json`：轉換為前端可用的格式

### 執行輸出範例

```
正在解析 GRIB2 檔案：M-A0064-084.grb2
使用 wgrib2 解析 GRIB2 檔案...
取得網格資訊...
網格資訊： { nx: 1158, ny: 673, projection: 'lambert-conformal', ... }
列出所有記錄...
找到 78 個記錄
無法使用 -json 選項，將使用文字格式提取資料
提取風速分量...
找到 10m 高度的 U 分量記錄：67:154320564:d=2025111400:UGRD:10 m above ground:84 hour fcst:
找到 10m 高度的 V 分量記錄：68:156658754:d=2025111400:VGRD:10 m above ground:84 hour fcst:
找到 U 分量記錄：67，資料點數：779334
找到 V 分量記錄：68，資料點數：779334
✓ 已生成 source.json

✓ 成功提取所有必要欄位：
  - 網格大小：1158 x 673
  - 起始位置：經度 105.25°, 緯度 14.02224°
  - 網格間距：dx=0.027°, dy=0.027°
  - U 分量資料點：779334
  - V 分量資料點：779334

✓ 已生成 wind.json

轉換完成！
```

## 輸出檔案

執行後會產生兩個 JSON 檔案：

### source.json
完整的原始解析資料，包含：
- 網格資訊（nx, ny, dx, dy, lo1, la1）
- 所有記錄列表
- U 和 V 風速分量資料
- 完整的 metadata

### wind.json
轉換為 `@sakitam-gis/maplibre-wind` 套件可用的格式：
```json
{
  "dx": 1.0,
  "dy": 1.0,
  "nx": 361,
  "ny": 181,
  "lo1": 0.0,
  "la1": 90.0,
  "u": [1.2, 2.3, ...],
  "v": [0.5, 1.1, ...]
}
```

#### 參數提取說明

`wind.json` 中的每個參數都是從 GRIB2 檔案中提取並轉換而來：

**網格參數（從 `wgrib2 -grid` 輸出解析）：**

1. **`nx`** - X 方向的網格點數
   - 來源：從 `wgrib2 -grid` 輸出的網格資訊中解析
   - 格式範例：`Lambert Conformal: (1158 x 673)` → `nx = 1158`
   - 對於 lat-lon 網格：從 `lat-lon grid:(361 x 181)` 中提取

2. **`ny`** - Y 方向的網格點數
   - 來源：同上，從網格資訊中解析
   - 格式範例：`Lambert Conformal: (1158 x 673)` → `ny = 673`

3. **`lo1`** - 起始經度（度）
   - 來源：從網格資訊中解析
   - lat-lon 網格：從 `lon 0.000000 to 359.000000` 中提取起始值
   - Lambert Conformal：從 `Lon1 105.250000` 中提取

4. **`la1`** - 起始緯度（度）
   - 來源：從網格資訊中解析
   - lat-lon 網格：從 `lat 90.000000 to -90.000000` 中提取起始值
   - Lambert Conformal：從 `Lat1 14.022240` 中提取

5. **`dx`** - X 方向的網格間距（度）
   - lat-lon 網格：計算公式 `dx = (lo2 - lo1) / (nx - 1)`
   - Lambert Conformal：從 `Dx 3000.000000 m` 中提取並轉換為度（除以 111000，約 1 度 = 111 km）

6. **`dy`** - Y 方向的網格間距（度）
   - lat-lon 網格：計算公式 `dy = |la1 - la2| / (ny - 1)`
   - Lambert Conformal：從 `Dy 3000.000000 m` 中提取並轉換為度

**風速資料（從 GRIB2 檔案中的風速記錄提取）：**

7. **`u`** - U 分量風速陣列（東西向風速）
   
   **物理意義：**
   - `u` 代表風的**東西向分量**（Zonal Wind Component）
   - **正值**：風向東吹（從西往東）
   - **負值**：風向西吹（從東往西）
   - **單位**：m/s（公尺/秒）
   
   **提取方式：**
   - 從 GRIB2 檔案中尋找標記為 `UGRD`（U-component of wind）的資料記錄
   - 程式會優先尋找 `10 m above ground`（地面 10 公尺高度）的風速資料
   - 如果找不到，會自動尋找其他高度的 UGRD 記錄
   
   **資料結構：**
   - 每個數值對應網格上的一個點
   - 資料順序：從左上角開始，先沿 X 方向（經度），再沿 Y 方向（緯度）
   - 總共 `nx × ny` 個數值（例如：1158 × 673 = 779,334 個值）
   
   **範例：**
   ```json
   "u": [-2.28941, -2.10518, -2.0724, ...]
   ```
   - `-2.28941` 表示第一個網格點的風速為向西 2.29 m/s
   - `-2.10518` 表示第二個網格點的風速為向西 2.11 m/s

8. **`v`** - V 分量風速陣列（南北向風速）
   
   **物理意義：**
   - `v` 代表風的**南北向分量**（Meridional Wind Component）
   - **正值**：風向北吹（從南往北）
   - **負值**：風向南吹（從北往南）
   - **單位**：m/s（公尺/秒）
   
   **提取方式：**
   - 從 GRIB2 檔案中尋找標記為 `VGRD`（V-component of wind）的資料記錄
   - 同樣優先尋找 `10 m above ground` 的地面風速
   - 提取流程與 `u` 完全相同
   
   **資料結構：**
   - 與 `u` 陣列對應，每個位置的值代表該網格點的南北向風速
   - 資料順序與 `u` 相同，確保 `u[i]` 和 `v[i]` 對應同一個網格點
   
   **範例：**
   ```json
   "v": [0.38882, 0.36137, 0.56922, ...]
   ```
   - `0.38882` 表示第一個網格點的風速為向北 0.39 m/s
   - `0.36137` 表示第二個網格點的風速為向北 0.36 m/s

**風速合成：**

U 和 V 分量可以組合成實際的風速和風向：

- **風速大小**（Wind Speed）= √(u² + v²)
  - 例如：u = -2.29 m/s, v = 0.39 m/s
  - 風速 = √((-2.29)² + (0.39)²) ≈ 2.32 m/s

- **風向**（Wind Direction）= atan2(u, v)
  - 風向通常以度數表示，0° 為正北，順時針增加

**實際應用：**

在 `@sakitam-gis/maplibre-wind` 套件中：
- `u` 和 `v` 陣列用於繪製風場向量圖
- 每個網格點的 `(u, v)` 值決定了該點的風速箭頭方向和長度
- 箭頭方向：從 `(u, v)` 向量方向決定
- 箭頭長度：與風速大小成正比

**資料驗證：**
- 程式會驗證 `u` 和 `v` 陣列的長度是否等於 `nx × ny`
- 如果長度不匹配，會顯示警告訊息

**提取流程圖：**

```
GRIB2 檔案
    ↓
[wgrib2 -grid] → 解析網格資訊 → nx, ny, lo1, la1, dx, dy
    ↓
[wgrib2 -s] → 列出所有記錄 → 尋找 UGRD/VGRD 記錄編號
    ↓
[wgrib2 -d <record> -text] → 提取資料值 → u[], v[]
    ↓
轉換為 wind.json 格式
```

**技術細節：**

- **網格解析**：支援兩種投影格式
  - **lat-lon 網格**：標準經緯度網格，直接從範圍計算間距
  - **Lambert Conformal**：Lambert 圓錐投影，需要將米轉換為度（近似值）

- **風速資料提取**：
  - 優先提取 `10 m above ground` 的地面風速（最常用於可視化）
  - 如果找不到，會尋找其他高度的 UGRD/VGRD 記錄
  - 資料按網格順序排列：從左上角開始，先 X 方向（經度），後 Y 方向（緯度）

- **資料轉換**：
  - 所有參數從 `source.json` 的 `grid` 和 `windComponents` 欄位提取
  - 如果 `windComponents` 沒有資料，會嘗試從 `records` 陣列中尋找

## 專案結構

```
grb2tojson/
├── package.json          # Node.js 專案配置
├── index.js              # CLI 主程式
├── src/
│   ├── parser.js         # GRIB2 解析邏輯
│   └── converter.js      # 轉換為 wind.json 的邏輯
└── README.md             # 本文件
```

## 疑難排解

### 常見問題

**Q: 執行時出現 "未找到 wgrib2 工具" 錯誤**
- A: 請先安裝 wgrib2，參考上方的「安裝 wgrib2」章節

**Q: 轉換後 wind.json 缺少某些欄位**
- A: 請檢查 `source.json` 中的 `windComponents` 是否包含 U 和 V 資料。如果沒有，可能是 GRIB2 檔案中沒有對應的風速記錄

**Q: 資料點數不正確**
- A: 確認 GRIB2 檔案的網格格式是否為標準格式。目前支援 lat-lon 和 Lambert Conformal 投影

**Q: 如何確認轉換是否成功**
- A: 檢查終端輸出是否顯示「✓ 已生成 source.json」和「✓ 已生成 wind.json」，並確認檔案大小合理（不為 0）

## 注意事項

### 檔案管理

- **GRIB2 檔案**：請從 [中央氣象局開放資料平台](https://opendata.cwa.gov.tw/dataset/mathematics/M-A0064-084) 下載，本專案不包含範例檔案
- **JSON 檔案大小**：轉換後的 `source.json` 和 `wind.json` 通常為數百 MB，請確保有足夠的磁碟空間
- **Git 版本控制**：建議將大型 JSON 檔案加入 `.gitignore`，避免 push 到 GitHub

### 執行環境

- 確保系統已安裝 `wgrib2` 工具
- 大型 GRIB2 檔案轉換可能需要一些時間（數分鐘），請耐心等待
- 轉換過程中會使用臨時檔案，請確保 `/tmp` 目錄有寫入權限

### 資料驗證

- 如果轉換過程中出現警告，請檢查 `source.json` 以了解資料結構
- `wind.json` 必須包含所有必要欄位才能在 maplibre-wind 中正常使用
- 轉換完成後，建議檢查 `wind.json` 中的 `u` 和 `v` 陣列長度是否等於 `nx × ny`

### .gitignore 設定

專案已包含 `.gitignore` 檔案，會自動忽略大型檔案。

**如果第一次 commit 已經包含大型檔案：**

如果您的 Git 倉庫第一次 commit 已經包含了 `.grb2`、`source.json` 或 `wind.json` 檔案，需要先從 Git 索引中移除它們：

```bash
# 從 Git 索引中移除檔案（保留本地檔案）
git rm --cached M-A0064-084.grb2
git rm --cached source.json
git rm --cached wind.json

# 提交變更
git add .gitignore
git commit -m "chore: 移除大型檔案並更新 .gitignore"
```

**注意：** 如果檔案已經 push 到遠端，可能需要清理 Git 歷史。詳細說明請參考 `REMOVE_LARGE_FILES.md`。

