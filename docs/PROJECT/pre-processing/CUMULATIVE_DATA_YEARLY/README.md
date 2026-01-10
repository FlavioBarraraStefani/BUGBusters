# Cumulative Data Yearly - Documentation

## General Overview

The `cumulative_data_yearly.ipynb` script processes Global Terrorism Database (GTD) data to generate a D3.js visualization of annual cumulative data of terrorist attacks by attack type.

## Features

This script performs complete processing of raw terrorism data with the following steps:

1. **Data Loading**: Imports the GTD CSV file
2. **Data Cleaning and Column Selection**: Filters necessary columns and removes missing values
3. **Date Column Creation**: Converts year, month, and day fields to datetime format
4. **Annual Aggregation**: Groups attacks by year and attack type
5. **Pivot Table**: Transforms data from long to wide format
6. **Top 5 Selection**: Keeps only the 5 most frequent attack types
7. **Smoothing**: Applies a 5-year moving average to attenuate fluctuations
8. **Cumulative Sum**: Calculates cumulative sum of the data
9. **Export**: Saves data in CSV format for D3.js

## Input

- **File**: `terrorism_dataset.csv`
- **Columns Used**:
  - `iyear`: Year of attack
  - `imonth`: Month of attack
  - `iday`: Day of attack
  - `attacktype1_txt`: Attack type (descriptive)

## Output

- **File**: `d3_cumulative_data_yearly.csv`
- **Format**: CSV with date (YYYY) as first column and 5 attack types as subsequent columns
- **Values**: Smoothed cumulative counts of attacks per year and type

## Processing Steps

### 1. Loading and Cleaning

- Reads input data
- Selects only columns: iyear, imonth, iday, attacktype1_txt
- Removes rows with missing values
- Replaces invalid days (0) with 1


### 2. Date Creation

- Combines iyear, imonth, iday into a datetime object
- Removes invalid dates


### 3. Annual Aggregation

- Groups by year and attack type
- Counts number of attacks


### 4. Pivot and Top Selection

- Transforms from long to wide format
- Identifies 5 most frequent attack types overall
- Keeps only these 5 types



### 5. Cumulative Sum

- Calculates cumulative sum for each attack type
- Result: increasing trend over time


### 7. Export

- Converts dates to YYYY format (year only)
- Saves to CSV with index=False



## Output Example

The generated CSV will have this structure:

| date | Bombing/Explosion | Armed Assault | Assassination | Hostage Taking | Facility/Infrastructure Attack |
|------|-------------------|---|---|---|---|
| 1970 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 1971 | 15.6 | 8.2 | 5.0 | 2.0 | 1.0 |
| 1972 | 45.2 | 22.8 | 15.6 | 8.2 | 5.0 |
| ... | ... | ... | ... | ... | ... |


