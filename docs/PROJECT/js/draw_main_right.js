window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });


let g_right = null;

const RIGHT_CHART_MARGIN = 50;
// Draw function for main page right canvas
function draw_main_right(categoryInfo, containerId) {
  const container = d3.select(`#${containerId}`);

  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;

  const currentCat = categoryInfo?.current || null;
  const previousCat = categoryInfo?.previous || null;

  //called once to initialize
  if (!window._draw_main_right_lastCall) {
    //initialize SVG
    svg.selectAll('*').remove();
    svg.attr('width', '100%')
       .attr('height', '100%')
       .attr('viewBox', `0 0 ${RIGHT_CHART_WIDTH} ${RIGHT_CHART_HEIGHT}`)

    //-----------------//
    //EDIT AFTER THIS LINE
    //-----------------//

    //put everything in a group
    g_right = svg.append('g').attr('transform', 'translate(0,0)');

    //TODO: better define axes
    const xAxis = g_right.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${RIGHT_CHART_HEIGHT - RIGHT_CHART_MARGIN})`);
    
      const maxYear = +slider.property('value') || years[years.length - 1];
      const x = d3.scaleLinear()
        .domain([1969, maxYear])
        .range([RIGHT_CHART_MARGIN, LEFT_CHART_WIDTH - RIGHT_CHART_MARGIN]);

      
      const tickVals = d3.range(1969, maxYear + 1, 5);
      const axis = d3.axisBottom(x)
        .tickValues(tickVals)
        .tickFormat(d3.format('d'));

      xAxis.call(axis);

  }
  window._draw_main_right_lastCall = [categoryInfo, containerId];

  //TODO: how is this updated on each call?

}
