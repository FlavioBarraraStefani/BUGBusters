# Target BarChart - README

## Description
This Python script processes Global Terrorism Database (GTD) data to generate a matrix of attack counts aggregated by continent, region, and target category. It normalizes target types into 5 standard categories (military_police, government, business, citizens, transportations) and organizes them geographically by continent and region. Data is exported in JSON format for visualization in hierarchical bar chart format in D3.js. 

## Main Functionality
The script processes the GTD dataset to:
1. Load GTD data with region and target type columns
2. Normalize GTD target types into 5 standardized categories
3. Map regions into 5 continents/macro-areas
4. Count attacks per combination (continent, region, category)
5. Export data in JSON format 

## Normalized Target Categories
The script normalizes GTD target types into 5 main categories:

### Mapping Target Types → Categories
```
Military            → military_police
Police              → military_police
Government (General)          → government
Government (Diplomatic)       → government
Business            → business
Private Citizens & Property   → citizens
Transportation      → transportations
(All others)        → Unknown
```

**5 Standardized Categories:**
1. **military_police** - Attacks against military and police forces
2. **government** - Attacks against government institutions and officials
3. **business** - Attacks against businesses and commercial property
4. **citizens** - Attacks against civilians and private property
5. **transportations** - Attacks against transportation infrastructure


## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:**
  - `region_txt` (geographic region)
  - `targtype1_txt` (main target type)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `target_barchart.json`
- **Format:** JSON array of objects with hierarchical structure

### Struttura JSON Output
```json
[
  {
    "continent": "Americas",
    "region_txt": "North America",
    "category": "military_police",
    "count": 1250
  },
  {
    "continent": "Americas",
    "region_txt": "North America",
    "category": "government",
    "count": 890
  },
  {
    "continent": "Americas",
    "region_txt": "Central America & Caribbean",
    "category": "business",
    "count": 567
  },
  {
    "continent": "Asia",
    "region_txt": "South Asia",
    "category": "military_police",
    "count": 2340
  },
  ...
]
```


