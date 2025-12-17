# GRIB2 轉 JSON 工具

將中央氣象局（CWA）提供的 GRIB2 格式風場資料轉換為 JSON 格式的工具。

**注意：** 目前工具僅測試支援 WRF15km 資料（Lambert Conformal 投影）。

## 功能

- **自動下載 GRIB2 檔案**：從中央氣象局 S3 儲存庫自動下載風場資料（M-A0061 系列，預報小時數 000-084）
- 將 `.grb2` 檔案解析為完整的 JSON 資料（例如：`M-A0061-000.json`）
- 轉換為 maplibre-wind 套件可用的格式（例如：`wind-2025121518-000.json`）

## 資料來源

程式會自動從以下網址下載 GRIB2 檔案：

**中央氣象局開放資料 S3 儲存庫：**

- 基礎 URL：`https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Model/M-A0061-[num].grb2`
- 預報小時數：000, 006, 012, 018, 024, 030, 036, 042, 048, 054, 060, 066, 072, 078, 084（共 15 個檔案）
- 說明：此資料集包含數值天氣預報模式的風場資料
- 格式：GRIB2（.grb2 副檔名）

**注意：**

- 檔案大小通常為數百 MB，下載可能需要一些時間
- 確保有足夠的磁碟空間（轉換後的 JSON 檔案可能更大）
- 下載的檔案會暫存在 `temp` 目錄，處理完成後會自動刪除

## 需求

- **Node.js v18 或以上**（需要內建的 `fetch` API 用於下載檔案）
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

### 基本用法（自動下載與轉換）

程式會自動從網路下載 GRIB2 檔案，並批次處理轉換為 JSON 格式，輸出到 `json` 目錄。

```bash
node index.js
```

### 執行步驟

1. **執行轉換**

   ```bash
   node index.js
   ```

   - 程式會自動下載 15 個 GRIB2 檔案（預報小時數 000-084）
   - 下載完成後自動進行轉換
2. **取得結果**

   - 所有轉換後的 JSON 檔案會自動輸出到 `json` 目錄
   - 每個 GRIB2 檔案會產生兩個 JSON 檔案：
     - `<來源檔名>.json` - 完整的原始解析資料（約數百 MB），檔名與來源 GRIB2 檔案同名（例如：`M-A0061-000.json`）
     - `wind-YYYYMMDDHH-fcst.json` - maplibre-wind 可用的格式（約數百 MB），檔案名稱會自動包含資料日期（含小時）和預報小時數（三位數格式，例如：`wind-2025112418-000.json` 或 `wind-2025112418-084.json`）

**目錄結構：**

```
grb2tojson/
├── temp/              # 臨時下載目錄（自動建立，處理完成後會自動清理）
├── json/              # 輸出 JSON 檔案的目錄（自動建立）
│   ├── M-A0061-000.json
│   ├── wind-2025112418-000.json
│   └── ...
└── index.js
```

### 執行過程說明

1. **下載檔案**：程式會自動從中央氣象局 S3 儲存庫下載 15 個 GRIB2 檔案（預報小時數 000-084）
2. **檢查工具**：檢查 `wgrib2` 工具是否安裝
3. **批次處理**：依序處理每個下載的 GRIB2 檔案：
   - 解析網格資訊：提取網格大小、投影類型、起始位置等資訊
   - 列出所有記錄：顯示 GRIB2 檔案中包含的所有資料記錄
   - 提取風速分量：自動尋找並提取 U 和 V 風速分量（優先提取 10 m above ground 的地面風速）
   - 生成 JSON 檔案：輸出到 `json` 目錄
   - 清理臨時檔案：處理完成後自動刪除臨時下載的檔案

### 執行輸出範例

