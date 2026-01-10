# Globe Targets - Terrorist Attack Targets by Category

## Description

This Python script processes Global Terrorism Database (GTD) data to generate an interactive map visualizing terrorist attack targets divided by category (military, governmental, commercial, etc.). For each category, it extracts the 50 deadliest attacks with victim counts (killed + wounded) and geographic coordinates.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Validation**: Removes rows with missing values for dates, coordinates, and target type
3. **Type Conversion**: Converts year, latitude, and longitude to numeric format
4. **Category Normalization**: Maps GTD target types to 5 standardized categories
5. **Category Filtering**: Keeps only rows with valid category
6. **Victim Conversion**: Converts deaths and injuries to numeric format
7. **Total Victim Calculation**: Sums killed and wounded for each attack
8. **Top-50 Selection**: Selects the 50 deadliest attacks for each category
9. **Structuring**: Organizes data in hierarchical format by category
10. **Export**: Saves the result in JSON 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `imonth`: Month of attack
  - `iday`: Day of attack
  - `latitude`: Latitude of attack
  - `longitude`: Longitude of attack
  - `targtype1_txt`: Primary target type
  - `nkill`: Number of deaths
  - `nwound`: Number of injuries

## Output

- **File**: `JSON/globe_targets.json`
- **Format**: JSON with hierarchical structure by category:



- **Content**: For each category, list of top-50 attacks sorted by victim count

## Usage in BugBusters Project

This script is used for:
- **Target Visualization**: Creates an interactive map showing the most targeted types by category

## Target Category Mapping

Normalization converts GTD types to 5 standardized categories:

| GTD Type | Normalized Category |
|----------|----------------------|
| Military | military_police |
| Police | military_police |
| Government (General) | government |
| Government (Diplomatic) | government |
| Business | business |
| Private Citizens & Property | citizens |
| Transportation | transportations |
| (Unmapped) | (excluded) |

**Output Order**: military_police → government → business → citizens → transportations


### Output JSON
```json
{
  "government": [
    {
      "year": 2001,
      "victims": 5120,
      "lat": 40.7128,
      "long": -74.0060
    }
  ],
  "military_police": [
    {
      "year": 2001,
      "victims": 7,
      "lat": 34.5260,
      "long": 69.1800
    }
  ],
  ...
}
```

#