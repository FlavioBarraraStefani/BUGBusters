window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });

let xAxis;
const timeAxisBinning = 5; //years per tick
const RIGHT_CHART_MARGIN = 30; //margin to bottom,left and right of the axis
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

      const x = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([RIGHT_CHART_MARGIN, RIGHT_CHART_WIDTH - RIGHT_CHART_MARGIN]);

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
      .attr('stroke', COLORS.RIGHT_CHART.axisLine);

      xAxis.selectAll('line')
      .attr('stroke', COLORS.RIGHT_CHART.axisLine);
    }
    xAxis._updateAxis = updateAxis;
  } 
  window._draw_main_right_lastCall = [categoryInfo, containerId];


  console.log(previousCat, '->', currentCat);
  //if the category changed, reset the globe to default
  if (currentCat !== previousCat) {
    if (previousCat === 'group') { 
      svg.selectAll('.groups-container').remove();
    } else if (previousCat === 'attack') {
    } else if (previousCat === 'target') {
    }
  }

 if (currentCat === 'group') {
    right_chart_group(svg);
  } else if (currentCat === 'attack') {
  } else if (currentCat === 'target') {
  }
  stepAnimationRight();
}