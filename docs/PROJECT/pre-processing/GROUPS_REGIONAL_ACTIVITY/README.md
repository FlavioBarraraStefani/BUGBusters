# Groups Regional Activity - README

## Description
This Python script analyzes the regional activity of the three main terrorist groups (ISIL, Taliban, Shining Path) from the Global Terrorism Database (GTD). For each group, it identifies the geographic region with the highest number of attacks and provides a detailed list of countries within that region, sorted by attack frequency.

## Main Functionality
The script processes the GTD dataset to:
1. Filter attacks by the three main terrorist groups
2. Identify the geographic region with the highest activity for each group
3. Count attacks for each country within the main region
4. Normalize country names (e.g., "Syria" → "Syrian Arab Republic")
5. Export data in JSON format for D3.js visualization 

## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:** 
  - `gname` (terrorist group name)
  - `region_txt` (geographic region)
  - `country_txt` (country name)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `groups_regional_activity.json` (in project folder)
- **Format:** JSON structured with data aggregated by region and country

### Output JSON Structure
```json
{
  "ISIL": {
    "region": "Middle East & North Africa",
    "data": [
      {
        "country": "Iraq",
        "count": 1250
      },
      {
        "country": "Syrian Arab Republic",
        "count": 980
      },
      ...
    ]
  },
  "taliban": {
    "region": "South Asia",
    "data": [
      {
        "country": "Afghanistan",
        "count": 1840
      },
      ...
    ]
  },
  "SL": {
    "region": "South America",
    "data": [
      {
        "country": "Peru",
        "count": 520
      },
      ...
    ]
  }
}
```

