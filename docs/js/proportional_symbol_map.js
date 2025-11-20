// proportional_symbol_map.js
function drawProportionalSymbolMap(rawData) {
    (async function () {

        const tooltip = d3.select("#proportional_symbol_map_tooltip");
        const chartContainer = d3.select("#proportional_symbol_map_svg");
        const legendContainer = d3.select("#proportional_symbol_map_legend");

        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        tooltip.style("opacity", 0);

        if (!Array.isArray(rawData) || !rawData.length) {
            console.warn("[drawProportionalSymbolMap] empty data");
            return;
        }

        // --- helper: abbrevia nome gruppo solo per la legenda ---
        function abbreviateGroup(name) {
            if (!name || typeof name !== "string") return "";

            // 1) Rimuovi qualsiasi parte tra parentesi tonde
            let cleaned = name.replace(/\([^)]*\)/g, "").trim();

            // Se dopo la pulizia è vuoto, fallback al nome originale
            if (!cleaned) cleaned = name.trim();

            const parts = cleaned.split(/\s+/);

            // Se è una sola parola → tienila così com'è
            if (parts.length === 1) return parts[0];

            // stopwords da ignorare
            const stopwords = new Set(["of", "and", "the", "al", "bin", "in", "on", "for"]);

            // 2) Genera acronimo
            const letters = parts
                .filter(w => !stopwords.has(w.toLowerCase()))
                .map(w => w[0]?.toUpperCase());

            const acronym = letters.join("");

            // 3) fallback se acronimo troppo corto
            if (acronym.length < 2) {
                return parts[0]; // solo prima parola
            }

            return acronym;
        }

        // === Carica topojson mondo ===
        let world;
        try {
            world = await d3.json("assets/world-110m.json");
        } catch (err) {
            console.error("Cannot load world-110m.json", err);
            return;
        }

        const countries = topojson.feature(world, world.objects.countries);

        // === Data prep ===
        let data = rawData.map(d => ({
            country_code: +d.country,
            country_txt: d.country_txt,
            gname: d.gname,
            count: +d.eventid_count || 0
        }))
            .filter(d => d.count > 0);

        if (!data.length) {
            console.warn("[drawProportionalSymbolMap] no non-zero rows");
            return;
        }

        // --- Top 10 groups by global attacks ---
        const groupTotals = d3.rollup(
            data,
            v => d3.sum(v, d => d.count),
            d => d.gname
        );

        const topGroups = Array.from(groupTotals.entries())
            .sort((a, b) => d3.descending(a[1], b[1]))
            .slice(0, 10)
            .map(d => d[0]);

        // --- Color scale per top groups (gli altri grigi) ---
        const colorScale = d3.scaleOrdinal()
            .domain(topGroups)
            .range(d3.schemeTableau10);

        const OTHER_COLOR = "#d4d4d4";

        const bubbleColor = d =>
            topGroups.includes(d.gname) ? colorScale(d.gname) : OTHER_COLOR;

        // === Dimensioni & SVG ===
        const node = chartContainer.node();
        const containerWidth = node.getBoundingClientRect().width || 900;
        const width = containerWidth;
        const height = 450

        const svg = chartContainer.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet");

        // layer zoomabile
        const zoomLayer = svg.append("g").attr("class", "zoom-layer");

        // === Proiezione & path ===
        const projection = d3.geoNaturalEarth1()
            .fitSize([width, height], countries);

        const geoPath = d3.geoPath(projection);

        // --- Basemap ---
        const baseMapG = zoomLayer.append("g")
            .attr("class", "basemap");

        baseMapG.selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", geoPath)
            .attr("fill", "#f3f4f6")
            .attr("stroke", "#d1d5db")
            .attr("stroke-width", 0.5);

        // === Centroidi per paese ===
        const countryCentroids = new Map();
        countries.features.forEach(f => {
            const name = f.properties.name;
            const c = geoPath.centroid(f);
            countryCentroids.set(name, c);
        });

        const countryNameMap = {
            "United States": "United States of America",
            "Russia": "Russian Federation",
            "Czech Republic": "Czechia",
            "North Korea": "Dem. Rep. Korea",
            "South Korea": "Republic of Korea",
            "Syria": "Syrian Arab Republic",
            "Iran": "Iran (Islamic Republic of)",
            "Laos": "Lao People's Dem. Rep.",
            "Vietnam": "Viet Nam",
            "Bolivia": "Bolivia (Plurinational State of)",
            "Venezuela": "Venezuela (Bolivarian Republic of)",
            "Tanzania": "United Republic of Tanzania",
            "Macedonia": "North Macedonia"
            // aggiungi qui se trovi altri mismatch
        };

        function getCentroid(countryTxt) {
            const mapped = countryNameMap[countryTxt] || countryTxt;
            return countryCentroids.get(mapped) || null;
        }

        data.forEach(d => {
            d.centroid = getCentroid(d.country_txt);
        });

        data = data.filter(d => d.centroid);

        if (!data.length) {
            console.warn("[drawProportionalSymbolMap] all rows lost after centroid mapping");
            return;
        }

        // === Scala dimensione bubble ===
        const size = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.count)])
            .range([2, 30]);

        // Ordina per count crescente (le grandi sopra)
        const bubblesData = data.slice().sort((a, b) => d3.ascending(a.count, b.count));

        // === Disegna bolle ===
        const bubblesG = zoomLayer.append("g").attr("class", "bubbles");

        const bubbles = bubblesG.selectAll("circle.bubble")
            .data(bubblesData)
            .enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("cx", d => d.centroid[0])
            .attr("cy", d => d.centroid[1])
            .attr("r", 0)
            .attr("fill", d => bubbleColor(d))
            .attr("fill-opacity", 0.8)
            .attr("stroke", "#111827")
            .attr("stroke-width", 0.4)
            .style("pointer-events", "none");

        await bubbles.transition().duration(600)
            .attr("r", d => size(d.count))
            .end();

        bubbles.style("pointer-events", "auto");

        const fmt = d3.format(",.0f");

        // === Tooltip & hover ===
        bubbles
            .on("mouseenter", function (event, d) {
                bubbles.classed("dimmed_t", b => b !== d);
                d3.select(this).raise();
                tooltip.transition().duration(120).style("opacity", 0.95);
                tooltip.html(`
                    <div style="padding:6px 8px; font-size:13px;">
                        <div style="font-weight:600; margin-bottom:4px;">
                        ${d.country_txt}
                        </div>
                        <div><b>Group:</b> ${d.gname}</div>
                        <div><b>Attacks:</b> ${fmt(d.count)}</div>
                    </div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", function () {
                tooltip.transition().duration(150).style("opacity", 0);

                // remove all tooltip dimming
                bubbles.classed("dimmed_t", false);
            });



        // === Legend: colori gruppi (con acronimo) + Others ===
        const legendWrapper = legendContainer
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "10px")
            .style("margin-top", "12px");

        const colorLegend = legendWrapper.append("div")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("gap", "8px")
            .style("justify-content", "center");

        const legendGroups = topGroups.concat(["Others"]);

        const legendItems = colorLegend.selectAll(".legend-item")
            .data(legendGroups)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "inline-flex")
            .style("align-items", "center")
            .style("gap", "6px")
            .style("font-size", "12px")
            .style("cursor", d => d === "Others" ? "default" : "pointer");

        legendItems.append("span")
            .style("display", "inline-block")
            .style("width", "12px")
            .style("height", "12px")
            .style("border-radius", "50%")
            .style("background", d => d === "Others" ? OTHER_COLOR : colorScale(d));

        legendItems.append("span")
            .text(d => d === "Others" ? "Others" : abbreviateGroup(d))
            .append("title")
            .text(d => d); // tooltip HTML nativo con il nome completo

        // click su legenda per filtrare gruppo
        legendItems.on("click", (event, g) => {
            if (g === "Others") return;
            const item = d3.select(event.currentTarget);
            const isActive = item.classed("active");

            colorLegend.selectAll(".legend-item")
                .classed("active", false)
                .style("opacity", 1);

            if (!isActive) {
                item.classed("active", true);
                colorLegend.selectAll(".legend-item")
                    .style("opacity", d => (d === g || d === "Others") ? 1 : 0.3);

                bubbles.classed("dimmed_l", d => d.gname !== g);
                bubbles
                    .style("pointer-events", d => d.gname === g ? "auto" : "none");

            } else {
                bubbles.classed("dimmed_l", false);
                bubbles.style("pointer-events", "auto");
            }

        });

        // === Size legend (tre bolle affiancate, niente sovrapposizioni) ===
        const sizeLegendSvg = legendWrapper.append("svg")
            .attr("width", 260)
            .attr("height", 70);

        const countsSorted = bubblesData.map(d => d.count).sort(d3.ascending);
        const vSmall = d3.quantile(countsSorted, 0.25);
        const vMedium = d3.quantile(countsSorted, 0.5);
        const vLarge = d3.quantile(countsSorted, 0.9);

        const sizeValues = [vSmall, vMedium, vLarge].filter(v => Number.isFinite(v));

        const centerY = 35;
        const centersX = [60, 130, 200].slice(0, sizeValues.length);

        sizeValues.forEach((v, i) => {
            const r = size(v);
            const cx = centersX[i];

            sizeLegendSvg.append("circle")
                .attr("cx", cx)
                .attr("cy", centerY)
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", "#6b7280")
                .attr("stroke-width", 0.8);

            sizeLegendSvg.append("text")
                .attr("x", cx)
                .attr("y", centerY + r + 12)
                .attr("text-anchor", "middle")
                .attr("font-size", 11)
                .attr("fill", "#4b5563")
                .text(d3.format(",")(Math.round(v)));
        });

        sizeLegendSvg.append("text")
            .attr("x", 10)
            .attr("y", 14)
            .attr("font-size", 11)
            .attr("fill", "#4b5563")
            .text("Bubble size = number of attacks");

        // === Zoom & pan ===
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                const { k } = event.transform;
                zoomLayer.attr("transform", event.transform);
                // Mantieni gli spessori accettabili con lo zoom
                baseMapG.selectAll("path").attr("stroke-width", 0.5 / k);
                bubblesG.selectAll("circle").attr("stroke-width", 0.4 / k);
            });

        svg.call(zoom);

    })();
}