function globe_default() {
  
  let tasselSelection = null;
  
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
      // Safe check for global variable
      .style("font-size", typeof LabelFontSize !== 'undefined' ? LabelFontSize : "12px") 
      .style("z-index", "9999")
      .style("display", "none");
  }

  function getIntersectingCountries(tasselGeometry) {
    const countrySelection = g.selectAll('path.country');
    if (countrySelection.empty()) return "Ocean / Unclaimed";

    const features = countrySelection.data(); 
    const intersecting = [];
    
    features.forEach(country => {
       if (d3.geoContains(country, tasselGeometry.properties.center)) {
         intersecting.push(country.properties.name || "Unknown");
       }
    });

    return intersecting.length > 0 ? intersecting.join(", ") : "Ocean / Unclaimed";
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
      
      // --- START INVISIBLE ---
      .attr('opacity', 0) 
      .attr('stroke-opacity', 0) 
      .style('cursor', 'default')

      // --- MOUSEOVER INTERACTION ---
      .on('mouseover', function(event, d) {
        const year = +slider.property('value');
        const count = yearLookup[year][d.id];
        
        if (!count || !isFront(d.properties.center[0], d.properties.center[1])) return;

        const countryNames = getIntersectingCountries(d);

        tooltip
          .style("display", "block")
          .html(`
            <strong>Attacks: ${count}</strong><br/>
            <span style="color:#ccc; font-size: 0.9em;">${countryNames}</span>
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px");

        d3.select(this).attr('stroke-width', 2).attr('stroke', 'white');
      })

      // --- MOUSEOUT INTERACTION ---
      .on('mouseout', function() {
        tooltip.style("display", "none");
        d3.select(this).attr('stroke-width', 1).attr('stroke', 'black');
      });
  }

  function updateTassels(year, { transition = false, duration = 0 } = {}) {
    if (!tasselSelection) return;

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
  
  // --- CHANGE: STARTUP ANIMATION ---
  // Transition from Opacity 0 -> 0.9 over 1000ms
  updateTassels(currentYear, { transition: true, duration: transitionDurationMs }); 
  
  updateLegendVisibility(currentYear);

  stepAnimation = () => {
    const year = +slider.property('value');
    updateTassels(year, { transition: true, duration: playIntervalMs });
    updateLegendVisibility(year);
  };

  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    g.selectAll('path.country').attr('d', path);

    if (tasselSelection) {
      tasselSelection.attr('d', path);
      const year = +slider.property('value');
      updateTassels(year, { transition: false });
    }
  };

  rotateOnStart = false;
  playIntervalMs = 250;
}