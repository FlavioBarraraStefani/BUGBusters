function globe_group() {
  const groupData = window.group_cumulate_country;

  const ORIGINAL_STROKE = COLORS.GLOBE.country.stroke; 
  const ORIGINAL_WIDTH = 0.75;
  const HOVER_STROKE = "black";
  const HOVER_WIDTH = 3;

  const maxCumulativeByGroup = {};
  Object.values(groupData).forEach(countryEntry => {
    Object.entries(countryEntry).forEach(([group, yearMap]) => {
      const maxVal = d3.max(Object.values(yearMap)) || 0;
      if (!maxCumulativeByGroup[group] || maxVal > maxCumulativeByGroup[group]) {
        maxCumulativeByGroup[group] = maxVal;
      }
    });
  });

  const colorInterpByGroup = {};
  Object.entries(maxCumulativeByGroup).forEach(([group, maxVal]) => {
    colorInterpByGroup[group] = d3.scaleSqrt()
      .domain([0, maxVal || 1])
      .range([0.15, 1])
      .clamp(true);
  });

  let hoveredCountry = null; // Stores the ID (name) of the currently hovered country
  let lastMouseX = 0;
  let lastMouseY = 0;

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

  const updateCountryShape = (sel, d, year, animate = false) => {
    const countryName = d.properties.name;
    const entry = groupData[countryName];
    
    // Check if this specific country is the one being hovered
    const isHovered = (hoveredCountry === countryName);
    sel.attr("stroke", isHovered ? HOVER_STROKE : ORIGINAL_STROKE)
       .attr("stroke-width", isHovered ? HOVER_WIDTH : ORIGINAL_WIDTH);

    if (isHovered) sel.raise(); // Ensure thick border isn't covered by neighbors
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
    if (isHovered) {
       if (dominantGroup) {
          renderTooltip(countryName, dominantGroup, dominantCount, year);
       } else {
          tooltip.style('opacity', 0); // Hide if data disappeared for this year
       }
    }

    // --- COLORING & EVENTS ---
    const hasActiveTransition = (node, name) => {
      const t = node.__transition;
      return t && Object.values(t).some(tr => tr.name === name);
    };

    if (!dominantGroup) {
      if (animate) {
        sel.transition("fill-color").duration(playIntervalMs)
           .attr('fill', COLORS.GLOBE.country.fill);
      } else if (!hasActiveTransition(sel.node(), "fill-color")) {
        // Only set immediately if no animation is running
        sel.attr('fill', COLORS.GLOBE.country.fill);
      }
      sel.attr('data-group', null);
      
      sel.on('click', null)
         .on('mousemove', null)
         .on('mouseout', function() {
            hoveredCountry = null;
            tooltip.style('opacity', 0);
            d3.select(this).attr("stroke", ORIGINAL_STROKE).attr("stroke-width", ORIGINAL_WIDTH);
         });
      return;
    }

    // Calculate Fill using group-specific interpolator
    const baseColor = COLORS.GLOBE.country.fill;
    const targetColor = COLORS.groupColors[CATEGORIES.group.indexOf(dominantGroup)];
    const groupInterp = colorInterpByGroup[dominantGroup] || d3.scaleSqrt().domain([0,1]).range([0.1,1]);
    const t = groupInterp(dominantCount);
    const finalFill = d3.interpolateRgb(baseColor, targetColor)(t);

    if (animate) {
      sel.transition("fill-color").duration(playIntervalMs)
         .attr('fill', finalFill);
    } else if (!hasActiveTransition(sel.node(), "fill-color")) {
      // Only set immediately if no animation is running
      sel.attr('fill', finalFill);
    }
    sel.attr('data-group', dominantGroup);

    // Attach Interactions
    sel.on('click', () => { stopAnimation(); showModal("group", dominantGroup); })
       .on('mousemove', function(event) {
          lastMouseX = event.pageX;
          lastMouseY = event.pageY;
          hoveredCountry = countryName; // "Lock" this country as the active one

          d3.select(this)
            .attr("stroke", HOVER_STROKE)
            .attr("stroke-width", HOVER_WIDTH)
            .raise();

          renderTooltip(countryName, dominantGroup, dominantCount, year);
       })
       .on('mouseout', function() {
          hoveredCountry = null;
          tooltip.style('opacity', 0);

          d3.select(this)
            .attr("stroke", ORIGINAL_STROKE)
            .attr("stroke-width", ORIGINAL_WIDTH);
       })
       .attr('cursor', 'pointer');
  };

  // =============================
  // OVERWRITE GLOBAL FUNCTIONS
  // =============================

  stepAnimation = (transition = true) => {
    const year = +slider.property('value');
    g.selectAll('path.country')
      .each(function(d) {
        updateCountryShape(d3.select(this), d, year, transition); 
      });
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    if (tooltip) tooltip.style('opacity', 0);
    hoveredCountry = null;

    g.selectAll('path.country')
      .attr('d', path)
      .attr('stroke', ORIGINAL_STROKE)
      .attr('stroke-width', ORIGINAL_WIDTH);
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