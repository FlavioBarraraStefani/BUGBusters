  //valuies initialized once the SVG is created
  let projection = null;
  let path = null;
  let g = null;
  let countries = null;
  let isFront = null;

  let playBtn = null;
  let slider = null;
  let title = null;

  //ALLOW drag to rotate globe
  let needsUpdate = false;
  let updateGlobe = null;   // function to update globe rendering

  let rotateOnStart = true;
  let isRotating = false;
  let rotationSpeed = 0.15; // degrees per frame

  let playing = false;
  let currentIndex = 0;
  const years = d3.range(1969, 2021);
  const playIntervalMs = 300;
  let animationFrame = null;

  let stepAnimation = null; //function to step animation (optional year param)

  function startAnimation() {
    playing = true;
    playBtn.text('❚❚');
    currentIndex = years.indexOf(+slider.property('value'));
    if (currentIndex < 0 || currentIndex >= years.length - 1) currentIndex = 0;
    if (rotateOnStart) isRotating = true;
    stepAnimation();
  }

  function stopAnimation() {
    isRotating = false;
    playing = false;
    playBtn.text('▶');
    if (animationFrame) {
      clearTimeout(animationFrame);
      animationFrame = null;
    }
  }
 
  function updateSlider() {
    currentIndex++;
    if (currentIndex >= years.length) {
      stopAnimation();
      return ;
    }
    const y = years[currentIndex];
    title.property('value', y);
    slider.property('value', y);
    return y;
  }
  
window.addEventListener('resize', () => { if (window._draw_main_left_lastCall) draw_main_left(...window._draw_main_left_lastCall); });
// Draw function for main page left canvas
function draw_main_left(categoryInfo, containerId) {
  const container = d3.select(`#${containerId}`);
  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;

  const currentCat = categoryInfo?.current || null;
  const previousCat = categoryInfo?.previous || null;

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
    const scale = Math.min(CHART_WIDTH_MAIN, CHART_HEIGHT_MAIN) / 2.4;

    projection = d3.geoOrthographic()
      .scale(scale)
      .center([0, 0])
      .rotate(window.globeRotation)
      .translate([CHART_WIDTH_MAIN / 2, CHART_HEIGHT_MAIN / 2]);

    countries = topojson.feature(window.globe_data, window.globe_data.objects.countries);
    path = d3.geoPath().projection(projection);

    // Ocean background
    g.append('circle')
      .attr('class', 'ocean-bg') 
      .attr('cx', projection.translate()[0])
      .attr('cy', projection.translate()[1])
      .attr('r', projection.scale())
      .attr('fill', COLORS.GLOBE.ocean)
      .attr('stroke', COLORS.GLOBE.country.stroke)
      .attr('stroke-width', 1);

    // Countries
    g.selectAll('path')
      .data(countries.features)
      .enter().append('path')
      .attr('d', path)
      .attr('fill', COLORS.GLOBE.country.fill)
      .attr('stroke', COLORS.GLOBE.country.stroke)
      .attr('stroke-width', 0.2)
      .attr('data-name', d => d.properties.name);

        // helper: returns true if point is on the visible (front) hemisphere
    isFront = (lon, lat) => {
      const rotate = projection.rotate(); // [lambda, phi, gamma]
      const center = [-rotate[0], -rotate[1]]; // center lon/lat
      return d3.geoDistance([lon, lat], center) <= Math.PI / 2;
    };

    playBtn = d3.select('#timeline_play_btn');
    slider = d3.select('#timeline_year_slider');
    title = d3.select('#year_title'); 

    // --- Slider input handler ---
    slider.on('input', function() {
      const year = +this.value;
      title.property('value', year);
      stopAnimation()
      stepAnimation(year)
    });

    // --- Play button handler ---
    playBtn.on('click', function() {
      if (playing) stopAnimation();
      else startAnimation();
    });



    //----------//
    // Enable drag to rotate globe
    //----------//
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

    //----------//
      //enable zoom to scale globe
      //----------//
      const baseScale = projection.scale(); // store initial scale
      const zoom = d3.zoom()
        .scaleExtent([1, 4]) // keep lower bound at initial scale (k >= 1)
        .on('zoom', function(event) {
          // event.transform.k is the zoom factor
          projection.scale(baseScale * event.transform.k);

          // update background circle to match new projection scale/translate
          const t = projection.translate();
          g.select('circle.ocean-bg')
            .attr('r', projection.scale())
            .attr('cx', t[0])
            .attr('cy', t[1]);

          needsUpdate = true;
          requestAnimationFrame(updateGlobe);
        });
      svg.call(zoom);

    //----------//
    // Auto-rotation loop
    //----------//    
    let rotationRAF = null;
      function startRotationLoop() {
        if (rotationRAF) return;
        let last = performance.now();
        function frame(now) {
          const dt = now - last;
          last = now;
          if (isRotating) {
            // scale rotationSpeed to time delta (assumes rotationSpeed is degrees per ~16.67ms frame)
            window.globeRotation[0] = (window.globeRotation[0] + rotationSpeed * (dt / 16.6667)) % 360;
            projection.rotate(window.globeRotation);
            needsUpdate = true;
            requestAnimationFrame(updateGlobe);
          }
          rotationRAF = requestAnimationFrame(frame);
        }
        rotationRAF = requestAnimationFrame(frame);
      }
      startRotationLoop();
  }
  //each  time redraw based on category
  g = svg.select('g');
  
  //if the category changed, reset the globe to default
  if (currentCat !== previousCat) {
    if (previousCat === null) {
      let circles = g.select('g.data-points').selectAll('circle.data-point');
      circles.transition().duration(playIntervalMs*2)
        .attr('r', 0)
        .attr('opacity', 0)
        .remove();      

    } else if (previousCat === 'group') {
      g.selectAll('path').attr('d', path).style('fill',COLORS.GLOBE.country.fill);
    } else if (previousCat === 'attack') {
    } else if (previousCat === 'target') {
    }
    stopAnimation();
  }
  if (currentCat === null) {
    globe_default(svg);
  } else if (currentCat === 'group') {
    globe_group(svg);
  }
    
  //save last call params for resize
  window._draw_main_left_lastCall = [categoryInfo, containerId];
}

