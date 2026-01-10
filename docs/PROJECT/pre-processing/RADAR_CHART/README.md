# Radar Chart - README

## Description
This Python script processes Global Terrorism Database (GTD) data to generate multidimensional metrics related to the five main types of terrorist attacks. For each attack type, it calculates four key metrics (success rate, average number of deaths, average number of wounded, average economic damage) and normalizes them using global maximum values, creating the necessary data for radar chart visualization 

## Main Functionality
The script processes the GTD dataset to:
1. Filter attacks of the five main selected attack types
2. Clean and prepare data (removal of null values)
3. Calculate aggregated metrics per attack type:
   - Success rate (percentage of successful attacks)
   - Average number of casualties (killed)
   - Average number of wounded
   - Average economic damage (property damage)
4. Identify global maximum values for normalization
5. Calculate global averages for baseline comparison
6. Export data in JSON format for D3.js 

## Analyzed Attack Types
The script focuses on five main attack types:
1. **Bombing/Explosion** - Bombing and explosive attacks
2. **Armed Assault** - Armed assaults
3. **Assassination** - Targeted assassinations
4. **Hostage Taking (Kidnapping)** - Kidnappings and hostage situations
5. **Facility/Infrastructure Attack** - Infrastructure attacks

## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:**
  - `attacktype1_txt` (main attack type)
  - `success` (1=successful, 0=failed)
  - `nkill` (number of people killed)
  - `nwound` (number of people wounded)
  - `property` (flag property targeted)
  - `propvalue` (economic value of damage)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `radar_chart.json`
- **Format:** JSON structured with metadata and aggregated data

### Output JSON Structure
```json
{
  "meta": {
    "description": "Data for D3.js Radar Chart",
    "features": [
      {"key": "success", "label": "Success Rate"},
      {"key": "nkill", "label": "Avg Kills"},
      {"key": "nwound", "label": "Avg Wounded"},
      {"key": "propvalue", "label": "Avg Damage ($)"}
    ],
    "global_max_values": {
      "success_rate": 0.95,
      "avg_kills": 12.5,
      "avg_wounded": 23.8,
      "avg_damage": 5000000
    },
    "global_average": {
      "success_rate": 0.42,
      "avg_kills": 1.2,
      "avg_wounded": 2.1,
      "avg_damage": 250000
    }
  },
  "data": [
    {
      "attack_type": "Bombing/Explosion",
      "metrics": {
        "success_rate": 0.89,
        "avg_kills": 8.3,
        "avg_wounded": 15.2,
        "avg_damage": 2500000
      }
    },
    {
      "attack_type": "Armed Assault",
      "metrics": {
        "success_rate": 0.72,
        "avg_kills": 5.1,
        "avg_wounded": 10.5,
        "avg_damage": 1200000
      }
    },
    ...
  ]
}
```


