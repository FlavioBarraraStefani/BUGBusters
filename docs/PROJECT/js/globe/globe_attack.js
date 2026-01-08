function globe_attack() {

  // 1. Define Constants (Same as globe_group)
  const ORIGINAL_STROKE = COLORS.GLOBE.country.stroke; 
  const ORIGINAL_WIDTH = 0.75;
  const HOVER_STROKE = "black";
  const HOVER_WIDTH = 3;

  // 2. State Tracking
  let hoveredCountry = null;
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

  // --- Helper: Map attack string to Color ---
  const getAttackColor = (type) => {
    if (type === 'others') return COLORS.defaultComparison;
    const idx = CATEGORIES.attack.indexOf(type);
    if (idx !== -1 && COLORS.attackColors[idx]) {
      return COLORS.attackColors[idx];
    }
    return COLORS.defaultComparison; 
  };

  // --- Helper: Render Tooltip ---
  const renderTooltip = (countryName, type, count, year) => {
    if (!type) {
      tooltip.style('opacity', 0);
      return;
    }
    const color = getAttackColor(type);
    
    // Handle missing count (if JSON only has strings)
    const countText = (count !== null && count !== undefined) ? `: ${count} Attacks` : '';

    const html = `<strong>${countryName} (${year})</strong><br/>
                  <div style="display:flex; align-items:center; margin-top:4px;">
                    <span style="width:8px; height:8px; background:${color}; border-radius:50%; margin-right:6px;"></span>
                    <span>${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}${countText}</span>
                  </div>`;

    tooltip.html(html)
      .style('opacity', 1)
      .style('left', (lastMouseX + 15) + 'px')
      .style('top', (lastMouseY - 15) + 'px');
  };

  // 4. Central Logic for Updating a Country
  const updateCountryShape = (sel, d, year, animate = false) => {
    const countryName = d.properties.name;
    const intYear = Math.round(year);
    const yearData = window._attackData ? window._attackData[intYear] : null;

    // Check hover state
    const isHovered = (hoveredCountry === countryName);

    // --- APPLY STYLES (Stroke Highlight) ---
    sel.attr("stroke", isHovered ? HOVER_STROKE : ORIGINAL_STROKE)
       .attr("stroke-width", isHovered ? HOVER_WIDTH : ORIGINAL_WIDTH);

    if (isHovered) sel.raise();

    // --- RETRIEVE DATA ---
    let dominantType = null;
    let dominantCount = null;

    if (yearData && yearData[countryName]) {
        const raw = yearData[countryName];
        // Support both simple String (current) or Object {type, count} (future)
        if (typeof raw === 'object') {
            dominantType = raw.type;
            dominantCount = raw.count;
        } else {
            dominantType = raw; 
        }
    }

    // --- LIVE TOOLTIP UPDATE ---
    if (isHovered) {
       if (dominantType) {
         renderTooltip(countryName, dominantType, dominantCount, intYear);
       } else {
         tooltip.style('opacity', 0);
       }
    }

    // --- COLORING & EVENTS ---
    if (!dominantType) {
    const reset = animate ? sel.transition().duration(playIntervalMs) : sel;
    reset.attr('fill', COLORS.GLOBE.country.fill);
      
      // Clear events but KEEP mouseout
      sel.on('click', null)
         .on('mousemove', null)
         .on('mouseout', function() {
            hoveredCountry = null;
            tooltip.style('opacity', 0);
            d3.select(this).attr("stroke", ORIGINAL_STROKE).attr("stroke-width", ORIGINAL_WIDTH);
         });
      return;
    }

    // Case: Data Exists
    const targetColor = getAttackColor(dominantType);

    // Apply Fill
    if (animate) {
       sel.interrupt()
          .transition().duration(playIntervalMs)
          .ease(d3.easeLinear)
          .attr('fill', targetColor);
    } else {
       sel.interrupt()
          .attr('fill', targetColor);
    }

    // Attach Interactions
    sel.on('click', () => { stopAnimation(); showModal("attack", dominantType); })
       .on('mousemove', function(event) {
          // 1. Update State
          lastMouseX = event.pageX;
          lastMouseY = event.pageY;
          hoveredCountry = countryName;

          // 2. Immediate Visual Feedback
          d3.select(this)
            .attr("stroke", HOVER_STROKE)
            .attr("stroke-width", HOVER_WIDTH)
            .raise();

          // 3. Render Tooltip
          renderTooltip(countryName, dominantType, dominantCount, intYear);
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
  // 5. OVERWRITE GLOBAL FUNCTIONS
  // =============================
  stepAnimation = (transition = true) => {
    const year = +slider.property('value');
    g.selectAll('path.country')
      .attr('d', path)
      .each(function(d) {
        updateCountryShape(d3.select(this), d, year, transition);
      });

    console.log(transition)
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    const year = +slider.property('value');

    g.selectAll('path.country')
      .attr('d', path)
  };

  // Initial Render
  rotateOnStart = true;
  playIntervalMs = 400; 
}