//valuies initialized once the SVG is created
let projection = null;
let path = null;
let g = null;
let countries = null;
let isFront = null;

let legendGlobe = null;
let playBtn = null;
let slider = null;
let title = null;


let sliderRange = [1969, 2020];

//ALLOW drag to rotate globe
let needsUpdate = false;
let updateGlobe = () => {};   // function to update globe rendering

let baseScale = 1;
const LEFT_CHART_LATERAL_PADDING = 10;
function computeBaseGlobeScale() {
  return Math.min(LEFT_CHART_WIDTH, LEFT_CHART_HEIGHT) / 2 - LEFT_CHART_LATERAL_PADDING;//padding to make the globe fit
}

let rotateOnStart = true;
let isRotating = false;
let rotationSpeed = 0.4; // degrees per frame

let playing = false;
let currentIndex = 0;
const years = d3.range(1969, 2021);
let playIntervalMs = 500;
let animationFrame = null;

let transitionDurationMs = 500;

// Animate slider from current value to target value over duration ms
function animateSliderTo(targetValue, duration = transitionDurationMs) {
  const startVal = +slider.property('value');
  const startTime = performance.now();
  
  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = t; // linear
    const currentVal = Math.round(startVal + (targetValue - startVal) * eased);
    
    title.property('value', currentVal);
    slider.property('value', currentVal);
    
    if (t < 1) {
      requestAnimationFrame(animate);
      stepAnimation(false); stepAnimationRight(false);
    }
  }
  requestAnimationFrame(animate);
}

let stepAnimation = () => {}; //function to step animation (optional year param)
let stepAnimationRight = () => {}; //function to step right animation (optional year param)


function loopAnimation() {
  if (!playing) return;

  updateSlider();
  stepAnimation(); stepAnimationRight();

  animationFrame = setTimeout(loopAnimation, playIntervalMs);
}

function startAnimation() {
  if (animationFrame) {
    clearTimeout(animationFrame);
    animationFrame = null;
  }

  playing = true;
  playBtn.text('❚❚');
  currentIndex = years.indexOf(+slider.property('value'));
  if (currentIndex < 0 || years[currentIndex] >= sliderRange[1]) currentIndex = 0;
  if (rotateOnStart) isRotating = true;

  loopAnimation();
}

function stopAnimation() {
  playBtn.text('▶');
  isRotating = false;

  playing = false;
  if (animationFrame) {
    clearTimeout(animationFrame);
    animationFrame = null;
  }
}

