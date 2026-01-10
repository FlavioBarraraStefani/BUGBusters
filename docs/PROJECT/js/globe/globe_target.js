// ==========================================
// 1. DATA PREPARATION & PRECOMPUTATION
// ==========================================

async function precomputeTargetData(rawData) {
  window._targetData = window._targetData || {};
  window._cartoCache = window._cartoCache || {};
  if (!rawData) return;

  // 1. Parse Data
  const binKeys = [];
  Object.keys(rawData).forEach(yearKey => {
    const year = parseInt(yearKey, 10);
    binKeys.push(year);
    window._targetData[year] = window._targetData[year] || {};

    const countryList = rawData[yearKey];
    if (Array.isArray(countryList)) {
      countryList.forEach(item => {
        const countryName = Object.keys(item)[0];
        if (countryName) {
          window._targetData[year][countryName] = item[countryName];
        }
      });
    }
  });
  
  // Sort keys for floor lookup later
  window._targetDataBins = binKeys.sort((a, b) => a - b);

  // 2. Ensure Topogram is loaded
  if (typeof d3.cartogram !== 'function') {
      await loadTopogram();
  }

  // 3. Precompute Geometries
  console.log("Starting Cartogram Precomputation...");

  // Safety check
  if (!window.globe_data || !window.globe_data.objects || !window.globe_data.objects.countries) {
      console.warn("Globe data not loaded yet. Skipping precomputation.");
      return;
  }

  // --- FIX: Create the 'countries' GeoJSON object locally ---
  // We need this to iterate over features and calculate min/max values
  const countries = topojson.feature(window.globe_data, window.globe_data.objects.countries);

  // We also need the raw geometries for the cartogram function
  let geometries = window.globe_data.objects.countries;
  if (geometries.geometries) geometries = geometries.geometries;

  window._targetDataBins.forEach(year => {
    // Determine Scale for this bin
    const lookupValue = (feature) => {
        const name = feature.properties.name || feature.properties.NAME || feature.id;
        const data = window._targetData[year][name];
        return data ? data.attacks : 0;
    };

    // Now 'countries' is defined, so this works
    let values = countries.features.map(f => lookupValue(f)).filter(v => v > 0);
    
    if (values.length === 0) {
        window._cartoCache[year] = null;
        return;
    }

    const scale = d3.scaleLinear()
        .domain([d3.min(values), d3.max(values)])
        .range([1, 100]); 

    const carto = d3.cartogram()
        .projection(projection)
        .value(d => {
            const name = (d.properties && (d.properties.name || d.properties.NAME)) || d.id;
            const data = window._targetData[year][name];
            return data ? scale(data.attacks) : 1;
        });

    try {
        const ret = carto(window.globe_data, geometries);
        window._cartoCache[year] = ret.features;
    } catch (e) {
        console.warn(`Skipping bin ${year} due to cartogram error`, e);
        window._cartoCache[year] = null;
    }
  });

  console.log("Cartogram Precomputation Complete.");
}
// Helper to load library if missing
function loadTopogram() {
    return new Promise((resolve, reject) => {
        if (window.topogram || typeof d3.cartogram === 'function') {
             if(window.topogram) d3.cartogram = window.topogram.cartogram;
             return resolve();
        }
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/topogram@latest/build/topogram.js';
        s.onload = () => {
            if (window.topogram) d3.cartogram = window.topogram.cartogram;
            resolve();
        };
        document.head.appendChild(s);
    });
}

// ==========================================
// 2. VISUALIZATION LOGIC
// ==========================================

function globe_target() {
  
  // Helper: Find the correct bin (floor of year)
  const getBinForYear = (currentYear) => {
      if (!window._targetDataBins) return null;
      // Find the largest bin key <= currentYear
      const validBins = window._targetDataBins.filter(bin => bin <= currentYear);
      return validBins.length > 0 ? validBins[validBins.length - 1] : null;
  };

  // Helper: Get data for a specific feature and bin
  const lookupData = (feature, binYear) => {
    if (!binYear || !window._targetData[binYear]) return null;
    const name = feature.properties.name || feature.properties.NAME || feature.id;
    return window._targetData[binYear][name] || null;
  };

  // --- Main Update Function ---
  const updateCountryShapesForYear = (currentYear, animate = false) => {
    
    const binYear = getBinForYear(currentYear);
    
    // Determine which features to render:
    // 1. The distorted features from cache (if they exist for this bin)
    // 2. Or the original features if no cache/data exists
    let featuresToRender = countries.features; // Default to standard geometry
    if (binYear && window._cartoCache && window._cartoCache[binYear]) {
        featuresToRender = window._cartoCache[binYear];
    }

    // Bind the chosen features to the path elements
    const selection = g.selectAll('path.country').data(featuresToRender);

    // Function to apply attributes (geometry AND color)
    const applyVisuals = (sel) => {
        sel
          .attr('d', path) // Update shape (supports rotation via global projection)
          .attr('fill', d => {
            // Logic: Color based on the Target in the active BIN
            const data = lookupData(d, binYear);
            
            // Check if we have data and a color for that target
            if (data && COLORS.targetColors && COLORS.targetColors[data.target]) {
                return COLORS.targetColors[data.target];
            }
            // Fallback color
            return (COLORS.targetColors && COLORS.targetColors.default) ? COLORS.targetColors.default : '#cccccc';
          })
          .attr('stroke', '#333')
          .attr('stroke-width', 0.5);
    };

    if (animate) {
        // Transition both shape and color smoothly
        selection.transition().duration(1000).ease(d3.easeLinear).call(applyVisuals);
    } else {
        applyVisuals(selection);
    }
  };

  // --- Reset Function ---
  // Restores original geometry and default colors
  window.resetCountries = () => {
      // Re-bind original features
      const selection = g.selectAll('path.country').data(countries.features);
      
      selection
          .transition().duration(750)
          .attr('d', path)
          .attr('fill', COLORS.GLOBE.country.fill)
          .attr('stroke', COLORS.GLOBE.country.stroke)
          .attr('stroke-width', 0.75);
          
      // Remove any specific event listeners if needed
      selection.on('click', null); 
  };

  // --- Interface Methods ---

  // Called by the slider or play loop
  stepAnimation = (transition = true) => {
    const sliderVal = document.getElementById('slider') ? document.getElementById('slider').value : 1974; 
    updateCountryShapesForYear(+sliderVal, transition);
  };

  // Called when the globe rotates (needs to re-project the current features)
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    // We just re-apply the 'd' attribute. 
    // The data bound to the elements is already the correct geometry (distorted or normal).
    g.selectAll('path.country').attr('d', path);
  };

  rotateOnStart = true;
  playIntervalMs = 1000;
}