# Globe Attacks - Global Terrorism by Country

## Description

This Python script processes Global Terrorism Database (GTD) data to generate an interactive map of the most frequent attack type for each country in each year. Data is aggregated and normalized to create a structured JSON representing the global terrorism attack trends.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` with ISO-8859-1 encoding
2. **Column Selection**: Extracts year, country_txt, and attacktype1_txt
3. **Aggregation**: Groups attacks by year, country, and attack type
4. **Ranking**: Identifies the most frequent attack type for each year-country pair
5. **Normalization**: Standardizes attack type names
7. **Export**: Saves the result in JSON format for D3.js visualization

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:

  - `iyear`: Year of attack
  - `country_txt`: Name of country where attack occurred
  - `attacktype1_txt`: Primary attack type

## Output

- **File**: `global_attacks.json`
- **Format**: JSON with hierarchical structure:
  ```json
  {
    "1970": {
      "Afghanistan": "explosion",
      "Algeria": "armed_assault",
      ...
    },
    "1971": {
      ...
    }
  }
  ```
- **Content**: For each year and country, the most frequent attack type

## Usage in BugBusters Project

This script is used for:
- **Geographic Visualization**: Creates an interactive map showing the predominant attack type by country and year
- **Global Analysis**: Allows visualization of attack temporal evolution at global level
- **Trend Identification**: Highlights which attack types dominate in specific regions and time periods
- **Choropleth Map**: Data feeds a D3.js map with different colors for each attack type

## Function `clean_attack_type(text)`

Normalizes attack types according to the following rules:

**Examples**:

- "Bombing/Explosion" → "explosion"
- "Armed Assault" → "armed_assault"
- "Hostage Taking (Kidnapping)" → "hostage_taking_(kidnapping)"