```
準備下載 15 個 GRIB2 檔案...

  正在下載：M-A0061-000.grb2
  ✓ 下載完成：M-A0061-000.grb2
  正在下載：M-A0061-006.grb2
  ✓ 下載完成：M-A0061-006.grb2
  ...

下載完成！
  成功：15 個檔案

開始處理 15 個 GRIB2 檔案...

正在處理：M-A0061-000.grb2
使用 wgrib2 解析 GRIB2 檔案...
取得網格資訊...
網格資訊： { nx: 1158, ny: 673, projection: 'lambert-conformal', ... }
列出所有記錄...
找到 78 個記錄
提取風速分量...
找到 10m 高度的 U 分量記錄：67:152761896:d=2025112418:UGRD:10 m above ground:anl:
找到 10m 高度的 V 分量記錄：68:155100086:d=2025112418:VGRD:10 m above ground:anl:
找到 U 分量記錄：67，資料點數：779334
找到 V 分量記錄：68，資料點數：779334
  ✓ 已生成 M-A0061-000.json
  ✓ 已生成 wind-2025112418-000.json

正在處理：M-A0061-084.grb2
...
  ✓ 已生成 M-A0061-084.json
  ✓ 已生成 wind-2025112418-084.json

批次處理完成！
  成功：15 個檔案
  輸出目錄：/path/to/grb2tojson/json
```

## 輸出檔案

**重要說明：**

`M-A0061-[num].json` **不代表 GRIB2 檔案的完整內容**。它是從 GRIB2 檔案中**摘要出來的資訊**，預設採用 **10 m above ground**（地面 10 公尺高度）的風速資料。GRIB2 檔案通常包含多個高度層級的資料（例如：100 mb、850 mb、10 m above ground 等），但程式會優先提取地面風速資料，因為這是最常用於可視化的資料。

`wind-[date]-[num].json` 則是進一步**簡化（閹割）的版本**，只保留前端 `@sakitam-gis/maplibre-wind` 套件所需的必要欄位，移除了所有 metadata 和詳細資訊，以減少檔案大小並提高載入速度。

執行後每個 GRIB2 檔案會產生兩個 JSON 檔案：

### M-A0061-[num].json（完整的原始解析資料）

檔名格式：`M-A0061-[num].json`（例如：`M-A0061-000.json`、`M-A0061-084.json`）

包含完整的原始解析資料：

- 網格資訊（nx, ny, dx, dy, lo1, la1）
- 所有記錄列表（`recordsList`）
- U 和 V 風速分量資料（`windComponents`）
  - **預設優先採用**：`10 m above ground`（地面 10 公尺高度）的風速資料
  - **備用方案**：如果 GRIB2 檔案中沒有 `10 m above ground` 的記錄，程式會自動尋找其他高度的 UGRD/VGRD 記錄（例如：`100 mb`、`850 mb` 等）
  - **注意**：`windComponents` 物件中只包含 `u` 和 `v` 陣列，不包含高度資訊。如需確認實際使用的高度，請檢查 `recordsList` 中對應的記錄
- 完整的 metadata

### wind-[date]-[num].json（maplibre-wind 可用格式）

檔名格式：`wind-YYYYMMDDHH-[num].json`（例如：`wind-2025121518-000.json`、`wind-2025121518-084.json`）

轉換為 `@sakitam-gis/maplibre-wind` 套件可用的格式。

**對於 WRF15km 資料（Lambert Conformal 投影，對應 M-A0061-000.json 範例）：**

```json
{
  "projection": {
    "type": "lambert-conformal",
    "lo1": 78.02554,
    "la1": -5.693677,
    "lov": 120.0,
    "latin1": 10.0,
    "latin2": 40.0,
    "dx": 15000.0,
    "dy": 15000.0,
    "date": "2025121518",
    "fcst": 0
  },
  "nx": 661,
  "ny": 385,
  "u": [1.2, 2.3, ...],
  "v": [0.5, 1.1, ...]
}
```

**對於 lat-lon 網格（向後兼容）：**

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

`wind-[date]-[num].json` 中的每個參數都是從 `M-A0061-[num].json` 的 `grid` 物件中直接取得：

**網格參數（從 `M-A0061-[num].json` 的 `grid` 物件取得）：**

* **`nx`** - X 方向的網格點數
  - 來源：`sourceData.grid.nx`
  - 範例：`661`

* **`ny`** - Y 方向的網格點數
  - 來源：`sourceData.grid.ny`
  - 範例：`385`

