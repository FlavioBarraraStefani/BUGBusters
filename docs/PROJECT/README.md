# BUGBusters — PROJECT

This folder contains the Data Visualization course project: a single-page visualization demo. The single entry point is `index.html`, which loads the CSS, data and JavaScript modules in `css/`, `assets/` and `js/` to render the interactive visualizations.

Note: the `pre-processing/` directory documents how the files containing the data for each plot are generated (notebooks and export scripts). The generated data files themselves are published in a separate (private) repository; a listing of those produced files is available via the GitHub API endpoint: https://api.github.com/repos/supernino02/BugBuster-project/contents


Overview
- **index.html**: The single page that ties everything together. It loads the stylesheet and the scripts in `js/`, and is the file to open in a browser to run the demo.
- **assets/**: Static data and other assets consumed by the visualizations (geojson, CSV/JSON datasets, images, etc.). Required at runtime by the JS modules.
- **css/main_style.css**: Global styles for layout, charts and UI controls.

JavaScript modules (js/)
- **main.js**: App bootstrap and orchestrator. Initializes the page, wires UI controls, coordinates which charts to draw and handles high-level interactions.
- **categories.js**: Manages category selection and the main page layout. It tracks the current/previous category selection, enables/disables category buttons, and orchestrates drawing of the left and right canvases via `draw_main_left()` and `draw_main_right()`. It also computes responsive canvas sizes (`setCanvasSizes()`), handles stacked vs side-by-side layouts, rescales the globe projection (`rescaleGlobe()`), and exposes UI helpers such as `showModal()` used for category-specific details.
- **draw_attack_1.js**, **draw_attack_2.js**, **draw_attack_3.js**: Chart-specific code that renders the various "attack" visualizations shown on the page. Each `draw_*.js` implements a particular view or chart variant.
- **draw_group_1.js** … **draw_group_5.js**: Group-related chart renderers. These are split into multiple files to keep each visualization focused and maintainable.
- **draw_target_1.js**, **draw_target_2.js**: Target-focused visualizations and their rendering logic.
- **draw_main_left.js**, **draw_main_right.js**: Code responsible for the left and right main panels respectively — used to keep layout-specific rendering separate from chart logic.

Specialized subfolders
- **js/globe/**: Globe (map) visualizations and preprocessing helpers.
  - `globe_default_preprocessing.js`: data transforms and preprocessing specific to the globe visualizations.
  - `globe_default.js`, `globe_attack.js`, `globe_group.js`, `globe_target.js`: separate globe views for default, attack, group and target modes. The globe code is separated because it typically needs different data preparation and rendering.
- **js/right_chart/**: Right-side detail charts used when a primary visualization or selection changes.
  - `right_chart_attack.js`, `right_chart_group.js`, `right_chart_target.js`: small focused modules that render contextual/auxiliary charts on the right-side panel.

The  code is clearly separeted, to simplify the modularity of it:
- Separation of concerns: each `draw_*.js` implements a single view which makes the code easier to develop and debug.
- Modular globe and right-chart folders: specialized rendering and data prep are isolated from the main app flow to avoid duplication and to keep initialization logic in `main.js` simple.
- `assets/` holds the canonical data so the JS modules can be data-driven and reusable.
