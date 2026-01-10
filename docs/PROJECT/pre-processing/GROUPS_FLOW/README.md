# Groups Flows - Terrorist Groups Attack-Target Relationships Visualization

## Description

This Python script processes Global Terrorism Database (GTD) data to generate a Sankey visualization showing flows between attack types and targets for three terrorist organizations (ISIL, Taliban, Shining Path). For each organization, it extracts the top-5 attack types and top-5 targets, then visualizes how these connect through attack flows, allowing you to see which attack type hits which target with what frequency.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Column Selection**: Extracts only gname (group), attacktype1_txt (attack type) and targtype1_txt (target type)
3. **Group Filtering**: Processes the 3 target organizations (ISIL, Taliban, SL)
4. **Top-5 Attacks Identification**: Finds the 5 most frequent attack types for each group
5. **Top-5 Targets Identification**: Finds the 5 most targeted types for each group
6. **Data Filtering**: Keeps only attacks combining top-5 attack types AND top-5 targets
7. **Flow Aggregation**: Groups by (attacktype, targtype) and counts occurrences
8. **Attack Node Creation**: Creates nodes for each attack type with type="attack"
9. **Target Node Creation**: Creates nodes for each target with type="target"
10. **Index Mapping**: Associates each node with a numeric index
13. **Export**: Saves the result in JSON 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `gname`: Name of terrorist group
  - `attacktype1_txt`: Primary attack type
  - `targtype1_txt`: Primary target type

## Output

- **File**: `groups_flows.json`
- **Format**: JSON with Sankey structure for each organization:
  ```json
  {
    "ISIL": {
      "nodes": [
        {
          "name": "Bombing/Explosion",
          "type": "attack"
        },
        {
          "name": "Armed Assault",
          "type": "attack"
        },
        {
          "name": "Military",
          "type": "target"
        },
        {
          "name": "Government (General)",
          "type": "target"
        }
      ],
      "links": [
        {
          "source": 0,
          "target": 2,
          "value": 456
        },
        {
          "source": 0,
          "target": 3,
          "value": 234
        },
        {
          "source": 1,
          "target": 2,
          "value": 189
        }
      ]
    },
    "taliban": {...},
    "SL": {...}
  }
  ```
- **Content**: For each organization, list of nodes (attacks and targets) and links (flows) showing connections

## Monitored Groups

The script analyzes 3 terrorist organizations:

| Short Name | Full GTD Name |
|-----------|------------------|
| ISIL | Islamic State of Iraq and the Levant (ISIL) |
| taliban | Taliban |
| SL | Shining Path (SL) |

## Usage in BugBusters Project

This script is used for:
- **Sankey diagram**: Visualize flows between attack types and targets

