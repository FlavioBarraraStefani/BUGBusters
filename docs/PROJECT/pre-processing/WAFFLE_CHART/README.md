# Waffle Chart - README

## Description
This Python script processes data from the Global Terrorism Database (GTD) to generate aggregated data on the relationship between attack types and weapon types used. It identifies the 5 most frequent attack types in the dataset and, for each attack type, extracts the 4 most used weapon types, aggregating the rest into an "Others" category. The data is exported in JSON format.

## Main Functionality
The script processes the GTD dataset to:
1. Load GTD data with columns for attack type and weapon type
2. Remove records with null values in both columns
3. Remove records with "Unknown" value in weapon type or attack type
4. Identify the 5 most frequent attack types in the dataset
5. For each main attack type:
   - Extract the 4 most frequent weapon types
   - Aggregate all other weapon types into an "Others" category
   - Count the total number of events for the attack type
6. Export data as a JSON array of objects

## Attack Types Analyzed
The script automatically selects the 5 most frequent attack types from the dataset. Typical examples include:
1. **Bombing/Explosion** - Explosive attacks
2. **Armed Assault** - Armed assaults
3. **Assassination** - Assassinations
4. **Hostage Taking (Kidnapping)** - Kidnappings and ransom hostage takings
5. **Facility/Infrastructure Attack** - Infrastructure attacks

The exact number and specific names depend on the data in the CSV.

## Input
- **File:** `terrorism_dataset.csv`
- **Columns Used:**
  - `attacktype1_txt` (primary attack type)
  - `weaptype1_txt` (weapon type used)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `waffle_data.json`
- **Format:** JSON array of objects, one per attack type

### Output JSON Structure
```json
[
  {
    "category": "Bombing/Explosion",
    "total_events": 5432,
    "data": [
      {
        "label": "Explosives",
        "value": 3200
      },
      {
        "label": "Unknown",
        "value": 1500
      },
      {
        "label": "Firearms",
        "value": 480
      },
      {
        "label": "Incendiary",
        "value": 252
      },
      {
        "label": "Others",
        "value": 0
      }
    ]
  },
  {
    "category": "Armed Assault",
    "total_events": 4125,
    "data": [
      {
        "label": "Firearms",
        "value": 2800
      },
      {
        "label": "Knives/Cutting Instruments",
        "value": 750
      },
      {
        "label": "Blunt Instruments",
        "value": 380
      },
      {
        "label": "Explosives",
        "value": 195
      },
      {
        "label": "Others",
        "value": 0
      }
    ]
  },
  ...
]
```