* **`lo1`** - 起始經度（度）
  - 來源：`sourceData.grid.lo1`
  - 範例：`78.02554`
  - **說明**：起始點位於網格的**左下角**（最西南角）。`lo1, la1` 對應到網格座標 (0, 0)。陣列資料從左下角開始，先沿 X 方向（由左往右）排列，再沿 Y 方向（由下往上）排列

* **`la1`** - 起始緯度（度）
  - 來源：`sourceData.grid.la1`
  - 範例：`-5.693677`
  - **說明**：起始點位於網格的**左下角**（最西南角）。`lo1, la1` 對應到網格座標 (0, 0)。陣列資料從左下角開始，先沿 X 方向（由左往右）排列，再沿 Y 方向（由下往上）排列

* **`dx`** - X 方向的網格間距
  - 來源：`sourceData.grid.dx`
  - lat-lon 網格：單位為度
  - Lambert Conformal：單位為米（例如：`15000.0`）

* **`dy`** - Y 方向的網格間距
  - 來源：`sourceData.grid.dy`
  - lat-lon 網格：單位為度
  - Lambert Conformal：單位為米（例如：`15000.0`）

**Lambert Conformal 投影參數（適用於 WRF15km 等 Lambert Conformal 投影資料）：**

7. **`projection.type`** - 投影類型
   - 固定為 `"lambert-conformal"`

8. **`projection.lov`** - 中央子午線（度）
   - 來源：`sourceData.grid.lov`
   - 範例：`120.0`

9. **`projection.latin1`** - 第一標準緯線（度）
   - 來源：`sourceData.grid.latin1`
   - 範例：`10.0`

10. **`projection.latin2`** - 第二標準緯線（度）
    - 來源：`sourceData.grid.latin2`
    - 範例：`40.0`

11. **`projection.dx`** - X 方向的網格間距（米）
    - 來源：`sourceData.grid.dx`
    - 範例：`15000.0`（保留原始單位，不轉換為度）

12. **`projection.dy`** - Y 方向的網格間距（米）
    - 來源：`sourceData.grid.dy`
    - 範例：`15000.0`（保留原始單位，不轉換為度）

13. **`projection.date`** - 資料日期（YYYYMMDDHH 格式）
    - 來源：`sourceData.dataDate`
    - 範例：`"2025121518"`（表示 2025 年 12 月 15 日 18 點）

14. **`projection.fcst`** - 預報小時數（整數）
    - 來源：`sourceData.forecastHour`（如果不存在則預設為 `0`）
    - 說明：表示該筆資料是基準時間後第幾小時的預報風向
    - 預設值：如果沒有找到預報小時數（例如：`anl:` 表示分析資料），則設為 `0`
    - 範例：`84` 表示這是基準時間後 84 小時的預報資料，`0` 表示這是分析資料（非預報）

**風速資料（從 GRIB2 檔案中的風速記錄提取）：**

15. **`u`** - U 分量風速陣列（東西向風速）

**物理意義：**

- `u` 代表風的**東西向分量**（Zonal Wind Component）
- **正值**：風向東吹（從西往東）
- **負值**：風向西吹（從東往西）
- **單位**：m/s（公尺/秒）

**提取方式：**

程式使用以下步驟提取 10 m above ground 的風速資料：

1. **列出所有記錄**：使用 `wgrib2 -s` 命令列出 GRIB2 檔案中的所有資料記錄

   - 輸出格式範例：`67:49891492:d=2025121518:UGRD:10 m above ground:anl:`
   - 記錄格式：`[記錄編號]:[資料大小]:[日期]:[參數名稱]:[高度層級]:[預報類型]:`
2. **識別目標記錄**：從記錄列表中搜尋包含以下關鍵字的記錄：

   - `:UGRD:10 m above ground` 或 `:UGRD:10m above ground`
   - 這表示該記錄是地面 10 公尺高度的 U 分量風速
3. **提取記錄編號**：從記錄字串中提取記錄編號（例如：`67`）

   - 範例記錄：`67:49891492:d=2025121518:UGRD:10 m above ground:anl:`
   - 記錄編號：`67`
4. **提取數值資料**：使用 `wgrib2 -d 67 -csv -` 命令提取該記錄的實際數值

   - 輸出格式：CSV（經度,緯度,數值）
   - 只提取數值部分，組成 `u` 陣列