function globe_default(svg) {
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
          .attr('stroke', COLORS.GLOBE.event.default),
        update => update,
        exit => exit.remove()
        )
        .each(function(d) {
        const p = projection([d.long, d.lat]);
        d3.select(this).attr('cx', p ? p[0] : null).attr('cy', p ? p[1] : null);
        });

        // initial visible state based on current slider value
    circles
      .attr('r', d => (d.year <= currentYear ? d._r : 0))
      .attr('opacity', d => (d.year <= currentYear ? 0.9 : 0))
      .attr('stroke', d => (d.year === currentYear ? COLORS.GLOBE.event.highlight : COLORS.GLOBE.event.default));

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
      .attr('stroke', d.year === currentYear && front ? COLORS.GLOBE.event.highlight : COLORS.GLOBE.event.default);
  });


  //WHAT TO DO ON EACH FRAME UPDATE
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;
    g.selectAll('path').attr('d', path);

    const year = +slider.property('value');

    //start of custom  behaviour
    g.selectAll('circle.data-point')
      .each(function(d) {
        const p = projection([+d.long, +d.lat]);
        const front = isFront(+d.long, +d.lat);
        d3.select(this)
          .attr('cx', p ? p[0] : null)
          .attr('cy', p ? p[1] : null)
          // hide circles that are on the far side
          .attr('r', d.year <= year && front ? d._r : 0)
          .attr('opacity', d.year <= year && front ? 0.9 : 0)
          .attr('stroke', d.year === year && front ? COLORS.GLOBE.event.highlight : COLORS.GLOBE.event.default);
      });
  };


  function updateCircles(year) {
    circles.transition().duration(playIntervalMs)
      .attr("r", d => (d.year <= year && isFront(d.long, d.lat) ? d._r : 0))
      .attr("opacity", d => (d.year <= year && isFront(d.long, d.lat) ? 1 : 0))
      .attr("stroke", d => (d.year === year && isFront(d.long, d.lat) ? COLORS.GLOBE.event.highlight : COLORS.GLOBE.event.default));
  }

  //DO NOT AUTOROTATE the globe
  rotateOnStart = false;

  stepAnimation = (year) => {
    if (year) updateCircles(year);
    if (!playing) return;
    const y = updateSlider();

    //update circles
    updateCircles(y);

    animationFrame = setTimeout(stepAnimation, playIntervalMs);
    }
}







