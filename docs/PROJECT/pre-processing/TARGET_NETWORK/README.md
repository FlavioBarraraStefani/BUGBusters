# Target Radial Tree - README

## Description
This Python script processes Global Terrorism Database (GTD) data to generate a hierarchical radial tree structure that shows the relationship between target categories and their subtypes. For each of the 5 main target categories (military_police, government, business, citizens, transportations), the script identifies the 5 most frequent subtypes and organizes them in a 3-level hierarchical structure (root → categories → subtypes). Data is exported in JSON format.

## Main Functionality
The script processes the GTD dataset to:

1. Load GTD data with target type and subtype columns
2. Normalize GTD target types into 5 standardized categories
3. Identify the 5 most frequent subtypes for each category
4. Build a 3-level hierarchical structure:
   - Level 0 (root): "ALL ATTACKS" (all attacks)
   - Level 1: normalized categories (5 categories)
   - Level 2: top-5 subtypes per category
5. Assign attack counts to each node
6. Export structure in JSON format 

## Normalized Target Categories
The script normalizes GTD target types into 5 main categories:

### Mapping Target Types → Categories
```
Military                      → military_police
Police                        → military_police
Government (General)          → government
Government (Diplomatic)       → government
Business                      → business
Private Citizens & Property   → citizens
Transportation                → transportations
```

**5 Standardized Categories:**
1. **military_police** - Attacks against military and police forces
2. **government** - Attacks against government institutions and officials
3. **business** - Attacks against businesses and commercial property
4. **citizens** - Attacks against civilians and private property
5. **transportations** - Attacks against transportation infrastructure

## Input
- **File:** `terrorism_dataset.csv`
- **Columns used:**
  - `targtype1_txt` (main target type)
  - `targsubtype1_txt` (target subtype)
- **Encoding:** ISO-8859-1
- **Location:** Main SCRIPT PYTHON folder

## Output
- **File:** `target_radial_tree.json`
- **Format:** Structured JSON with radial tree hierarchy

### Struttura JSON Output
```json
{
  "military_police": {
    "name": "ALL ATTACKS",
    "value": 25000,
    "type": "root",
    "children": [
      {
        "name": "military_police",
        "value": 5000,
        "type": "category",
        "children": [
          {
            "name": "Military Personnel",
            "value": 2800,
            "type": "subtype"
          },
          {
            "name": "Police",
            "value": 1500,
            "type": "subtype"
          },
          {
            "name": "Military or Police Checkpoints",
            "value": 400,
            "type": "subtype"
          },
          {
            "name": "Military Installation",
            "value": 200,
            "type": "subtype"
          },
          {
            "name": "Police Building",
            "value": 100,
            "type": "subtype"
          }
        ]
      },
      {
        "name": "government",
        "value": 4500,
        "type": "category",
        "children": [...]
      },
      ...
    ]
  },
  "government": {...},
  "business": {...},
  "citizens": {...},
  "transportations": {...}
}
```

