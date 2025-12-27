  // Structured color definitions
  const globeColors = {
    ocean: '#c0dde7ff',
    country: {
      stroke: "#cbd5e1",
      fill: "#fcfcfc"
    },
    event: {
      highlight: "#444",
      default: "#cecece"
    }
  };

  
  let projection = null;
  let path = null;
  let g = null;
  let countries = null;
  let isFront = null;

  let playBtn = null;
  let slider = null;
  let title = null;

  let playing = false;
  let currentIndex = 0;
  const years = d3.range(1969, 2021);
  const playIntervalMs = 500;
  let animationFrame = null;
  
window.addEventListener('resize', () => { if (window._draw_main_left_lastCall) draw_main_left(...window._draw_main_left_lastCall); });
// Draw function for main page left canvas
function draw_main_left(categoryInfo, containerId) {
  const container = d3.select(`#${containerId}`);
  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;

  const currentCat = categoryInfo?.current || null;
  const previousCat = categoryInfo?.previous || null;
  console.log(`${currentCat}, ${previousCat}`);

  if (!window._draw_main_left_lastCall) {
    //initialize SVG
    svg.selectAll('*').remove();
    svg.attr('width', '100%')
       .attr('height', '100%')
       .attr('viewBox', `0 0 ${CHART_WIDTH_MAIN} ${CHART_HEIGHT_MAIN}`)

    //-----------------//
    //EDIT AFTER THIS LINE
    //-----------------//

    //put everything in a group
    g = svg.append('g').attr('transform', 'translate(0,0)');

    //render once the globe
    if (!window.globeRotation) window.globeRotation = [0, 0];
    const scale = Math.min(CHART_WIDTH_MAIN, CHART_HEIGHT_MAIN) / 2.1;

    projection = d3.geoOrthographic()
      .scale(scale)
      .center([0, 0])
      .rotate(window.globeRotation)
      .translate([CHART_WIDTH_MAIN / 2, CHART_HEIGHT_MAIN / 2]);

    countries = topojson.feature(window.globe_data, window.globe_data.objects.countries);
    path = d3.geoPath().projection(projection);

    // Ocean background
    g.append('circle')
      .attr('cx', projection.translate()[0])
      .attr('cy', projection.translate()[1])
      .attr('r', projection.scale())
      .attr('fill', globeColors.ocean)
      .attr('stroke', globeColors.country.stroke)
      .attr('stroke-width', 1);

    // Countries
    g.selectAll('path')
      .data(countries.features)
      .enter().append('path')
      .attr('d', path)
      .attr('fill', globeColors.country.fill)
      .attr('stroke', globeColors.country.stroke)
      .attr('stroke-width', 0.2)
      .append('title')
      .text(d => d.properties.NAME);

        // helper: returns true if point is on the visible (front) hemisphere
    isFront = (lon, lat) => {
      const rotate = projection.rotate(); // [lambda, phi, gamma]
      const center = [-rotate[0], -rotate[1]]; // center lon/lat
      return d3.geoDistance([lon, lat], center) <= Math.PI / 2;
    };

    playBtn = d3.select('#timeline_play_btn');
    slider = d3.select('#timeline_year_slider');
    title = d3.select('#year_title');
 
  }
  //each  time redraw based on category
  g = svg.select('g');

  switch (currentCat) {
      case null:
        globe_default(svg, g, projection, path);
        break;
      case 'group':
        //globe_default(svg, g, projection, path);
        break;
    }

    
  //save last call params for resize
  window._draw_main_left_lastCall = [categoryInfo, containerId];
}

