window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });

let xAxis;
const timeAxisBinning = 5; //years per tick
const RIGHT_CHART_MARGIN = 30; //margin to bottom,left and right of the axis
let leftPadAxis;
let rightPadAxis;
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
    xAxis._updateAxis = (duration) => {
      const maxYear = +slider.property('value') || years[years.length - 1];
      const minYear = 1969;

      const x = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([leftPadAxis, rightPadAxis]);

      const width = rightPadAxis - leftPadAxis;
      
      // --- DYNAMIC TICK CALCULATION ---
      const pxPerTick = 50; 
      const maxTicksPossible = Math.floor(width / pxPerTick);

      let step = timeAxisBinning;
      while (((maxYear - minYear) / step) > maxTicksPossible) {
         step *= 2;
      }

      const tickVals = d3.range(minYear, maxYear + 1, step);      
      
      if (RIGHT_AXIS_FORCE_LAST_TICK && maxYear > minYear) {
        const last = tickVals[tickVals.length - 1];
        if (last !== maxYear) tickVals.push(maxYear);
      }
      
      const axis = d3.axisBottom(x)
        .tickValues(tickVals)
        .tickFormat(d3.format('d'));

      // --- ANIMATED UPDATE ---
      // Apply transition to the axis group
      const t = xAxis.transition().duration(duration).ease(d3.easeLinear);
      
      t.call(axis);
      t.selectAll('.tick text')
        .style('font-size', `${labelFontSize}px`)
        .attr('fill', COLORS.RIGHT_CHART.textPrimary);

      t.selectAll('path')
        .attr('stroke', COLORS.RIGHT_CHART.axisLine)
        .attr('stroke-width', 2);

      t.selectAll('line')
        .attr('stroke', COLORS.RIGHT_CHART.axisLine)
        .attr('stroke-width', 2);
    }
  } 
  window._draw_main_right_lastCall = [categoryInfo, containerId];


  //if the category changed, reset the globe to default
  if (currentCat !== previousCat) {
    const containerClasses = {
      'group':  'groups-container',
      'attack': 'attacks-container',
      'target': 'targets-container'
    };
    const targetClass = containerClasses[previousCat];

    if (targetClass) {
      const exitingContainer = svg.select(`.${targetClass}`);

      if (!exitingContainer.empty()) {
        exitingContainer
          .attr('class', `${targetClass}-exiting`)
          .transition()
          .duration(transitionDurationMs)
          .ease(d3.easeCubicIn)
          .style('opacity', 0)
          .attr('transform', `translate(0, ${RIGHT_CHART_HEIGHT})`) 
          .remove();
      }
    }
  }

  setTimeout(() => {
    if (currentCat === 'group')       right_chart_group(svg);
    else if (currentCat === 'attack') right_chart_attack(svg);
    //else if (currentCat === 'target')
    
    stepAnimationRight();
    },transitionDurationMs);
}