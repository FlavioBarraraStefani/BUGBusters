function globe_default() {
  // Base hexbin radius (will be divided by zoom level)
  const baseHexRadius = Math.min(LEFT_CHART_WIDTH, LEFT_CHART_HEIGHT) * 0.015;

  
  // Get current zoom scale from projection
  function getZoomScale() {
    return projection.scale() / baseScale;
  }

  // Compute hexbin radius based on zoom level (recursive splitting)
  function getHexRadius() {
    const zoomK = getZoomScale();
    // Split hexbins as zoom increases: radius decreases
    return baseHexRadius / Math.pow(zoomK, 0.01);
  }

  // Get precomputed cumulative data and project it for current globe state
  function getProjectedData(year) {
    const precomputed = yearCumulativeData[year] || [];
    return precomputed
      .map(d => {
        const coords = projection([d.long, d.lat]);
        if (!coords) return null;
        const front = isFront(d.long, d.lat);
        if (!front) return null;
        return { x: coords[0], y: coords[1], count: d.count };
      })
      .filter(d => d !== null);
  }

  // Build hexbins from projected data
  function buildHexbins(data, hexRadius) {
    const hexbin = d3.hexbin()
      .x(d => d.x)
      .y(d => d.y)
      .radius(hexRadius)
      .extent([[0, 0], [LEFT_CHART_WIDTH, LEFT_CHART_HEIGHT]]);

    const bins = hexbin(data);
    // Sum counts in each bin
    bins.forEach(bin => {
      bin.totalCount = d3.sum(bin, d => d.count);
    });
    return { hexbin, bins };
  }

  // Draw hexbins
  function drawHexbins(year, { transition = false, duration = 0 } = {}) {
    const hexRadius = getHexRadius();
    const data = getProjectedData(year);
    const { hexbin, bins } = buildHexbins(data, hexRadius);

    // Fixed min/max cumulative counts for this year (not dynamic based on visible bins)
    const fixedMin = yearMinCounts[year] || 0;
    const fixedMax = yearMaxCounts[year] || 1;

    // Simple linear scale: count -> index
    // The power distribution is already baked into INTERPOLATED_COLORMAP
    const colorScale = d3.scaleLinear()
      .domain([fixedMin, fixedMax])
      .range([0, COLORMAP_STEPS - 1])
      .clamp(true);
    
    // Direct linear lookup into precomputed colormap
    const getColor = (count) => INTERPOLATED_COLORMAP[Math.round(colorScale(count))];

    let hexGroup = g.select('g.hex-bins');
    if (hexGroup.empty()) {
      hexGroup = g.append('g').attr('class', 'hex-bins');
    }

    const hexPaths = hexGroup.selectAll('path.hex-bin')
      .data(bins, d => `${d.x.toFixed(1)}|${d.y.toFixed(1)}`);

    const enter = hexPaths.enter().append('path')
      .attr('class', 'hex-bin')
      .attr('d', hexbin.hexagon())
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('fill', d => getColor(d.totalCount))
      //.attr('stroke', 'black')
      //.attr('stroke-width', 1.5)
      .attr('opacity', 0.5);

    const merged = enter.merge(hexPaths);

    if (transition) {
      merged.transition().duration(duration)
        .attr('d', hexbin.hexagon())
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => getColor(d.totalCount))
        .attr('opacity', 1);
    } else {
      merged
        .attr('d', hexbin.hexagon())
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => getColor(d.totalCount))
        .attr('opacity', 1);
    }

    hexPaths.exit().remove();
  }

  //----------//
  //INITIAL DRAW SETUP
  //----------//

  // Get current year from slider
  const currentYear = +slider.property('value');

  // Initial draw
  drawHexbins(currentYear, { transition: true, duration: playIntervalMs *2});
  updateLegendVisibility(currentYear);

  //----------//
  //RUNTIME ANIMATION SETUP
  //----------//
  stepAnimation = () => {
    const year = +slider.property('value');
    drawHexbins(year, { transition: true, duration: playIntervalMs });
    updateLegendVisibility(year);
  };

  // WHAT TO DO ON EACH FRAME UPDATE
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    // Move countries
    g.selectAll('path.country').attr('d', path);

    // Redraw hexbins (reproject + possibly new radius due to zoom)
    const year = +slider.property('value');
    drawHexbins(year, { transition: false });
  };

  // DO NOT AUTOROTATE the globe
  rotateOnStart = false;
  playIntervalMs = 250;
}