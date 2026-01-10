# Groups Temporal Cumulative - README

## Description
This Python script processes cumulative temporal data from the Global Terrorism Database (GTD) related to three main terrorist groups (ISIL, Taliban, Shining Path). For each group, it calculates the cumulative number of attacks year by year, allowing visualization of historical evolution and growth of terrorist activity over time.

## Main Functionality
The script processes the GTD dataset to:
1. Filter attacks by the three main terrorist groups
2. Count the number of attacks per year (iyear)
3. Sort data chronologically
4. Calculate cumulative sum of attacks over time
5. Export data in JSON format for D3.js visualization 

## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:**
  - `gname` (terrorist group name)
  - `iyear` (attack year)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `groups_temporal_cumulative.json` 
- **Format:** JSON structured with cumulative data per year

### Struttura JSON Output

{
  "ISIL": [
    {"year": 2013, "value": 150},
    {"year": 2014, "value": 400},
    {"year": 2015, "value": 850},
    {"year": 2016, "value": 1200},
    ...
  ],
  "taliban": [
    {"year": 1995, "value": 10},
    {"year": 1996, "value": 35},
    {"year": 1997, "value": 72},
    ...
  ],
  "SL": [
    {"year": 1980, "value": 5},
    {"year": 1981, "value": 18},
    {"year": 1982, "value": 45},
    ...
  ]
}


## Gruppi Terroristici Monitorati
1. **ISIL** (Islamic State of Iraq and the Levant)
2. **Taliban**
3. **SL** (Shining Path - Sendero Luminoso)