//PRECOMPUTARE LE  CUMULATE
//DIFFERENZIARE L'ULDATE DEL GLOBE CON IL STEP ANIMATION
function globe_group(svg) {
  rotateOnStart = true;

  // =============================
  // STEP ANIMATION (timeline)
  // =============================
  stepAnimation = () => {
    if (!playing) return;
    updateSlider();
    animationFrame = setTimeout(stepAnimation, playIntervalMs);
  };

  // =============================
  // PRECOMPUTE CUMULATIVE DATA
  // =============================
  if (!window.group_cumulate_country) {
    const result = {};
    const data = window.globe_group_data;

    // Aggregate per country / group / year
    Object.entries(data).forEach(([group, years]) => {
      Object.entries(years).forEach(([yearStr, yearData]) => {
        const year = +yearStr;

        yearData.countries.forEach(({ country, count }) => {
          if (!result[country]) result[country] = {};
          if (!result[country][group]) result[country][group] = {};

          result[country][group][year] =
            (result[country][group][year] || 0) + count;
        });
      });
    });

    // Convert yearly counts → cumulative timeline
    Object.values(result).forEach(groupMap => {
      Object.values(groupMap).forEach(yearMap => {
        let acc = 0;
        Object.keys(yearMap)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach(y => {
            acc += yearMap[y];
            yearMap[y] = acc;
          });
      });
    });

    window.group_cumulate_country = result;
  }

  const groupData = window.group_cumulate_country;

  // =============================
  // OPACITY SCALE (GLOBAL)
  // =============================
  const MAX_CUMULATIVE = d3.max(
    Object.values(groupData),
    country =>
      d3.max(
        Object.values(country),
        yearMap => d3.max(Object.values(yearMap))
      )
  ) || 1;

  const opacityScale = d3.scaleSqrt()
    .domain([0, MAX_CUMULATIVE])
    .range([0.15, 1]);

  // =============================
  // UPDATE GLOBE (CALLED ON FRAME)
  // =============================
  updateGlobe = () => {
    if (!needsUpdate) return;
    needsUpdate = false;

    const year = +slider.property('value');

    g.selectAll('path')
      .attr('d', path)
      .each(function(d) {
        const countryName = d.properties.name;
        const entry = groupData[countryName];

        // No data for this country
        if (!entry) {
          d3.select(this)
            .style('fill', COLORS.GLOBE.country.fill)
            .style('opacity', 1)
            .attr('data-group', null)
            .attr('data-count', 0);
          return;
        }

        let dominantGroup = null;
        let dominantCount = 0;

        Object.entries(entry).forEach(([group, years]) => {
          const validYears = Object.keys(years)
            .map(Number)
            .filter(y => y <= year);

          if (!validYears.length) return;

          const latestYear = d3.max(validYears);
          const val = years[latestYear];

          if (val > dominantCount) {
            dominantCount = val;
            dominantGroup = group;
          }
        });

        // Still nothing active yet
        if (!dominantGroup) {
          d3.select(this)
            .style('fill', COLORS.GLOBE.country.fill)
            .style('opacity', 1)
            .attr('data-group', null)
            .attr('data-count', 0);
          return;
        }

        // Apply dominant group styling
        d3.select(this)
          .style('fill', COLORS.GLOBE.groups[dominantGroup] || COLORS.GLOBE.country.fill)
          .style('opacity', opacityScale(dominantCount))
          .attr('data-group', dominantGroup)
          .attr('data-count', dominantCount);
      });
  };

  // =============================
  // INITIAL RENDER
  // =============================
  needsUpdate = true;
  updateGlobe();
  stepAnimation = updateGlobe
}
