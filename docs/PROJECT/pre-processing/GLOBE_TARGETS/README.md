# Globe Preponderant Targets - Most Attacked Targets by Country & Time

## Description

This Python script processes Global Terrorism Database (GTD) data to generate a temporal JSON structure. It groups data into 5-year bins and identifies the **preponderant attack target** (the target category with the highest frequency of attacks) for every country in each time period.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv`
2. **Category Normalization**: Maps GTD raw target types to 5 standardized categories (Military/Police, Government, Business, Citizens, Transportation)
3. **Time Binning**: Groups data into 5-year intervals. The bin key is defined as the **last year** of the interval (e.g., 1970-1974 → 1974)
4. **Aggregation**: Counts the number of attacks for each Target Category within every Country and Time Bin
5. **Ranking**: Sorts the counts to determine the most frequent target for each country per bin
6. **Filtering**: Selects only the top target per country. Countries with 0 attacks in a bin are excluded
7. **Structuring**: Organizes the data into a dictionary where keys are the bin years
8. **Export**: Saves the result in `globe_target.json`

## Input

- **File**: `original.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `country_txt`: Name of the country
  - `targtype1_txt`: Primary target type description

## Output

- **File**: `globe_target.json`
- **Format**: JSON object where keys are the ending years of 5-year bins
- **Content**: A list of objects for each bin. Each object uses the country name as the key and contains the attack count and target category

## Usage in BugBusters Project

This script is used for:
- **Temporal/Geospatial Visualization**: Driving a timeline map that displays how the primary focus of terrorism (e.g., shifting from Business to Private Citizens) changes for specific countries over decades

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
| (Others) | (excluded) |

### Output JSON Example

```json
{
  "1974": [
    {
      "United States": {
        "attacks": 120,
        "target": "business"
      }
    },
    {
      "United Kingdom": {
        "attacks": 85,
        "target": "military_police"
      }
    }
  ],
  "1979": [
    {
      "Italy": {
        "attacks": 45,
        "target": "government"
      }
    }
  ]
}