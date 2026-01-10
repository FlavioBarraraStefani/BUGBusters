# Groups - Terrorist Organizations Activity Analysis

## Description

This Python script processes Global Terrorism Database (GTD) data to analyze the activity of specific terrorist organizations. It extracts detailed statistics on three main organizations (ISIL, Shining Path, Taliban), including the number of attacks per year, country, and activity percentages, creating a visualization of the temporal evolution of these groups.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Year Conversion**: Converts the year field (iyear) to numeric format
3. **Group Filtering**: Keeps only attacks from the 3 target organizations
4. **Aggregation**: Groups attacks by (gname, year, country)
5. **Counting**: Counts the number of attacks for each combination
6. **Total Statistics**: Calculates the total attacks for each organization
7. **Percentage Calculation**: Calculates the percentage of attacks per year relative to total
8. **Data Structuring**: Organizes data by group → year → countries
9. **Hierarchical Structure**: Includes annual totals, percentages, and country details
10. **Export**: Saves the result in JSON 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `gname`: Name of terrorist group
  - `country_txt`: Country where attack occurred

## Output

- **File**: `JSON/gtd_groups.json`
- **Format**: JSON with hierarchical structure by group → year:
  ```json
  {
    "ISIL": {
      "2014": {
        "total_count": 432,
        "total_percentage": 0.245,
        "countries": [
          {
            "country": "Iraq",
            "count": 215
          },
          {
            "country": "Syria",
            "count": 89
          }
        ]
      },
      "2015": {
        ...
      }
    },
    "SL": {...},
    "taliban": {...}
  }
  ```
- **Content**: For each organization and year, total attack count, percentage relative to organization total, and breakdown by country

## Monitored Groups

The script analyzes 3 main terrorist organizations:

| Full Name | Short Name | Code |
|-----------|-----------|--------|
| Islamic State of Iraq and the Levant (ISIL) | ISIL | isil |
| Shining Path (SL) | SL | sl |
| Taliban | taliban | taliban |

