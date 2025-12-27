  // Structured color definitions
  const globeColors = {
    ocean: '#e0f6ff',
    country: {
      default: '#fffefeff',
      group: 'red',
      attack: 'blue',
      target: 'green'
    },
    stroke: '#272126ff',
    debug: 'red'
  };

window.addEventListener('resize', () => { if (window._draw_main_left_lastCall) draw_main_left(...window._draw_main_left_lastCall); });

// Draw function for main page left canvas
function draw_main_left(data, categoryInfo, containerId) {
  window._draw_main_left_lastCall = [data, categoryInfo, containerId];
  
  const container = d3.select(`#${containerId}`);
  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;

  const currentCat = categoryInfo?.current || null;
  
  svg.selectAll('*').remove();
  svg.attr('width', '100%')
     .attr('height', '100%')
     .attr('viewBox', `0 0 ${CHART_WIDTH_MAIN} ${CHART_HEIGHT_MAIN}`)

     const g = svg.append('g').attr('transform', 'translate(0,0)');
     //-----------------//
     //EDIT AFTER THIS LINE
     //-----------------//

    // Globe rendering code
    d3.json(GLOBE_PATH).then(function(globeData) {
      console.log('Globe data loaded successfully');
      if (!window.globeRotation) window.globeRotation = [0, 0];
      const scale = Math.min(CHART_WIDTH_MAIN, CHART_HEIGHT_MAIN) / 2.1;

      const projection = d3.geoOrthographic()
        .scale(scale)
        .center([0, 0])
        .rotate(window.globeRotation)
        .translate([CHART_WIDTH_MAIN / 2, CHART_HEIGHT_MAIN / 2]);

      const path = d3.geoPath().projection(projection);

      switch (currentCat) { 
        case null:
          globe_default(data,g,projection,globeData, path);
          break;  
        case 'group':
          globe_default(data,g,projection,globeData, path);
          break; 
      }

      // Drag behavior for horizontal rotation
      const drag = d3.drag()
        .on('drag', function(event) {
          const rotate = projection.rotate();
          const k = 0.15; // sensitivity
          window.globeRotation = [rotate[0] + event.dx * k, rotate[1] - event.dy * k];
          projection.rotate(window.globeRotation);
          g.selectAll('path').attr('d', path);
        });

      svg.call(drag);
    }).catch(function(error) {
      console.error('Error loading globe data:', error);
    });

}

function globe_default(data,g,projection,globeData,path) {
  const countries = topojson.feature(globeData, globeData.objects.countries);

  // Ocean background
  g.append('circle')
    .attr('cx', projection.translate()[0])
    .attr('cy', projection.translate()[1])
    .attr('r', projection.scale())
    .attr('fill', globeColors.ocean)
    .attr('stroke', globeColors.stroke)
    .attr('stroke-width', 1);

  // Determine fill color based on currentCat (placeholder logic)
  const fillColor = "red"
  
  // Countries
  g.selectAll('path')
    .data(countries.features)
    .enter().append('path')
    .attr('d', path)
    .attr('fill', fillColor)
    .attr('stroke', globeColors.stroke)
    .attr('stroke-width', 0.5);
}