5. **備用方案**：如果找不到 `10 m above ground` 的記錄，程式會自動尋找其他高度的 UGRD 記錄（例如：`100 mb`、`850 mb` 等）

**資料結構：**

- 每個數值對應網格上的一個點
- 資料順序：從左下角開始，先沿 X 方向（經度，由左往右），再沿 Y 方向（緯度，由下往上）
- 總共 `nx × ny` 個數值（例如：1158 × 673 = 779,334 個值）

**範例：**

```json
"u": [-2.28941, -2.10518, -2.0724, ...]
```

- `-2.28941` 表示第一個網格點的風速為向西 2.29 m/s
- `-2.10518` 表示第二個網格點的風速為向西 2.11 m/s

16. **`v`** - V 分量風速陣列（南北向風速）

**物理意義：**

- `v` 代表風的**南北向分量**（Meridional Wind Component）
- **正值**：風向北吹（從南往北）
- **負值**：風向南吹（從北往南）
- **單位**：m/s（公尺/秒）

**提取方式：**

提取流程與 `u` 完全相同，但搜尋的是 `VGRD`（V-component of wind）記錄：

1. **列出所有記錄**：使用 `wgrib2 -s` 命令列出所有記錄
2. **識別目標記錄**：搜尋包含 `:VGRD:10 m above ground` 的記錄

   - 範例記錄：`68:50655135:d=2025121518:VGRD:10 m above ground:anl:`
   - 記錄編號：`68`
3. **提取數值資料**：使用 `wgrib2 -d 68 -csv -` 提取 V 分量數值
4. **備用方案**：如果找不到 `10 m above ground`，會自動尋找其他高度的 VGRD 記錄

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
GRIB2 檔案（例如：M-A0061-000.grb2）
    ↓
[wgrib2 -grid] → 解析網格資訊 → M-A0061-000.json 的 grid 物件
    ↓
[wgrib2 -s] → 列出所有記錄 → 尋找 UGRD/VGRD 記錄編號
    ↓
[wgrib2 -d <record> -csv] → 提取資料值 → M-A0061-000.json 的 windComponents
    ↓
