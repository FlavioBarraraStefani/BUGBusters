# Groups Casualty Bins - Terrorist Groups Victim Distribution Analysis

## Description

This Python script processes Global Terrorism Database (GTD) data to analyze the distribution of victim counts (killed and wounded) for three terrorist organizations (ISIL, Taliban, Shining Path). Data is divided into casualty bins (0, 1, 2-10, 11-100, 100+) to show how each organization's attacks distribute by severity in terms of victim counts.

## Main Functionality

The script performs the following operations:

1. **Dataset Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Column Selection**: Extracts only gname (group), nkill (killed) and nwound (wounded)
3. **Missing Value Handling**: Replaces NaN values in killed and wounded with 0
4. **Group Filtering**: Processes the 3 target organizations (ISIL, Taliban, SL)
5. **Killed Binning**: Assigns each attack to a casualty bin based on nkill
6. **Wounded Binning**: Assigns each attack to a casualty bin based on nwound
7. **Categorization**: Categorizes data with 5 bins: 0, 1, 2-10, 11-100, 100+ (0 = 0 killed, 1 = one killed, ...)
8. **Count per Killed Bin**: Counts how many attacks fall into each killed bin
9. **Count per Wounded Bin**: Counts how many attacks fall into each wounded bin
10. **Ordering**: Maintains bins in increasing order of severity
12. **Export**: Saves the result in JSON 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `gname`: Name of terrorist group
  - `nkill`: Number of people killed in attack
  - `nwound`: Number of people wounded in attack

## Output

- **File**: `groups_casualty_bins.json`
- **Format**: JSON with structure for each organization:
  ```json
  {
    "ISIL": [
      {
        "bin": "0",
        "killed_count": 456,
        "wounded_count": 543
      },
      {
        "bin": "1",
        "killed_count": 234,
        "wounded_count": 189
      },
      {
        "bin": "2-10",
        "killed_count": 876,
        "wounded_count": 654
      },
      {
        "bin": "11-100",
        "killed_count": 345,
        "wounded_count": 234
      },
      {
        "bin": "100+",
        "killed_count": 89,
        "wounded_count": 123
      }
    ],
    "taliban": [...],
    "SL": [...]
  }
  ```
- **Content**: For each organization, array of 5 bins with count of attacks with kills and injuries in each category

## Casualty Bins

The script uses 5 predefined bins to categorize attack severity:

| Bin | Description | Interpretation |
|-----|-------------|-----------------|
| 0 | Zero victims | Attacks with no killed/wounded in that category |
| 1 | One victim | Attacks with single victim in that category |
| 2-10 | Few victims | Attacks with 2-10 victims in that category |
| 11-100 | Many victims | Attacks with 11-100 victims in that category |
| 100+ | Many victims | Attacks with more than 100 victims in that category |

### Interpretation of Counts

Each bin contains the number of attacks that fall into that category:

**Practical Example:**
- **Bin "0" (killed_count: 2406)**: Means there were **2,406 attacks with no deaths** (nkill = 0)
- **Bin "0" (wounded_count: 3992)**: Means there were **3,992 attacks with no injuries** (nwound = 0)




