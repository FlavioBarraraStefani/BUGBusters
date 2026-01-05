window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });

let xAxis;
const timeAxisBinning = 5; //years per tick
const RIGHT_CHART_MARGIN = 30; //margin to bottom,left and right of the axis
let leftPadAxis = RIGHT_CHART_MARGIN; //+70 is stacked layout preferred
const RIGHT_AXIS_FORCE_LAST_TICK = false;

// Draw function for main page right canvas
function draw_main_right(categoryInfo, containerId) {
  const container = d3.select(`#${containerId}`);

  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;

  const currentCat = categoryInfo?.current || null;
  const previousCat = categoryInfo?.previous || null;

  // initialize group and axis helper once
  //initialize SVG (ensure viewBox)
  if (!window._draw_main_right_lastCall) {
    svg.selectAll('*').remove();
    svg.attr('width', '100%')
       .attr('height', '100%')
       .attr('viewBox', `0 0 ${RIGHT_CHART_WIDTH} ${RIGHT_CHART_HEIGHT}`)

    // main xAxis group
    xAxis = svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN})`);

    // helper: recalc and render the axis (called on every draw)
    function updateAxis() {
      const maxYear = +slider.property('value') || years[years.length - 1];
      const minYear = 1969;

      // choose left padding based on stacked layout preference
      leftPadAxis = (typeof STACKED_LAYOUT_PREFERRED !== 'undefined' && STACKED_LAYOUT_PREFERRED)
        ? RIGHT_CHART_MARGIN + 90
        : RIGHT_CHART_MARGIN;

      const x = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([leftPadAxis, RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN]);

      const tickVals = d3.range(minYear, maxYear + 1, timeAxisBinning);
      // optionally ensure the last tick lands exactly on maxYear when maxYear > minYear
      if (RIGHT_AXIS_FORCE_LAST_TICK && maxYear > minYear) {
        const last = tickVals[tickVals.length - 1];
        if (last !== maxYear) tickVals.push(maxYear);
      }
      const axis = d3.axisBottom(x)
        .tickValues(tickVals)
        .tickFormat(d3.format('d'));

      xAxis.call(axis);

      // Styling: tick font-size and axis color from top-level constants
      xAxis.selectAll('.tick text')
        .style('font-size', `${labelFontSize}px`)
        .attr('fill', COLORS.RIGHT_CHART.textPrimary);

      //axis line and ticks color
      xAxis.selectAll('path')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine)
      .attr('stroke-width', 2);

      xAxis.selectAll('line')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine)
      .attr('stroke-width', 2);

    }
    xAxis._updateAxis = updateAxis;
  } 
  window._draw_main_right_lastCall = [categoryInfo, containerId];


  //if the category changed, reset the globe to default
  if (currentCat !== previousCat) {
    if (previousCat === 'group') { 
      // Select the container
      const exitingContainer = svg.select('.groups-container');
      if (!exitingContainer.empty()) {
        exitingContainer
          .attr('class', 'groups-container-exiting')
          .transition()
          .duration(playIntervalMs)
          .ease(d3.easeCubicIn)
          .style('opacity', 0)
          .attr('transform', `translate(0, ${RIGHT_CHART_HEIGHT})`) 
          .remove();
      }
    } else if (previousCat === 'attack') {
    } else if (previousCat === 'target') {
    }
  }

  setTimeout(() => {
    if (currentCat === 'group') right_chart_group(svg);
    //else if (currentCat === 'attack')
    //else if (currentCat === 'target')
    
      stepAnimationRight();
    },playIntervalMs);
}

function precompute_group() {
  const data = window.globe_group_data;
  const groups = CATEGORIES.group;
  const minYear = 1969;

  // 1. Find max year (Assuming data[g] always exists and keys are valid numbers)
  let dataMax = minYear;
  groups.forEach(g => {
    Object.keys(data[g]).forEach(ky => {
      const y = +ky;
      if (y > dataMax) dataMax = y;
    });
  });

  const yearsArr = d3.range(minYear, dataMax + 1);

  const seriesByGroup = groups.map(gname => {
    return yearsArr.map(y => {
      return data[gname][y] ? +data[gname][y].total_count : 0;
    });
  });

  window._precomputed_group = {
    minYear: minYear,
    maxYear: dataMax,
    years: yearsArr,
    seriesByGroup: seriesByGroup
  };
}