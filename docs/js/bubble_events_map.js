function drawBubbleEventsMap(rawData) {
    (async function () {
        const chartSvgDiv = d3.select("#bubble_events_map_svg");
        const legendDiv = d3.select("#bubble_events_map_legend");
        const chartWrapper = d3.select("#bubble_events_map_chart");

        // Clear old
        chartSvgDiv.selectAll("*").remove();
        legendDiv.selectAll("*").remove();
        d3.select("#hexgrid_controls").remove();

        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.warn("[drawBubbleEventsMap] empty data");
            return;
        }

        // Parse data
        const data = rawData.map(d => ({
            lat: +d.lt,
            lon: +d.lg,
            kill: Math.max(+d.k || 0, 0),
            year: +d.y
        })).filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon) && Number.isFinite(d.year));

        if (data.length === 0) return;

        // Load GeoJSON
        let afg;
        try { afg = await d3.json("assets/afghanistan.json"); }
        catch (err) { console.error(err); return; }

        const LEGEND_WIDTH_PX = 100;
        const svgHeight = 450;
        chartWrapper.style("position", "relative");

        // --- Controls ---
        const controls = chartSvgDiv.append("div")
            .attr("id", "hexgrid_controls")
            .style("width", "90%")
            .style("margin", "0 auto")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "center")
            .style("padding-bottom", "6px");

        // Title
        const title = controls.append("div")
            .attr("id", "bubble_events_map_title")
            .style("font-weight", 700)
            .style("font-size", "18px")
            .style("margin-bottom", "6px")
            .style("text-align", "center");

        // Controls row (play + slider)
        const controlsRow = controls.append("div")
            .attr("id", "hexgrid_controls_row")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "8px")
            .style("width", `calc(100% - ${LEGEND_WIDTH_PX}px)`)
            .style("max-width", `calc(1000px - ${LEGEND_WIDTH_PX}px)`);

        const playBtn = controlsRow.append("button")
            .attr("id", "hex_play_btn")
            .text("▶ Play")
            .style("min-width", "72px")
            .style("padding", "6px 10px")
            .style("cursor", "pointer");

        const slider = controlsRow.append("input")
            .attr("type", "range")
            .attr("id", "hex_year_slider")
            .style("flex", "1");

        // --- SVG ---
        const containerWidth = chartSvgDiv.node().getBoundingClientRect().width || 900;
        const svg = chartSvgDiv.append("svg")
            .attr("viewBox", [0, 0, containerWidth, svgHeight])
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block");

        const mapG = svg.append("g").attr("class", "map-layer");
        const pointsG = svg.append("g").attr("class", "points-layer");

        const projection = d3.geoNaturalEarth1().fitSize([containerWidth, svgHeight], afg);
        const geoPath = d3.geoPath(projection);

        mapG.append("path")
            .datum(afg)
            .attr("d", geoPath)
            .attr("fill", "#fcfcfc")
            //.attr("fill", "#ffffff")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 1);
            

        // --- Radius scale ---
        const maxKill = d3.max(data, d => d.kill) || 1;
        const rScale = d3.scaleSqrt().domain([0, maxKill]).range([2, 50]);

        // --- Circles ---
        const circles = pointsG.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d.lon, d.lat])[0])
            .attr("cy", d => projection([d.lon, d.lat])[1])
            .attr("r", 0)
            .attr("opacity", 0)
            .attr("fill", "none")
            .attr("stroke-width", 1);

        circles.each(d => d._r = rScale(d.kill));

        // --- Precompute circles by year ---
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
        const circlesByYear = {};
        years.forEach(y => {
            circlesByYear[y] = circles.filter(d => d.year <= y);
        });

        let currentIndex = 0;
        let playing = false;
        let animationFrame = null;
        const playIntervalMs = 600;

        slider.attr("min", 0)
            .attr("max", Math.max(0, years.length - 1))
            .attr("step", 1)
            .property("value", currentIndex)
            .on("input", function () {
                if (playing) stopAnimation();
                currentIndex = +this.value;
                const y = years[currentIndex];
                title.text(`Deadly attacks: ${y}`);
                updateCircles(y, true);
            });

        // --- Play button ---
        playBtn.on("click", function () {
            if (playing) stopAnimation();
            else startAnimation();
        });

        function startAnimation() {
            playing = true;
            playBtn.text("❚❚ Pause");
            if (currentIndex >= years.length - 1) currentIndex = 0;
            stepAnimation();
        }

        function stopAnimation() {
            playing = false;
            playBtn.text("▶ Play");
            if (animationFrame) cancelAnimationFrame(animationFrame);
        }

        function stepAnimation() {
            if (!playing) return;
            currentIndex++;
            if (currentIndex >= years.length) { stopAnimation(); return; }
            slider.property("value", currentIndex);
            const y = years[currentIndex];
            title.text(`Attacks in ${y} - Total victims: ${d3.sum(data.filter(d => d.year <= y), d => d.kill) }`);

            updateCircles(y); // animate circles
            animationFrame = setTimeout(() => requestAnimationFrame(stepAnimation), playIntervalMs);
        }


        // --- Update circles ---
        function updateCircles(year) {

            circles.transition().duration(300)
                .attr("r", d => (d.year <= year ? d._r : 0))
                .attr("opacity", d => (d.year <= year ? 0.9 : 0))
                .attr("stroke", d =>   d.year === year ? "#444" : "#cecece") 
        }



        // --- Initial render ---
        const initialYear = years[0];
        title.text(`Deadly attacks: ${initialYear}`);
        updateCircles(initialYear, false);

        // --- Legend ---
        legendDiv.style("position", "absolute")
            .style("right", "8px")
            .style("top", "50%")
            .style("transform", "translateY(-50%)")
            .style("width", `${LEGEND_WIDTH_PX}px`)
            .style("pointer-events", "none");

        const legendVals = [
            Math.max(1, Math.round(maxKill * 0.05)),
            Math.max(1, Math.round(maxKill * 0.20)),
            Math.max(1, Math.round(maxKill * 0.40)),
            Math.max(1, Math.round(maxKill * 0.70)),
            Math.max(1, Math.round(maxKill * 1.0))
        ];

        const legendWrap = legendDiv.append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "center")
            .style("gap", "12px");

        const fmt = d3.format(",");
        legendVals.forEach(v => {
            const row = legendWrap.append("div")
                .style("display", "flex")
                .style("flex-direction", "column")
                .style("align-items", "center");
            row.append("div")
                .style("width", `${rScale(v) * 2}px`)
                .style("height", `${rScale(v) * 2}px`)
                .style("border-radius", "50%")
                .style("border", "1.2px solid #000")
                .style("background", "none");
            row.append("div")
                .style("font-size", "12px")
                .text(`${fmt(v)} killed`);
        });

    })();
}
