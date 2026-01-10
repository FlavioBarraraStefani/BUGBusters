# Rose Chart - README

## Description
This Python script processes Global Terrorism Database (GTD) data to generate time series of attack metrics aggregated by year. For each of the five main terrorist attack types, it calculates year by year the success rate, average number of deaths, average number of wounded, average economic damage, and total count of attacks. Data is structured for visualization in "rose chart" (petal diagram) format in D3.js, where petals represent years and length represents metrics.

## Main Functionality
The script processes the GTD dataset to:
1. Filter attacks by the five main selected attack types
2. Clean and prepare data (removal of null values)
3. Limit analysis to a specific temporal range (1970-2020)
4. Aggregate metrics by attack type and year:
   - Average success rate per year
   - Average number of deaths per year
   - Average number of wounded per year
   - Average economic damage per year
   - Total count of attacks per year
5. Complete data for all years
6. Export data in JSON format 

## Analyzed Attack Types
The script focuses on five main attack types:
1. **Bombing/Explosion** → `explosion` (Bombing attacks)
2. **Armed Assault** → `armed_assault` (Armed assaults)
3. **Assassination** → `assassination` (Targeted assassinations)
4. **Hostage Taking (Kidnapping)** → `hostage_taking` (Kidnappings and hostage takings)
5. **Facility/Infrastructure Attack** → `infrastructure_attack` (Infrastructure attacks)

## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:**
  - `iyear` (attack year)
  - `attacktype1_txt` (main attack type)
  - `success` (1=successful, 0=failed)
  - `nkill` (number of people killed)
  - `nwound` (number of people wounded)
  - `property` (property damaged flag)
  - `propvalue` (economic damage value)
- **Temporal range:** 1970-2020

## Output
- **File:** `rose_chart_data.json`
- **Format:** Structured JSON

### Struttura JSON Output
```json
{
  "explosion": [
    {
      "year": "1970",
      "success_rate": 0.0,
      "avg_kills": 0.0,
      "avg_wounded": 0.0,
      "avg_damage": 0.0,
      "count": 0
    },
    {
      "year": "1971",
      "success_rate": 0.75,
      "avg_kills": 2.3,
      "avg_wounded": 5.1,
      "avg_damage": 125000.0,
      "count": 8
    },
    ...
  ],
  "armed_assault": [
    {
      "year": "1970",
      "success_rate": 0.85,
      "avg_kills": 1.5,
      "avg_wounded": 3.2,
      "avg_damage": 50000.0,
      "count": 12
    },
    ...
  ],
  ...
}
```