從 M-A0061-000.json 的 grid 和 windComponents 提取 → wind-2025121518-000.json 格式
```

**技術細節：**

- **網格解析**：支援兩種投影格式

  - **lat-lon 網格**：標準經緯度網格，直接從範圍計算間距（單位：度）
  - **Lambert Conformal**：Lambert 圓錐投影（WRF15km 使用）
    - 保留網格間距為米（`dx`、`dy` 以米為單位）
    - 提取完整的投影參數：`lov`（中央子午線）、`latin1`、`latin2`（標準緯線）
    - 前端可使用 proj4js 等投影庫進行精確的座標轉換
  - 所有網格參數已解析並儲存在 `M-A0061-[num].json` 的 `grid` 物件中，轉換時直接從該物件取得
- **風速資料提取**：

  - **步驟 1**：使用 `wgrib2 -s` 列出所有記錄，輸出格式為：
    ```
    67:49891492:d=2025121518:UGRD:10 m above ground:anl:
    68:50655135:d=2025121518:VGRD:10 m above ground:anl:
    ```
  - **步驟 2**：從記錄字串中搜尋包含 `:UGRD:10 m above ground` 或 `:VGRD:10 m above ground` 的記錄
  - **步驟 3**：提取記錄編號（例如：`67` 和 `68`）
  - **步驟 4**：使用 `wgrib2 -d 67 -csv -` 和 `wgrib2 -d 68 -csv -` 提取實際數值資料
  - **優先順序**：優先提取 `10 m above ground` 的地面風速（最常用於可視化）
  - **備用方案**：如果找不到 `10 m above ground`，會自動尋找其他高度的 UGRD/VGRD 記錄（例如：`100 mb`、`850 mb` 等）
  - **資料順序**：資料按網格順序排列，從左下角開始，先 X 方向（經度，由左往右），後 Y 方向（緯度，由下往上）
  - **儲存位置**：風速資料儲存在 `M-A0061-[num].json` 的 `windComponents` 物件中（`windComponents.u` 和 `windComponents.v`）
  - **高度選擇邏輯**：
    - **優先採用**：程式會優先尋找並提取 `10 m above ground`（地面 10 公尺高度）的風速資料
    - **備用方案**：如果 GRIB2 檔案中沒有 `10 m above ground` 的記錄，程式會自動尋找其他高度的 UGRD/VGRD 記錄
    - **注意**：`windComponents` 物件中不包含高度資訊，如需確認實際使用的高度層級，請檢查執行時的 console 輸出或 `recordsList` 中對應的記錄
- **資料轉換**：

  - 所有網格參數直接從 `M-A0061-[num].json` 的 `grid` 物件取得（無需從 `gridInfo` 字串解析）
  - 風速資料從 `M-A0061-[num].json` 的 `windComponents` 欄位提取
  - 如果 `windComponents` 沒有資料，會嘗試從 `records` 陣列中尋找

## 專案結構

```
grb2tojson/
├── package.json          # Node.js 專案配置
├── index.js              # CLI 主程式（包含自動下載功能）
├── src/
│   ├── parser.js         # GRIB2 解析邏輯
│   └── converter.js      # 轉換為 wind-[date]-[num].json 的邏輯
├── temp/                 # 臨時下載目錄（自動建立，處理完成後會自動清理）
├── json/                 # 輸出 JSON 檔案的目錄（自動建立）
└── README.md             # 本文件
```

## 疑難排解

### 常見問題

**Q: 執行時出現 "未找到 wgrib2 工具" 錯誤**

- A: 請先安裝 wgrib2，參考上方的「安裝 wgrib2」章節

**Q: 執行時出現 "fetch is not defined" 或類似錯誤**

- A: 請確認您的 Node.js 版本為 v18 或以上。可以使用 `node --version` 檢查版本，如果版本過舊，請升級 Node.js

**Q: 下載失敗或網路錯誤**

- A: 請檢查網路連線，並確認可以存取 `https://cwaopendata.s3.ap-northeast-1.amazonaws.com`。如果某些檔案下載失敗，程式會繼續處理其他成功下載的檔案

**Q: 轉換後 wind-[date]-[num].json 缺少某些欄位**

- A: 請檢查 `M-A0061-[num].json` 中的 `windComponents` 是否包含 U 和 V 資料。如果沒有，可能是 GRIB2 檔案中沒有對應的風速記錄

**Q: 資料點數不正確**

- A: 確認 GRIB2 檔案的網格格式是否為標準格式。目前支援 lat-lon 和 Lambert Conformal 投影

**Q: 如何確認轉換是否成功**

- A: 檢查終端輸出是否顯示「✓ 下載完成」和「✓ 已生成」訊息，並確認 `json` 目錄中的檔案大小合理（不為 0）

## 注意事項

### 檔案管理

- **GRIB2 檔案**：程式會自動從網路下載，無需手動準備。下載的檔案會暫存在 `temp` 目錄，處理完成後會自動刪除
- **JSON 檔案大小**：轉換後的 `M-A0061-[num].json` 和 `wind-[date]-[num].json` 通常為數百 MB，請確保有足夠的磁碟空間
- **Git 版本控制**：建議將大型 JSON 檔案和 `temp` 目錄加入 `.gitignore`，避免 push 到 GitHub

### 執行環境

- 確保系統已安裝 `wgrib2` 工具
- 確保 Node.js 版本為 v18 或以上（需要 `fetch` API）
- 確保網路連線正常，可以存取中央氣象局 S3 儲存庫
- 大型 GRIB2 檔案下載和轉換可能需要一些時間（數十分鐘），請耐心等待
- 轉換過程中會使用臨時檔案，請確保 `temp` 目錄有寫入權限

### 資料驗證

- 如果轉換過程中出現警告，請檢查 `M-A0061-[num].json` 以了解資料結構
- `wind-[date]-[num].json` 必須包含所有必要欄位才能在 maplibre-wind 中正常使用
- 轉換完成後，建議檢查 `wind-[date]-[num].json` 中的 `u` 和 `v` 陣列長度是否等於 `nx × ny`
