# Globe Attacks Count - Attacks by Country with Frequency

## Description

This Python script processes Global Terrorism Database (GTD) data to generate an interactive map showing the most frequent attack type for each country in each year, along with attack counts. Data is aggregated, normalized, and sorted to enable temporal visualization of global terrorism evolution.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` with ISO-8859-1 encoding
2. **Attack Type Normalization**: Maps GTD attack types to standardized categories
3. **First Appearance Tracking**: Records the order of first appearance for each country per year
4. **Aggregation**: Groups attacks by year, country, and normalized type
5. **Top Selection**: Identifies the most frequent attack type for each (year, country) pair
6. **Data Enrichment**: Adds counts and appearance order
7. **Sorting**: Orders results by year and then by first appearance order
8. **Export**: Saves result in JSON with hierarchical structure

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `country_txt`: Name of country where attack occurred
  - `attacktype1_txt`: Primary attack type

## Output

- **File**: `globe_attacks_counts1.json`
- **Format**: JSON with hierarchical structure:
  ```json
  {
    "1970": {
      "Afghanistan": {
        "type": "explosion",
        "count": 5
      },
      "Algeria": {
        "type": "armed_assault",
        "count": 3
      }
    },
    "1971": {
      ...
    }
  }
  ```
- **Content**: For each year and country, the most frequent attack type and total count of that attack type

## Usage in BugBusters Project

This script is used for:
- **Count-based Visualization**: Creates an interactive map showing both attack type and frequency

## Attack Type Mapping

Normalization converts GTD types to standardized categories:

| GTD Type | Normalized Category |
|----------|----------------------|
| Bombing/Explosion | explosion |
| Armed Assault | armed_assault |
| Assassination | assassination |
| Hostage Taking (Kidnapping) | hostage_taking |
| Hostage Taking (Barricade Incident) | hostage_taking |
| Facility/Infrastructure Attack | infrastructure_attack |
| Hijacking | others |
| Unknown | others |
| Unarmed Assault | others |
| (Unmapped) | others |







