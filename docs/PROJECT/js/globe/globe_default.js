// Precompute interpolated colormap with K steps
const COLORMAP_STEPS = 512;
let INTERPOLATED_COLORMAP = [];

// Exponent for sqrt-like distribution (lower = more spread for low values)
const COLORMAP_EXPONENT = 0.4;

function precomputeColormap() {
  let COLORMAP = COLORS.GLOBE.hexbin.colormap;
  // Create a continuous color interpolator from the base colors
  const colorInterpolator = d3.scaleLinear()
    .domain(COLORMAP.map((_, i) => i / (COLORMAP.length - 1)))
    .range(COLORMAP)
    .interpolate(d3.interpolateRgb);
  
  // Generate K interpolated colors with power distribution
  // Using exponent < 1 means: low indices cover MORE of the color spectrum
  // This gives better differentiation for lower values
  INTERPOLATED_COLORMAP = [];
  for (let i = 0; i < COLORMAP_STEPS; i++) {
    const normalizedIdx = i / (COLORMAP_STEPS - 1);
    // Apply power function: low indices -> spread across more base colors
    const t = Math.pow(normalizedIdx, COLORMAP_EXPONENT);
    INTERPOLATED_COLORMAP.push(colorInterpolator(t));
  }
}

// Precompute fixed max count for each year (cumulative) for consistent colormap
const yearMaxCounts = {};
const yearMinCounts = {};

// Precompute cumulative data for each year (before projection)
const yearCumulativeData = {};

function precomputeGlobeData() {
  const data = window.globe_default_data;
  if (!data || data.length === 0) {
    console.warn('globe_default_data not available for precomputation');
    return;
  }
  
  // Get all years from data and fill in gaps to create continuous range
  const dataYears = [...new Set(data.map(d => +d.year))].sort((a, b) => a - b);
  const minYear = dataYears[0];
  const maxYear = dataYears[dataYears.length - 1];
  
  // Create array of all years in range (including years with 0 counts)
  const years = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }
  
  // Group data by location
  const locationData = {};
  data.forEach(d => {
    const key = `${d.lat},${d.long}`;
    if (!locationData[key]) {
      locationData[key] = { lat: +d.lat, long: +d.long, yearCounts: {} };
    }
    const year = +d.year;
    locationData[key].yearCounts[year] = (locationData[key].yearCounts[year] || 0) + (+d.count);
  });
  
  // For each year, compute cumulative counts per location
  years.forEach(year => {
    const cumulativeLocations = [];
    let maxCountThisYear = 0;
    let minCountThisYear = Infinity;
    
    Object.values(locationData).forEach(loc => {
      let cumCount = 0;
      // Sum all counts up to this year
      Object.keys(loc.yearCounts).forEach(y => {
        if (+y <= year) {
          cumCount += loc.yearCounts[y];
        }
      });
      
      if (cumCount > 0) {
        cumulativeLocations.push({ lat: loc.lat, long: loc.long, count: cumCount });
        if (cumCount > maxCountThisYear) {
          maxCountThisYear = cumCount;
        }
        if (cumCount < minCountThisYear) {
          minCountThisYear = cumCount;
        }
      }
    });
    
    yearCumulativeData[year] = cumulativeLocations;
    yearMaxCounts[year] = maxCountThisYear || 1;
    yearMinCounts[year] = minCountThisYear === Infinity ? 0 : minCountThisYear;
  });
}

// Global functions to show/hide colormap legend
let showColormapLegend = null;
let hideColormapLegend = null;
  
  // Legend dimensions
let LEGEND_MARGIN = 10;
let LEGEND_THICKNESS = 15;  // width if vertical, height if horizontal
let LEGEND_LENGTH;
let LEGEND_PADDING = 10;

