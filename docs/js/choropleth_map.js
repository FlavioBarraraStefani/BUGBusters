// choropleth_map.js

function drawChoroplethMap(rawData) {
    (async function () {
        const chartContainer = d3.select("#choropleth_map_svg");
        const tooltip = d3.select("#choropleth_map_tooltip");
        const legendContainer = d3.select("#choropleth_map_legend");

        // Pulizia
        chartContainer.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
        tooltip.style("display", "none");

        if (!Array.isArray(rawData) || !rawData.length) {
            chartContainer.html("<div class='text-center mt-5'>Nessun dato disponibile.</div>");
            return;
        }

        // --- Configurazione Dimensioni ---
        const node = chartContainer.node();
        const width = node.getBoundingClientRect().width || 800;
        
        // MODIFICA QUI: Altezza aumentata a 600 per massimizzare la visibilità
        const height = 600; 

        // --- Dati ---
        const dataMap = new Map();
        
        const normalize = (str) => {
            if (!str) return "";
            return str.toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .replace("governorate", "")
                .replace("province", "")
                .replace(/^al/, "")
                .replace("al", "");
        };

        rawData.forEach(d => {
            if (d.provstate) {
                const key = normalize(d.provstate);
                const val = +d.nkill || 0;
                dataMap.set(key, (dataMap.get(key) || 0) + val);
            }
        });

        // Scala a Intervalli
        const domains = [100, 500, 1000, 2500, 5000];
        const colors = ["#fee2e2", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];

        const colorScale = d3.scaleThreshold()
            .domain(domains)
            .range(colors);

        // --- Caricamento Mappa ---
        let geoData;
        try {
            const loadedData = await d3.json("assets/iraq.json");
            if (loadedData.objects) {
                const objectKey = Object.keys(loadedData.objects)[0]; 
                geoData = topojson.feature(loadedData, loadedData.objects[objectKey]);
            } else {
                geoData = loadedData;
            }
        } catch (err) {
            console.error(err);
            chartContainer.html("<div style='color:red; text-align:center;'>Errore caricamento assets/iraq.json</div>");
            return;
        }

        // --- SVG ---
        const svg = chartContainer.append("svg")
            .attr("viewBox", [0, 0, width, height])
            .style("width", "100%")
            .style("height", "auto")
            .style("background", "#f5f5f5");

        // Proiezione: fitExtent ottimizzato per riempire tutto lo spazio.
        // Margini: [[10, 50], [width-10, height-10]]
        // 10px a sinistra/destra, 50px in alto (per il titolo), 10px in basso.
        const projection = d3.geoMercator().fitExtent([[10, 50], [width - 10, height - 10]], geoData);
        const geoPath = d3.geoPath().projection(projection);

        // Titolo
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("class", "map-title")
            .text("IRAQ");

        // Layers
        const g_map = svg.append("g").attr("id", "layer-map");   
        const g_text = svg.append("g").attr("id", "layer-text"); 

        g_map.style("filter", "drop-shadow(0px 5px 5px rgba(0,0,0,0.2))");

        // 1. REGIONI
        g_map.selectAll("path.region")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("class", "region")
            .attr("d", geoPath)
            .attr("fill", d => {
                const mapName = d.properties.NAME_1 || d.properties.name || ""; 
                const cleanName = normalize(mapName);
                let val = dataMap.get(cleanName);

                if (val === undefined) {
                    for (let [k, v] of dataMap) {
                        if (cleanName.includes(k) || k.includes(cleanName)) {
                            val = v; break;
                        }
                    }
                }
                d.properties.finalVal = val || 0;
                d.properties.finalName = mapName;
                
                return (val && val > 0) ? colorScale(val) : "#ffffff";
            })
            .on("mouseover", function(event, d) {
                const val = d.properties.finalVal;
                const name = d.properties.finalName;
                
                tooltip
                    .style("display", "block")
                    .style("opacity", 1)
                    .html(`
                        <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid #ccc;">${name}</div>
                        <div>Morti: <span style="color:#d32f2f; font-weight:bold;">${d3.format(",")(val)}</span></div>
                    `);
                
                d3.select(this).raise(); 
            })
            .on("mousemove", function(event) {
                const [x, y] = d3.pointer(event, chartContainer.node());
                tooltip
                    .style("left", (x + 15) + "px")
                    .style("top", (y + 15) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("display", "none");
            });

        // 2. TESTO
        g_text.selectAll("text.region-label")
            .data(geoData.features)
            .enter()
            .append("text")
            .attr("class", "region-label")
            .attr("transform", function(d) {
                const centroid = geoPath.centroid(d);
                if (!centroid[0] || !centroid[1]) return "translate(-999,-999)";
                return `translate(${centroid[0]},${centroid[1]})`;
            })
            .text(d => {
                let name = d.properties.NAME_1 || d.properties.name;
                return name ? name.replace(" Governorate", "").replace("Province", "") : "";
            })
            .style("display", function(d) {
                 // Mostriamo tutto tranne le aree veramente minuscole
                 return (geoPath.area(d) < 300) ? "none" : "block"; 
            });

        // Legenda
        renderDiscreteLegend(legendContainer, domains, colors);

    })();
}

function renderDiscreteLegend(container, domains, colors) {
    container.html("");
    
    const wrapper = container.append("div")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("justify-content", "center")
        .style("gap", "15px")
        .style("font-size", "11px")
        .style("color", "#333");

    const items = [];
    items.push({ color: colors[0], label: `1 - ${d3.format(",")(domains[0])}` });

    for (let i = 0; i < domains.length - 1; i++) {
        items.push({ 
            color: colors[i+1], 
            label: `${d3.format(",")(domains[i])} - ${d3.format(",")(domains[i+1])}` 
        });
    }

    items.push({ 
        color: colors[colors.length - 1], 
        label: `> ${d3.format(",")(domains[domains.length - 1])}` 
    });

    items.forEach(item => {
        const entry = wrapper.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "5px");

        entry.append("div")
            .style("width", "15px")
            .style("height", "15px")
            .style("background-color", item.color)
            .style("border", "1px solid #ccc")
            .style("border-radius", "2px");

        entry.append("span").text(item.label);
    });
}
