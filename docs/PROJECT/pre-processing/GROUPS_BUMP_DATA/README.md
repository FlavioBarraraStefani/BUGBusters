# Groups Bump Data - Terrorist Groups Target Evolution Visualization

## Description

This Python script processes Global Terrorism Database (GTD) data to generate a "bump chart" that visualizes the evolution of preferred targets of three terrorist organizations (ISIL, Taliban, Shining Path) over time. For each group, it extracts the 5 most targeted types, aggregates them in 3-year intervals, and calculates normalized percentages to show how target importance changes over time.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Column Selection**: Extracts only year (iyear), group name (gname) and target type
3. **Group Filtering**: Processes the 3 target organizations (ISIL, Taliban, SL)
4. **Top-5 Target Identification**: Finds the 5 most targeted types for each group
5. **Data Filtering**: Keeps only attacks against top-5 targets
6. **Temporal Binning**: Groups data in 3-year intervals (0-2, 3-5, 6-8...)(bin)
7. **Bin Aggregation**: Groups by (bin_start, targtype) and counts attacks
8. **Normalization**: Calculates percentages 
9. **Dynamic Ordering**: Orders targets by percentage descending in each bin
10. **Structuring**: Organizes data in timeline with label, values and order
11. **Export**: Saves the result in JSON 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `gname`: Name of terrorist group
  - `targtype1_txt`: Primary target type

## Output

- **File**: `groups_bump_data.json`
- **Format**: JSON with structure for bump chart:
  ```json
  {
    "ISIL": {
      "config": {
        "ribbonPadding": 2
      },
      "timeline": [
        {
          "label": "2014-2016",
          "values": {
            "Military": 35.42,
            "Government (General)": 28.50,
            "Business": 18.75,
            "Private Citizens & Property": 12.33,
            "Transportation": 5.00
          },
          "order": [
            "Military",
            "Government (General)",
            "Business",
            "Private Citizens & Property",
            "Transportation"
          ]
        },
        {
          "label": "2017-2019",
          "values": {
            "Military": 32.10,
            "Government (General)": 31.25,
            "Business": 20.50,
            "Private Citizens & Property": 14.00,
            "Transportation": 2.15
          },
          "order": [
            "Government (General)",
            "Military",
            "Business",
            "Private Citizens & Property",
            "Transportation"
          ]
        }
      ],
      "top_targets": [
        "Military",
        "Government (General)",
        "Business",
        "Private Citizens & Property",
        "Transportation"
      ]
    },
    "taliban": {...},
    "SL": {...}
  }
  ```
- **Content**: For each organization, timeline data with normalized percentages and dynamic target ordering

## Monitored Groups

The script analyzes 3 terrorist organizations:

| Short Name | Full GTD Name |
|-----------|------------------|
| ISIL | Islamic State of Iraq and the Levant (ISIL) |
| taliban | Taliban |
| SL | Shining Path (SL) |