function createLegendGlobe() {
  // Determine orientation: vertical (width > height) or horizontal (height > width)
  
  LEGEND_LENGTH = (!STACKED_LAYOUT_PREFERRED ? LEFT_CHART_HEIGHT : LEFT_CHART_WIDTH) * 0.6;

  // Get canvas-wrapper offset relative to canvas-left (legend's positioning parent)
  const canvasLeft = document.getElementById('canvas-left');
  const canvasWrapper = canvasLeft?.querySelector('.canvas-wrapper');
  let wrapperOffsetLeft = 0;
  let wrapperOffsetTop = 0;
  if (canvasWrapper && canvasLeft) {
    wrapperOffsetLeft = canvasWrapper.offsetLeft;
    wrapperOffsetTop = canvasWrapper.offsetTop;
  }

  // Title dimensions
  const TITLE_FONT_SIZE = labelFontSize * 1.5;
  let TITLE_HEIGHT = 40;  // Space for title (increased for larger font)
  const VERTICAL_LEGEND_WIDTH = 100;  // Width for vertical legend to allow text wrapping

  // Style the legend container
  if (!STACKED_LAYOUT_PREFERRED) {
    TITLE_HEIGHT  += 10 // extra padding for horizontal layout
    LEGEND_MARGIN += 20
    legendGlobe
      .style('position', 'absolute')
      .style('left', `${wrapperOffsetLeft - VERTICAL_LEGEND_WIDTH - LEGEND_PADDING * 2}px`)  // hidden initially
      .style('top', `${wrapperOffsetTop + (LEFT_CHART_HEIGHT - LEGEND_LENGTH - TITLE_HEIGHT) / 2}px`)
      .style('width', `${VERTICAL_LEGEND_WIDTH + LEGEND_PADDING * 2}px`)
      .style('height', `${LEGEND_LENGTH + TITLE_HEIGHT + LEGEND_PADDING * 2}px`)
      .style('padding', `${LEGEND_PADDING}px`)
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
      .style('display', 'flex')
      .style('flex-direction', 'row')
      .style('align-items', 'stretch')
      .style('transition', 'left 0.5s ease')
  } else {
    legendGlobe
      .style('position', 'absolute')
      .style('left', `${wrapperOffsetLeft + (LEFT_CHART_WIDTH - LEGEND_LENGTH) / 2}px`)
      .style('top', `${wrapperOffsetTop - LEGEND_THICKNESS - LEGEND_PADDING * 2 - TITLE_HEIGHT - 30}px`)  // hidden initially
      .style('width', `${LEGEND_LENGTH + LEGEND_PADDING * 2}px`)
      .style('height', `${LEGEND_THICKNESS + LEGEND_PADDING * 2 + TITLE_HEIGHT + 25}px`)
      .style('padding', `${LEGEND_PADDING}px`)
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('align-items', 'stretch')
      .style('transition', 'top 0.5s ease');
  }


  const LEGEND_TITLE = "Total count of attacks";
    
    if (!STACKED_LAYOUT_PREFERRED) {
      legendSvg = legendGlobe.append('svg')
        .attr('class', 'legend-svg')
        .attr('width', VERTICAL_LEGEND_WIDTH)
        .attr('height', LEGEND_LENGTH + TITLE_HEIGHT)
        .style('overflow', 'not visible');
      
      // Add title at top with text wrapping for vertical layout
      const titleGroup = legendSvg.append('text')
        .attr('class', 'legend-title')
        .attr('x', VERTICAL_LEGEND_WIDTH / 2)
        .attr('y', TITLE_FONT_SIZE)
        .attr('text-anchor', 'middle')
        .style('font-size', `${TITLE_FONT_SIZE}px`)
        .style('font-weight', 'bold')
        .style('fill', '#333');
      
      // Split title into multiple lines for vertical layout
      const words = LEGEND_TITLE.split(' ');
      const line1 = words.slice(0, 2).join(' ');  // "Cumulative #"
      const line2 = words.slice(2).join(' ');      // "of attacks"
      
      titleGroup.append('tspan')
        .attr('x', VERTICAL_LEGEND_WIDTH / 2)
        .attr('dy', 0)
        .text(line1);
      titleGroup.append('tspan')
        .attr('x', VERTICAL_LEGEND_WIDTH / 2)
        .attr('dy', TITLE_FONT_SIZE * 1.1)
        .text(line2);
    } else {
      legendSvg = legendGlobe.append('svg')
        .attr('class', 'legend-svg')
        .attr('width', LEGEND_LENGTH)
        .attr('height', LEGEND_THICKNESS + TITLE_HEIGHT + 20)
        .style('overflow', 'not visible');
      
      // Add title at top (single line for horizontal)
      legendSvg.append('text')
        .attr('class', 'legend-title')
        .attr('x', LEGEND_LENGTH / 2)
        .attr('y', TITLE_FONT_SIZE)
        .attr('text-anchor', 'middle')
        .style('font-size', `${TITLE_FONT_SIZE}px`)
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(LEGEND_TITLE);
    }

    // Create gradient definition
    const defs = legendSvg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'colormap-gradient-html');
    
    if (!STACKED_LAYOUT_PREFERRED) {
      gradient.attr('x1', '0%').attr('y1', '100%')
              .attr('x2', '0%').attr('y2', '0%');
    } else {
      gradient.attr('x1', '0%').attr('y1', '0%')
              .attr('x2', '100%').attr('y2', '0%');
    }
    
    // Add color stops from INTERPOLATED_COLORMAP
    const numStops = 20;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const colorIdx = Math.round(t * (COLORMAP_STEPS - 1));
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', INTERPOLATED_COLORMAP[colorIdx]);
    }
    
    // Draw the color bar rectangle
    if (!STACKED_LAYOUT_PREFERRED) {
      legendSvg.append('rect')
        .attr('class', 'colormap-bar')
        .attr('x', 0)
        .attr('y', TITLE_HEIGHT)
        .attr('width', LEGEND_THICKNESS)
        .attr('height', LEGEND_LENGTH)
        .attr('fill', 'url(#colormap-gradient-html)')
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);
      
      legendSvg.append('g')
        .attr('class', 'colormap-axis')
        .attr('transform', `translate(${LEGEND_THICKNESS}, ${TITLE_HEIGHT})`)
        .style('font-size', `${labelFontSize}px`);
    } else {
      legendSvg.append('rect')
        .attr('class', 'colormap-bar')
        .attr('x', 0)
        .attr('y', TITLE_HEIGHT)
        .attr('width', LEGEND_LENGTH)
        .attr('height', LEGEND_THICKNESS)
        .attr('fill', 'url(#colormap-gradient-html)')
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);
      
      legendSvg.append('g')
        .attr('class', 'colormap-axis')
        .attr('transform', `translate(0, ${LEGEND_THICKNESS + TITLE_HEIGHT})`)
        .style('font-size', `${labelFontSize}px`);
    }

  // Global function to show legend with transition
  showColormapLegend = function(transition = false) {
    const canvasLeft = document.getElementById('canvas-left');
    const canvasWrapper = canvasLeft?.querySelector('.canvas-wrapper');
    const wrapperOffsetLeft = canvasWrapper?.offsetLeft || 0;
    const wrapperOffsetTop = canvasWrapper?.offsetTop || 0;
    
    let duration = transition ? playIntervalMs : 0;
    if (!STACKED_LAYOUT_PREFERRED) {
      legendGlobe.style('transition', `left ${duration}ms ease`)
                 .style('left', `${wrapperOffsetLeft + LEGEND_MARGIN}px`);
    } else {
      legendGlobe.style('transition', `top ${duration}ms ease`)
                 .style('top', `${wrapperOffsetTop + LEGEND_MARGIN}px`);
    }
  };

  // Global function to hide legend with transition
  hideColormapLegend = function(transition = false) {
    const canvasLeft = document.getElementById('canvas-left');
    const canvasWrapper = canvasLeft?.querySelector('.canvas-wrapper');
    const wrapperOffsetLeft = canvasWrapper?.offsetLeft || 0;
    const wrapperOffsetTop = canvasWrapper?.offsetTop || 0;
    
    let duration = transition ? playIntervalMs : 0;
    if (!STACKED_LAYOUT_PREFERRED) {
      legendGlobe.style('transition', `left ${duration}ms ease`)
                 .style('left', `${wrapperOffsetLeft - VERTICAL_LEGEND_WIDTH - LEGEND_PADDING * 2 - 10}px`);
    } else {
      legendGlobe.style('transition', `top ${duration}ms ease`)
                 .style('top', `${wrapperOffsetTop - LEGEND_THICKNESS - LEGEND_PADDING * 2 - TITLE_HEIGHT - 30}px`);
    }
  };

}



  // Function to update legend ticks based on current year
