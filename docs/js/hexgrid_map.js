function drawHexgridMap(rawData) {
    (async function () {
        const tooltip = d3.select("#hexgrid_map_tooltip");
        const chartContainer = d3.select("#hexgrid_map_svg");
        const legendContainer = d3.select("#hexgrid_map_legend");

        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        tooltip.style("opacity", 0);

        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.warn("[drawHexgridMap] empty data");
            return;
        }

        // --- Normalize coordinates ---
        const data = rawData.map(d => {
            return { lat: d.lat, lon: d.long };
        }).filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));

        if (data.length === 0) {
            console.warn("[drawHexgridMap] no valid lat/lon rows");
            return;
        }

        // --- Load Afghanistan GeoJSON ---
        let afgFeature;
        try {
            afgFeature = await d3.json("assets/afghanistan.json");
        } catch (err) {
            console.error("[drawHexgridMap] Cannot load Afghanistan GeoJSON", err);
            return;
        }

        // --- Dimensions ---
        const node = chartContainer.node();
        const width = node.getBoundingClientRect().width || 900;
        const height = Math.max(420, Math.round(width * 0.6));

        const svg = chartContainer.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet");

        const zoomLayer = svg.append("g").attr("class", "zoom-layer");

        // --- Projection & path ---
        const projection = d3.geoNaturalEarth1().fitSize([width, height], afgFeature);
        const geoPath = d3.geoPath(projection);

        // --- Draw Afghanistan ---
        const baseMapG = zoomLayer.append("g").attr("class", "basemap");
        baseMapG.append("path")
            .datum(afgFeature)
            .attr("d", geoPath)
            .attr("fill", "#f3f4f6")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 0.6);

        // --- Project points ---
        const projected = data.map(d => {
            const [x, y] = projection([d.lon, d.lat]);
            return { x, y, lat: d.lat, lon: d.lon };
        }).filter(d => isFinite(d.x) && isFinite(d.y));

        if (projected.length === 0) {
            console.warn("[drawHexgridMap] no projected points");
            return;
        }

        // --- Hexbin generator (fixed radius 20) ---
        const hexRadius = 20;
        const hex = d3.hexbin()
            .radius(hexRadius)
            .extent([[0, 0], [width, height]]);

        const points = projected.map(p => [p.x, p.y, p]);
        const bins = hex(points);
        bins.forEach(b => b.count = b.length);

        // --- Color scale ---
        const maxCount = d3.max(bins, b => b.count) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, maxCount]);

        // --- Draw hexes ---
        const hexG = zoomLayer.append("g").attr("class", "hexbins");
        const hexPath = hexG.selectAll("path.hexbin-cell")
            .data(bins)
            .enter()
            .append("path")
            .attr("class", "hexbin-cell")
            .attr("d", hex.hexagon())
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill", d => colorScale(d.count))
            .attr("fill-opacity", 0.9)
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 0.35)
            .style("pointer-events", "none")
            .attr("opacity", 0);

        // --- Tooltip ---
        const fmt = d3.format(",");
        hexPath.on("mouseenter", function (event, d) {
            hexPath.classed("dimmed", b => b !== d);
            d3.select(this).raise();
            tooltip.transition().duration(120).style("opacity", 0.95);
            tooltip.html(`
                <div style="padding:6px 8px; font-size:13px;">
                    <div style="font-weight:600; margin-bottom:4px;">${fmt(d.count)} events</div>
                </div>
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        }).on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        }).on("mouseleave", function () {
            tooltip.transition().duration(150).style("opacity", 0);
            hexPath.classed("dimmed", false);
        });

        // --- Transition to appear ---
        hexPath.transition()
            .duration(350)
            .attr("opacity", 1)
            .on("end", function () { d3.select(this).style("pointer-events", "auto"); });

        // --- Legend ---
        const legendWrapper = legendContainer
            .style("display", "flex")
            .style("justify-content", "center")
            .style("gap", "12px")
            .style("margin-top", "10px")
            .style("align-items", "center");

        const nBuckets = 5;
        const thresholds = [];
        for (let i = 1; i <= nBuckets; i++) {
            thresholds.push(Math.round(d3.quantile(bins.map(b => b.count).sort(d3.ascending), i / (nBuckets + 1)) || 0));
        }
        const uniqThresholds = Array.from(new Set(thresholds)).filter(v => v > 0);
        const legendValues = uniqThresholds.length ? uniqThresholds : [Math.round(maxCount / 3), Math.round(maxCount / 2), maxCount];

        legendValues.forEach(v => {
            const sw = legendWrapper.append("div").attr("class", "legend-swatch");
            sw.append("div").attr("class", "box").style("background", colorScale(v));
            sw.append("div").attr("class", "legend-label").text(`${fmt(v)} events`);
        });

        legendWrapper.append("div")
            .attr("class", "legend-swatch")
            .style("margin-left", "8px")
            .append("div")
            .attr("class", "legend-label")
            .text("Hex radius = " + hexRadius + "px");

        // --- Zoom & pan (fixed hex radius) ---
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                // Only translate, do NOT scale hex grid
                zoomLayer.attr("transform", `translate(${event.transform.x},${event.transform.y})`);
                baseMapG.selectAll("path").attr("stroke-width", 0.6 / event.transform.k);
                hexG.selectAll("path").attr("stroke-width", 0.35); // constant stroke
            });
        svg.call(zoom);
    })();
}
