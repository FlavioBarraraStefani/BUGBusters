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

const BIN_RESOLUTION = 3.0; 

let allTassels = []; 
const yearLookup = {}; 
const yearMaxCounts = {};
const yearMinCounts = {}; 

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getResampledEdge(lat, longStart, longEnd, steps = 4) {
  const points = [];
  const stepSize = (longEnd - longStart) / steps;
  for (let i = 0; i <= steps; i++) {
    points.push([longStart + (i * stepSize), lat]);
  }
  return points;
}

// ==========================================
// 1. PRECOMPUTE LOGIC
// ==========================================

function precomputeGlobeData(data) {

  const dataYears = [...new Set(data.map(d => +d.year))].sort((a, b) => a - b);
  const minYear = dataYears[0];
  const maxYear = dataYears[dataYears.length - 1];
  
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  const gridMap = {}; 

  data.forEach(d => {
    if (isNaN(d.lat) || isNaN(d.long)) return;

    let rawLat = Math.max(-90, Math.min(90, +d.lat));
    let rawLong = Math.max(-180, Math.min(180, +d.long));

    const lat0 = Math.floor(rawLat / BIN_RESOLUTION) * BIN_RESOLUTION;
    const long0 = Math.floor(rawLong / BIN_RESOLUTION) * BIN_RESOLUTION;

    const safeLong0 = (long0 >= 180) ? (180 - BIN_RESOLUTION) : long0;
    const safeLat0 = (lat0 >= 90) ? (90 - BIN_RESOLUTION) : lat0;

    const key = `${safeLat0}_${safeLong0}`;

    if (!gridMap[key]) {
      const lat1 = Math.min(safeLat0 + BIN_RESOLUTION, 90);
      const long1 = Math.min(safeLong0 + BIN_RESOLUTION, 180);

      if (lat1 <= safeLat0 || long1 <= safeLong0) return;

      const bottomEdge = getResampledEdge(safeLat0, safeLong0, long1); 
      const topEdge = getResampledEdge(lat1, long1, safeLong0); 
      
      let coordinates = [
        ...bottomEdge, 
        [long1, lat1], 
        ...topEdge, 
        [safeLong0, safeLat0]
      ];

      const geometry = {
        type: "Polygon",
        coordinates: [coordinates]
      };

      if (d3.geoArea(geometry) > 6) {
        geometry.coordinates[0].reverse();
      }

      gridMap[key] = { 
        id: key,
        center: [safeLong0 + BIN_RESOLUTION/2, safeLat0 + BIN_RESOLUTION/2],
        geometry: geometry,
        yearCounts: {}
      };
    }
    
    gridMap[key].yearCounts[+d.year] = (gridMap[key].yearCounts[+d.year] || 0) + (+d.count);
  });

  allTassels = Object.values(gridMap).map(cell => ({
    type: "Feature",
    id: cell.id,
    geometry: cell.geometry,
    properties: { center: cell.center } 
  }));

  years.forEach(year => {
    yearLookup[year] = {};
    let maxCount = 0;
    let minCount = Infinity; 

    Object.values(gridMap).forEach(cell => {
      let cumCount = 0;
      for (const [y, count] of Object.entries(cell.yearCounts)) {
        if (+y <= year) cumCount += count;
      }
      
      if (cumCount > 0) {
        yearLookup[year][cell.id] = cumCount;
        if (cumCount > maxCount) maxCount = cumCount;
        if (cumCount < minCount) minCount = cumCount;
      }
    });
    
    yearMaxCounts[year] = maxCount || 1;
    yearMinCounts[year] = minCount === Infinity ? 1 : minCount; 
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
  const TITLE_FONT_SIZE = labelFontSize;
  let TITLE_HEIGHT = 30;  // Space for title (increased for larger font)
  const VERTICAL_LEGEND_WIDTH = 100;  // Width for vertical legend to allow text wrapping

  // Style the legend container
  if (!STACKED_LAYOUT_PREFERRED) {
    TITLE_HEIGHT  += 20 // extra padding for horizontal layout
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


  const LEGEND_TITLE = "Cumulative # of attacks";
    
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

    g.selectAll('path.country, .ocean-bg')
    .transition().duration(duration)
    .attr('fill-opacity', 0.25)
    .attr("stroke-opacity", 0.25);

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

    g.selectAll('path.country, .ocean-bg')
      .transition().duration(duration)
      .attr('fill-opacity', 1)
      .attr("stroke-opacity", 1);
  };

}



  // Function to update legend ticks based on current year
function updateLegendTicks(year,transition=true) {
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
      .duration(transition ? playIntervalMs : 0)
      .call(axis)
      .selectAll('text')
      .style('font-size', `${labelFontSize}px`);
}

  // Function to update legend visibility based on year
function updateLegendVisibility(year, transition = true) {
    if (year === sliderRange[0]) {
      hideColormapLegend(transition);
    } else {
      showColormapLegend(transition);
      updateLegendTicks(year,transition);
    }
}