function updateLegendTicks(year) {
    const fixedMin = yearMinCounts[year] || 0;
    const fixedMax = yearMaxCounts[year] || 1;
    
    const legendSvg = legendGlobe.select('svg.legend-svg');
    let axis;
    if (!STACKED_LAYOUT_PREFERRED) {
      const axisScale = d3.scaleLinear()
        .domain([fixedMax, fixedMin])
        .range([0, LEGEND_LENGTH]);
      
      axis = d3.axisRight(axisScale)
        .ticks(5)
        .tickFormat(d3.format('.0f'));
    } else {
      const axisScale = d3.scaleLinear()
        .domain([fixedMin, fixedMax])
        .range([0, LEGEND_LENGTH]);
      
      axis = d3.axisBottom(axisScale)
        .ticks(5)
        .tickFormat(d3.format('.0f'));
    }
    
    legendSvg.select('g.colormap-axis')
      .transition()
      .duration(playIntervalMs)
      .call(axis)
      .selectAll('text')
      .style('font-size', `${labelFontSize}px`);
}

  // Function to update legend visibility based on year
function updateLegendVisibility(year) {
    if (year === 1969) {
      hideColormapLegend(true);
    } else {
      showColormapLegend(true);
      updateLegendTicks(year);
    }
}

function globe_default(svg) {
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