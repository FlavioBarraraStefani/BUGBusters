function globe_group() {
  const groupData = window.group_cumulate_country;

  // 1. Define Constants for "Old" and "New" values
  const ORIGINAL_STROKE = COLORS.GLOBE.country.stroke; // Likely '#999' or similar
  const ORIGINAL_WIDTH = 0.75;
  const HOVER_STROKE = "black";
  const HOVER_WIDTH = 3;

  const MAX_CUMULATIVE = d3.max(
    Object.values(groupData),
    country =>
      d3.max(
        Object.values(country),
        yearMap => d3.max(Object.values(yearMap))
      )
  ) || 1;

  const colorInterp = d3.scaleSqrt()
    .domain([0, MAX_CUMULATIVE])
    .range([0.1, 1])
    .clamp(true);

  // 2. State Tracking
  let hoveredCountry = null; // Stores the ID (name) of the currently hovered country
  let lastMouseX = 0;
  let lastMouseY = 0;

  // 3. Tooltip Setup
  let tooltip = d3.select('#globe-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('id', 'globe-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', '#fff')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 99)
      .style('font-family', 'sans-serif')
      .style('font-size', `${labelFontSize}px`);
  }

  // Helper: Logic to render the HTML content
  const renderTooltip = (countryName, dominantGroup, dominantCount, year) => {
    if (!dominantGroup) {
      tooltip.style('opacity', 0);
      return;
    }

    const color = COLORS.groupColors[CATEGORIES.group.indexOf(dominantGroup)];
    
    const html = `<strong>${countryName} (${year})</strong><br/>
                  <div style="display:flex; align-items:center; margin-top:4px;">
                    <span style="width:8px; height:8px; background:${color}; border-radius:50%; margin-right:6px;"></span>
                    <span>${dominantGroup}: ${dominantCount} Attacks</span>
                  </div>`;

    tooltip.html(html)
      .style('opacity', 1)
      .style('left', (lastMouseX + 15) + 'px')
      .style('top', (lastMouseY - 15) + 'px');
  };

  // 4. Central Logic for Updating a Country
  // This handles both Animation updates AND Hover updates
  const updateCountryShape = (sel, d, year, animate = false) => {
    const countryName = d.properties.name;
    const entry = groupData[countryName];
    
    // Check if this specific country is the one being hovered
    const isHovered = (hoveredCountry === countryName);

    // --- APPLY STYLES (Declarative) ---
    // If hovered, use Highlight values; otherwise, use Original values
    sel.attr("stroke", isHovered ? HOVER_STROKE : ORIGINAL_STROKE)
       .attr("stroke-width", isHovered ? HOVER_WIDTH : ORIGINAL_WIDTH);

    if (isHovered) sel.raise(); // Ensure thick border isn't covered by neighbors

    // --- CALCULATE DATA ---
    let dominantGroup = null;
    let dominantCount = 0;

    if (entry) {
      Object.entries(entry).forEach(([group, years]) => {
        const validYears = Object.keys(years).map(Number).filter(y => y <= year);
        if (validYears.length > 0) {
          const latestYear = d3.max(validYears);
          const val = years[latestYear];
          if (val > dominantCount) {
            dominantCount = val;
            dominantGroup = group;
          }
        }
      });
    }

    // --- LIVE TOOLTIP UPDATE ---
    // If the data changed because the year changed (animation), 
    // we must re-render the tooltip immediately if this is the hovered country.
    if (isHovered) {
       if (dominantGroup) {
          renderTooltip(countryName, dominantGroup, dominantCount, year);
       } else {
          tooltip.style('opacity', 0); // Hide if data disappeared for this year
       }
    }

    // --- COLORING & EVENTS ---
    if (!dominantGroup) {
      // Grey out if no data
      const reset = animate ? sel.transition().duration(playIntervalMs) : sel;
      reset.attr('fill', COLORS.GLOBE.country.fill)
           .attr('data-group', null);
      
      // Clean up events but KEEP mouseout to ensure state resets if we leave
      sel.on('click', null)
         .on('mousemove', null)
         .on('mouseout', function() {
            hoveredCountry = null;
            tooltip.style('opacity', 0);
            d3.select(this).attr("stroke", ORIGINAL_STROKE).attr("stroke-width", ORIGINAL_WIDTH);
         });
      return;
    }

    // Calculate Fill
    const baseColor = COLORS.GLOBE.country.fill;
    const targetColor = COLORS.groupColors[CATEGORIES.group.indexOf(dominantGroup)];
    const t = colorInterp(dominantCount);
    const finalFill = d3.interpolateRgb(baseColor, targetColor)(t);

    const activeSel = animate ? sel.transition().duration(playIntervalMs) : sel;
    activeSel.attr('fill', finalFill)
             .attr('data-group', dominantGroup);

    // Attach Interactions
    sel.on('click', () => { stopAnimation(); showModal("group", dominantGroup); })
       .on('mousemove', function(event) {
          // 1. Update Global State
          lastMouseX = event.pageX;
          lastMouseY = event.pageY;
          hoveredCountry = countryName; // "Lock" this country as the active one

          // 2. Immediate Visual Feedback (Waiting for next frame is too slow)
          d3.select(this)
            .attr("stroke", HOVER_STROKE)
            .attr("stroke-width", HOVER_WIDTH)
            .raise();

          // 3. Render Tooltip
          renderTooltip(countryName, dominantGroup, dominantCount, year);
       })
       .on('mouseout', function() {
          // 1. Clear Global State
          hoveredCountry = null;
          tooltip.style('opacity', 0);

          // 2. Restore "Old" Values immediately
          d3.select(this)
            .attr("stroke", ORIGINAL_STROKE)
            .attr("stroke-width", ORIGINAL_WIDTH);
       })
       .attr('cursor', 'pointer');
  };

  // =============================
  // 5. OVERWRITE GLOBAL FUNCTIONS
  // =============================

  // This function is called by your main loopAnimation
  stepAnimation = (transition = true) => {
    const year = +slider.property('value');
    g.selectAll('path.country')
      .attr('d', path)
      .each(function(d) {
        // True = animate color transitions
        updateCountryShape(d3.select(this), d, year, transition); 
      });
  };

  // This function is called when dragging/rotating (high performance)
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    const year = +slider.property('value');

    g.selectAll('path.country')
      .attr('d', path)
      .each(function(d) {
         updateCountryShape(d3.select(this), d, year, false); 
      });
  };

  // Initial call to set everything up
  rotateOnStart = true;
  playIntervalMs = 300;
}


// =============================
// PRECOMPUTE CUMULATIVE DATA
// =============================
function computeGroupCumulativeCountry(data) {
  const result = {};

    // Aggregate per country / group / year
    Object.entries(data).forEach(([group, years]) => {
      Object.entries(years).forEach(([yearStr, yearData]) => {
        const year = +yearStr;

        yearData.countries.forEach(({ country, count }) => {
          if (!result[country]) result[country] = {};
          if (!result[country][group]) result[country][group] = {};

          result[country][group][year] =
            (result[country][group][year] || 0) + count;
        });
      });
    });

    // Convert yearly counts → cumulative timeline
    Object.values(result).forEach(groupMap => {
      Object.values(groupMap).forEach(yearMap => {
        let acc = 0;
        Object.keys(yearMap)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach(y => {
            acc += yearMap[y];
            yearMap[y] = acc;
          });
      });
    });

    window.group_cumulate_country = result;
}