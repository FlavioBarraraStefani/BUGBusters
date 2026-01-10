# Default Float 1 2 3 - Geolocation Data Processing

## Description

This Python script processes Global Terrorism Database (GTD) data to aggregate terrorist attacks by year and geographic location (latitude and longitude). Data is grouped with 5 decimal precision for coordinates and counted for each unique combination of year, latitude, and longitude.

## Main Functionality

The script performs the following operations:

1. **Data Loading**: Reads the CSV file `terrorism_dataset.csv` 
2. **Validation**: Removes rows with missing values for year, latitude, and longitude
3. **Data Type Conversion**: Converts numeric values to appropriate format
4. **Coordinate Rounding**: Rounds latitude and longitude to 5 decimals to reduce granularity
5. **Aggregation**: Groups attacks by year and geographic location
6. **Counting**: Counts the number of attacks for each combination
7. **Export**: Saves the result 

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `latitude`: Latitude of attack location
  - `longitude`: Longitude of attack location

## Output

- **File**: `default_float_1_2_3.csv`
- **Format**: CSV with the following columns:
  - `year`: Year of attack
  - `lat`: Latitude rounded to 5 decimals
  - `long`: Longitude rounded to 5 decimals
  - `count`: Number of attacks for that combination


## Code Structure

### Function `load_and_clean_data(filepath)`

- Reads the CSV
- Filters relevant columns (iyear, latitude, longitude)
- Removes rows with missing data
- Converts data types to numeric format


### Function `process_grouped_events(df)`

- Rounds coordinates to 5 decimals
- Groups by year and location
- Counts attacks per group
- Saves to CSV

## Output Example

| year | lat | long | count |
|------|-----|------|-------|
| 2000 | 34.52600 | 69.18000 | 3 |
| 2000 | 31.94600 | 35.92700 | 2 |
| 2001 | 34.52600 | 69.18000 | 5 |
| 2001 | 31.94600 | 35.92700 | 4 |
| ... | ... | ... | ... |