function globe_default(svg, g, projection, path) {
  // Data points group
  let pointsGroup = g.select('g.data-points');
  if (pointsGroup.empty()) {
    pointsGroup = g.append('g').attr('class', 'data-points');
  }
  // Get current year from slider
  const currentYear = +slider.property('value');
  const data = (window.globe_default_data || []).map(d => ({
      lat: +d.lat,
      long: +d.long,
      year: +d.year,
      count: +d.count
    }));

    // Create/update/remove circles with explicit initial stroke
    let circles = pointsGroup.selectAll('circle.data-point')
      .data(data, d => `${d.lat}|${d.long}|${d.year}`)
      .join(
        enter => enter.append('circle')
          .attr('class', 'data-point')
          .attr('r', 0)
          .attr('opacity', 0)
          .attr('fill', 'none')
          .attr('stroke-width', 0.3)
          .attr('stroke', globeColors.event.default)
          .call(sel => sel.each(function(d) {
            const p = projection([d.long, d.lat]);
            d3.select(this).attr('cx', p ? p[0] : null).attr('cy', p ? p[1] : null);
          })),
        update => update.call(sel => sel.each(function(d) {
          const p = projection([d.long, d.lat]);
          d3.select(this).attr('cx', p ? p[0] : null).attr('cy', p ? p[1] : null);
        })),
        exit => exit.remove()
      );

        // initial visible state based on current slider value
    circles
      .attr('r', d => (d.year <= currentYear ? d._r : 0))
      .attr('opacity', d => (d.year <= currentYear ? 0.9 : 0))
      .attr('stroke', d => (d.year === currentYear ? globeColors.event.highlight : globeColors.event.default));

  // --- Radius scale ---
  const maxcount = d3.max(data, d => d.count) || 1;
  const rScale = d3.scaleSqrt().domain([0, maxcount]).range([2, 30]);

  // store radius
  circles.each(d => d._r = rScale(d.count));

  // initial visible state based on current slider value and hemisphere visibility
  circles.each(function(d) {
    const p = projection([d.long, d.lat]);
    const front = isFront(d.long, d.lat);
    d3.select(this)
      .attr('cx', p ? p[0] : null)
      .attr('cy', p ? p[1] : null)
      .attr('r', d.year <= currentYear && front ? d._r : 0)
      .attr('opacity', d.year <= currentYear && front ? 0.9 : 0)
      .attr('stroke', d.year === currentYear && front ? globeColors.event.highlight : globeColors.event.default);
  });

  //ALLOW drag to rotate globe
  let needsUpdate = false;

  const updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    g.selectAll('path').attr('d', path);
    g.selectAll('circle.data-point')
      .each(function(d) {
        const p = projection([+d.long, +d.lat]);
        const front = isFront(+d.long, +d.lat);
        d3.select(this)
          .attr('cx', p ? p[0] : null)
          .attr('cy', p ? p[1] : null)
          // hide circles that are on the far side
          .attr('r', d.year <= +slider.property('value') && front ? d._r : 0)
          .attr('opacity', d.year <= +slider.property('value') && front ? 0.9 : 0)
          .attr('stroke', d.year === +slider.property('value') && front ? globeColors.event.highlight : globeColors.event.default);
      });
  };

  const drag = d3.drag()
    .on('drag', function(event) {
      const rotate = projection.rotate();
      const k = 0.15; // sensitivity
      window.globeRotation = [rotate[0] + event.dx * k, rotate[1] - event.dy * k];
      projection.rotate(window.globeRotation);
      needsUpdate = true;
      requestAnimationFrame(updateGlobe);
    });

  svg.call(drag);

function updateCircles(year) {
  circles.transition().duration(300)
    .attr("r", d => (d.year <= year && isFront(d.long, d.lat, projection) ? d._r : 0))
    .attr("opacity", d => (d.year <= year && isFront(d.long, d.lat, projection) ? 1 : 0))
    .attr("stroke", d => (d.year === year && isFront(d.long, d.lat, projection) 
                          ? globeColors.event.highlight 
                          : globeColors.event.default));
}

  // --- Slider input handler ---
  slider.on('input', function() {
    const year = +this.value;
    title.property('value', year);
    stopAnimation()
    updateCircles(year);
  });

  // --- Play button handler ---
  playBtn.on('click', function() {
    if (playing) stopAnimation();
    else startAnimation();
  });

  function startAnimation() {
    playing = true;
    playBtn.text('❚❚');
    currentIndex = years.indexOf(+slider.property('value'));
    if (currentIndex < 0 || currentIndex >= years.length - 1) currentIndex = 0;
    stepAnimation();
  }

  function stopAnimation() {
    playing = false;
    playBtn.text('▶');
    if (animationFrame) {
      clearTimeout(animationFrame);
      animationFrame = null;
    }
  }

  function stepAnimation() {
    if (!playing) return;
    currentIndex++;
    if (currentIndex >= years.length) {
      stopAnimation();
      return;
    }
    const y = years[currentIndex];
    title.property('value', y);
    slider.property('value', y);
    updateCircles(y);
    animationFrame = setTimeout(stepAnimation, playIntervalMs);
  }
}