let timeAxisBinning = 1; //years per tick
function updateSlider() {
  currentIndex+=timeAxisBinning;

  const y = years[currentIndex] <= sliderRange[1] ? years[currentIndex] : sliderRange[1];
  title.property('value', y);
  animateSliderTo(y, playIntervalMs * 0.8);
  if (currentIndex >= years.length) {
    stopAnimation();
    return;
  }
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

  baseScale = computeBaseGlobeScale();

  //called once to initialize
  if (!window._draw_main_left_lastCall) {
    //initialize SVG
    svg.selectAll('*').remove();
    svg.attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${LEFT_CHART_WIDTH} ${LEFT_CHART_HEIGHT}`)

    //-----------------//
    //EDIT AFTER THIS LINE
    //-----------------//

    //put everything in a group
    g = svg.append('g').attr('class', 'main_group');

    //render once the globe
    window.globeRotation = [+10, -10];
    projection = d3.geoOrthographic()
      .scale(baseScale)
      .center([0, 0])
      .rotate(window.globeRotation)
      .translate([LEFT_CHART_WIDTH / 2, LEFT_CHART_HEIGHT / 2]);

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
    g.selectAll('path.country')
      .data(countries.features)
      .enter().append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', COLORS.GLOBE.country.fill)
      .attr('stroke', COLORS.GLOBE.country.stroke)
      .attr('stroke-width', 0.75)
      .attr('data-name', d => d.properties.name);

    // helper: returns true if point is on the visible (front) hemisphere
    isFront = (lon, lat) => {
      const rotate = projection.rotate(); // [lambda, phi, gamma]
      const center = [-rotate[0], -rotate[1]]; // center lon/lat
      return d3.geoDistance([lon, lat], center) <= Math.PI / 2;
    };

    legendGlobe = d3.select('#globe_color_map');
    createLegendGlobe();
    playBtn = d3.select('#timeline_play_btn');
    slider = d3.select('#timeline_year_slider');
    title = d3.select('#year_title');

    // --- Slider input handler ---
    slider.on('input', function () {
      if (playing) stopAnimation();

      const year = +this.value;
      title.property('value', year);
      stepAnimation(false); stepAnimationRight(false);
    });

    playBtn.on('click', function () {
      playing ? stopAnimation() : startAnimation();
    });



    //----------//
    // Enable drag to rotate globe
    //----------//
    const drag = d3.drag()
    .filter(function(event) {
      const se = event.sourceEvent;
      if (!se) return true;
      // If this is a touch event, only allow drag when there's a single touch
      if (se.touches) return se.touches.length === 1;
      // If this is a PointerEvent, allow only mouse/pen (not multi-touch)
      if (se.pointerType) return se.pointerType === 'mouse' || se.pointerType === 'pen';
      return true;
    })
    .on('drag', function (event) {
      const rotate = projection.rotate();
      let k = 50 / projection.scale();
      const limitAngle = [-30,30];

      let nextY = rotate[1] - event.dy * k;
      if (nextY > limitAngle[1]) nextY = limitAngle[1];
      if (nextY < limitAngle[0]) nextY = limitAngle[0];

      window.globeRotation = [rotate[0] + event.dx * k, nextY];
      
      projection.rotate(window.globeRotation);
      needsUpdate = true;
      isRotating = false;
      requestAnimationFrame(updateGlobe);
    });
    
    // Attach drag to SVG
    svg.call(drag);

    // Ensure the SVG allows pointer/touch gestures to be handled (enables pinch-to-zoom)
    svg.style('touch-action', 'none');

    //----------//
    // Enable zoom to scale globe
    //----------//
    baseScale = projection.scale(); // store initial scale
    const zoom = d3.zoom()
      .scaleExtent([0.85, 4]) // keep lower bound at initial scale (k >= 1)
      .on('zoom', function (event) {
        projection.scale(baseScale * event.transform.k);
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
  //save last call params for resize
  window._draw_main_left_lastCall = [categoryInfo, containerId];

  let nextFn = globe_default;
    
    timeAxisBinning = 1;
    sliderRange = [1969, 2020];

    switch (currentCat) {
      case 'group':
        sliderRange = [1975, 2020];
        nextFn = globe_group;
        break;
        case 'attack':
          nextFn = globe_attack;
          sliderRange = [1969, 2020];
        break;
      case 'target':
        nextFn = globe_target;
        timeAxisBinning = 5;
        sliderRange = [1974, 2019];
        break;
    }

    slider.property('min', sliderRange[0]);
    slider.property('max', sliderRange[1]);
    slider.property('step', timeAxisBinning);
    if (slider.property('value') > sliderRange[0]) {
      animateSliderTo(sliderRange[0], transitionDurationMs);
    }

  setTimeout(() => {
    if (slider.property('value') >= sliderRange[0]) {
      animateSliderTo(sliderRange[0], transitionDurationMs);
    }
      //if the category changed, reset the globe to default
    if (currentCat !== previousCat) {
      stopAnimation();
      //remove all tooltips and interactions
      g.selectAll('path.country')
        .on('click', () => { })
        .on('mousemove', () => { })
        .on('mouseout', () => { })
        .attr('cursor', 'default');

      if (previousCat === null) { //remove hexbins
        g.selectAll('.tassel-bin')
          .transition().duration(transitionDurationMs)
          .attr('opacity', 0)
          .on('end', function () { d3.select(this).remove(); });

        hideColormapLegend(true); //hide legend
        d3.select("body").select(".tassel-tooltip").remove()


      } else if (previousCat === 'group') { //remove group coloring
        g.selectAll('path.country').attr('d', path)
          .transition().duration(transitionDurationMs)
          .attr('fill', COLORS.GLOBE.country.fill);

        d3.select("body").select("#globe-tooltip").remove()

      } else if (previousCat === 'attack') {
        g.selectAll('path.country').attr('d', path)
          .transition().duration(transitionDurationMs)
          .attr('fill', COLORS.GLOBE.country.fill);

        d3.select("body").select("#globe-tooltip").remove()        
      } else if (previousCat === 'target') {
        g.selectAll('defs.neon-defs').remove(); 
        g.select('g.target-balls') 
          .transition().duration(transitionDurationMs)
          .attr('opacity', 0)
          .on('end', function () { d3.select(this).remove(); });
      }
    }


    nextFn();    
    stepAnimation(true);
  }, transitionDurationMs);
}