function globe_default() {
  
  let tasselSelection = null;
  // State to track what the user is currently hovering over
  let hoveredTasselData = null; 

  // Create Tooltip DIV
  let tooltip = d3.select("body").select(".tassel-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "tassel-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.85)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("pointer-events", "none") 
      .style("font-size", `${labelFontSize}px`) 
      .style("z-index", "9999")
      .style("display", "none");
  }

  // --- HELPER: UPDATE TOOLTIP CONTENT ---
  function updateTooltipContent(d, year) {
    const count = yearLookup[year][d.id] || 0;
    
    const countryNames = getIntersectingCountries(d);

    tooltip.html(`
      <strong>Attacks: ${count}</strong><br/>
      <span style="color:#ccc; font-size: 0.9em;">${countryNames}</span>
    `);
  }

  function getIntersectingCountries(tasselGeometry) {
    const countrySelection = g.selectAll('path.country');
    // Default to empty string instead of "Ocean" fallback
    if (countrySelection.empty()) return "Unclaimed Region";

    const features = countrySelection.data(); 
    const intersecting = [];
    
    features.forEach(country => {
       if (d3.geoContains(country, tasselGeometry.properties.center)) {
         const name = country.properties.name || "Unknown";
         if (name !== "Ocean") {
            intersecting.push(name);
         }
       }
    });

    return intersecting.length > 0 ? intersecting.join(", ") : "Unclaimed Region";
  }

  function initTassels() {
    let binGroup = g.select('g.tassel-bins');
    if (binGroup.empty()) {
      binGroup = g.append('g').attr('class', 'tassel-bins');
    }

    tasselSelection = binGroup.selectAll('path.tassel-bin')
      .data(allTassels, d => d.id)
      .enter().append('path')
      .attr('class', 'tassel-bin')
      .attr('d', path)
      .attr('stroke', 'black') 
      .attr('stroke-width', 1) 
      .attr('fill', '#000') 
      
      .attr('opacity', 0) 
      .attr('stroke-opacity', 0) 
      .style('cursor', 'default')

      // --- MOUSEOVER ---
      .on('mouseover', function(event, d) {
        const year = +slider.property('value');
        if (year == sliderRange[0]) return;
        const count = yearLookup[year][d.id] ;
        
        if (!count || !isFront(d.properties.center[0], d.properties.center[1])) return;

        hoveredTasselData = d;

        tooltip.style("display", "block")
               .style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 15) + "px");
        
        updateTooltipContent(d, year);

        d3.select(this).attr('stroke-width', 3).attr('stroke', 'white');
      })

      // --- MOUSEOUT ---
      .on('mouseout', function() {
        hoveredTasselData = null;
        tooltip.style("display", "none");
        d3.select(this).attr('stroke-width', 1).attr('stroke', 'black');
      })
      
      .on('mousemove', function(event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 15) + "px");
      });
  }

  function updateTassels(year, { transition = false, duration = 0 } = {}) {
    if (!tasselSelection) return;

    if (hoveredTasselData) {
       updateTooltipContent(hoveredTasselData, year);
    }

    const currentYearCounts = yearLookup[year] || {};
    const max = yearMaxCounts[year] || 1;
    const min = yearMinCounts[year] || 1;

    const colorScale = d3.scaleLinear()
      .domain([min, max]) 
      .range([0, COLORMAP_STEPS - 1])
      .clamp(true);

    const getColor = (count) => INTERPOLATED_COLORMAP[Math.round(colorScale(count))];

    const updateFn = (sel) => {
      sel
        .attr('fill', d => {
           const count = currentYearCounts[d.id];
           return count ? getColor(count) : 'none'; 
        })
        .attr('opacity', d => {
           const count = currentYearCounts[d.id];
           if (!count) return 0; 
           if (!isFront(d.properties.center[0], d.properties.center[1])) return 0;
           return 0.9; 
        })
        .attr('stroke-opacity', d => {
           const count = currentYearCounts[d.id];
           if (!count) return 0; 
           if (!isFront(d.properties.center[0], d.properties.center[1])) return 0;
           return 1; 
        })
        .style('cursor', d => {
           const count = currentYearCounts[d.id];
           const visible = isFront(d.properties.center[0], d.properties.center[1]);
           return (count && visible) ? 'pointer' : 'default';
        })
        .style('pointer-events', d => {
           const count = currentYearCounts[d.id];
           const visible = isFront(d.properties.center[0], d.properties.center[1]);
           return (count && visible) ? 'all' : 'none';
        });
    };

    if (transition) {
       tasselSelection.transition().duration(duration).call(updateFn);
    } else {
       tasselSelection.call(updateFn);
    }
  }

  // ==========================================
  // SETUP & HOOKS
  // ==========================================
  
  initTassels();

  const currentYear = +slider.property('value');
  
  updateTassels(currentYear, { transition: true, duration: 1000 }); 
  
  updateLegendVisibility(currentYear, true);

  stepAnimation = (transition=true) => {
    const year = +slider.property('value');
    updateTassels(year, { transition: transition, duration: playIntervalMs });
    updateLegendVisibility(year,transition);
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    g.selectAll('path.country').attr('d', path);

    // Ensure any visible tooltip is hidden and hovered state cleared
    if (tooltip) tooltip.style("display", "none");
    hoveredTasselData = null;

    if (tasselSelection) {
      tasselSelection
        .attr('d', path)
        .attr('stroke-width', 1)
        .attr('stroke', 'black');

      const year = +slider.property('value');
      updateTassels(year, { transition: false });
    }
  };

  rotateOnStart = false;
  playIntervalMs = 400;
}