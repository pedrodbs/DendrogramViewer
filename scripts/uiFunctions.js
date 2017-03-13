function initUI() {

    //creates d3 cluster layout
    window.cluster = d3.layout.cluster()
        .size([window.height, window.width - 2 * window.treeMargin]);

    //adds main svg
    window.topSvg = d3.select("#container").append("svg")
        .attr("id", "topSvg")
        .call(zoomListener);

    // adds cluster svg
    window.svg = window.topSvg.append("svg:svg")
        .attr("id", "innerSvg");

    // adds a rectangle as a background
    window.backgRect = window.svg.append("rect")
        .attr("id", "backgRect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "none");
    document.getElementById("color-picker").value = "FFF";
    document.getElementById("pick-color-btn").style.color = "black";

    // adds threshold line
    window.threshLine = window.svg.append("line")
        .attr("class", "threshLine")
        .attr("id", "threshLine");

    // adds scale axis
    window.scaleSvg = window.svg.append("svg:g")
        .attr("id", "scaleSvg");
    window.scaleLine = window.scaleSvg.append("line")
        .attr("id", "scaleLine");

    // adds color options to select
    var select = document.getElementById("color-scheme-select");
    for (var key in window.colorPaletteOptions) {
        select.options[select.options.length] = new Option(window.colorPaletteOptions[key], key);
    }

    //reads data and initializes cluster
    readData();
}

window.onresize = function () {
    update();
};

function update() {
    //console.info("Updating elements");

    //updates variables based on UI 
    updateVariables();

    //updates UI elements dimensions
    updatePageElements();

    //updates tree
    window.updateDendrogram();
}

function updateVariables() {

    //reads all options from the html elements
    window.vertLayout = document.getElementById("vert-layout-chkbox").checked;
    window.grayscale = document.getElementById("grayscale-chkbox").checked;
    window.straightLinks = document.getElementById("straight-chkbox").checked;
    window.zoomDragable = document.getElementById("zoom-chkbox").checked;
    window.labelColor = document.getElementById("pick-color-btn").style.color;

    // reads selected palette
    var select = document.getElementById("color-scheme-select");
    var selectedPalette = select.options[select.selectedIndex].value;
    window.clusterColors = palette(selectedPalette, window.numClusterLeafs).reverse();
}

function updatePageElements() {

    // calculates max dimensions
    var windowDiscount = 20;
    var optionsWidth = document.getElementById("save-button").offsetWidth + 20;
    window.width = window.innerWidth - optionsWidth - windowDiscount;
    window.height = window.innerHeight - windowDiscount;

    //modifies divs dimensions
    document.getElementById("options-column").style.width = optionsWidth + "px";
    document.getElementById("container").style.width = window.width + "px";
    document.getElementById("container").style.height = window.height + "px";

    //updates d3 elements
    window.topSvg.attr("width", window.width).attr("height", window.height);
    window.svg.attr("width", window.width).attr("height", window.height);
    window.cluster.size(window.vertLayout ? [window.width, window.height] : [window.height, window.width]);
    window.backgRect.style("fill", "#" + document.getElementById("color-picker").value);
}

function readData() {

    console.info("Reading Json graph data from file " + window.fileName + "...");

    d3.json(window.fileName, function (error, clusterJsonObj) {
        
        // reads root element from json
        window.root = clusterJsonObj;

        // reads children data
        window.numClusterLeafs = 0;
        getChildrenData(clusterJsonObj);

        // gets min and max dissimilarity/distance
        window.cluster.nodes(window.root).forEach(function (nd) {
            if (!isNull(nd.d)) {
                nd.y = nd.d;
                if (nd.d > window.dMax) window.dMax = nd.d;
                if (nd.d < window.dMin) window.dMin = nd.d;
            }
        });

        console.info("Dissimilarity in [" + window.dMin + "," + window.dMax + "]");
        console.info("Num. cluster leafs: " + window.numClusterLeafs);

        // updates visual elements
        update();

        //adds the value slider
        var updateSlider = document.getElementById("slider-update");
        noUiSlider.create(updateSlider,
        {
            range: { 'min': 0, 'max': 1 },
            start: 1,
            step: 0.05
        });

        updateSlider.noUiSlider.on("update", window.updateSlider);
        document.getElementById("slider-update-value").innerHTML = window.dMax.toFixed(1);
    });
}

function getChildrenData(node) {

    // just replace children data from attribute 'c'
    node.children = node.c;
    node.c = null;

    if (!isNull(node.children)) {

        // iterate over children
        for (var j in node.children) {
            getChildrenData(node.children[j]);
        }

        // if no chilren, cluster is leaf
        if(node.children.length === 0)
            window.numClusterLeafs++;
    }
}

function updateNodeColor(node, color, changeColor) {

    // checks whether cluster is below distance threshold, change color
    if (changeColor && node.d <= window.clusterDistThreshold) {
        changeColor = false;
        color = window.clusterColors[window.clusterColorIdx];
        window.clusterColorIdx++;
    }
    node.color = color;

    // sets color of children recursively
    if (!isNull(node.children)) {
        for (var j in node.children) {
            updateNodeColor(node.children[j], color, changeColor);
        }
    }
}

function updateSlider(values, handle) {
    //updates text and threshold variable
    var value = window.dMin + ((window.dMax - window.dMin) * values[handle]);
    document.getElementById("slider-update-value").innerHTML = value.toFixed(1);
    window.clusterDistThreshold = value;

    // updates visual elements
    update();
}

function getColor(colorValue) {
    return "#" + (window.grayscale ? getGrayscale(colorValue) : colorValue);
}

function getGrayscale(colorValue) {
    var c = parseInt(colorValue, 16);
    var func = function(r, g, b) {
        g = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return [g, g, g];
    };
    return func(c >> 16, (c >> 8) & 255, c & 255).map(function(v) {
        v = Math.floor(v);
        v = Number(v > 0 ? (v < 255 ? v : 255) : 0).toString(16);
        return v.length === 1 ? "0" + v : v;
    }).join("");
}


function updateDendrogram() {

    // visually updates nodes
    window.nodes = window.cluster.nodes(window.root);
    window.links = window.cluster.links(window.nodes);

    // creates the scale range functions used to position the nodes according to dissimilarity / distance
    var margin = window.vertLayout ? window.treeMargin / 2 : window.treeMargin; 
    window.distScale = d3.scale.linear().domain([window.dMin, window.dMax]).range(
        [0, (window.vertLayout ? window.height : window.width) - 2 * margin]);
    window.invDistScale = d3.scale.linear().domain([window.dMax, window.dMin]).range(
        [0, (window.vertLayout ? window.height : window.width) - 2 * margin]);

    // updates node's relative distances
    window.nodes.forEach(function (nd) {
        if (!isNull(nd.d)) {
            nd.y = window.vertLayout ? window.invDistScale(nd.d) : window.distScale(nd.d);
        }
    });

    // updates nodes color recursively
    window.clusterColorIdx = 0;
    updateNodeColor(window.root, window.strokeColor, true);
    
    // a line function for the tree's links
    var line = d3.svg.line()
        .x(function (point) { return window.vertLayout ? point.lx : margin + point.ly; })
        .y(function (point) { return window.vertLayout ? margin + point.ly : point.lx; });

    //creates tree diagonal (for children link plotting)
    window.diagonal = window.straightLinks
        ? function(d) {
            var points = [ // vertical layout, build dendrogram lines
                { lx: d.source.x, ly: d.source.y },
                { lx: d.target.x, ly: d.source.y },
                { lx: d.target.x, ly: d.target.y }
            ];
            return line(points);
        }
        : d3.svg.diagonal().projection(function(d) {
            return window.vertLayout ? [d.x, margin + d.y] : [margin + d.y, d.x];
        });

    // sets link data
    window.svg.selectAll(".link").remove();
    window.svg.selectAll(".link")
        .data(window.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("stroke", function (d) { return getColor(d.target.color); })
        .attr("d", window.diagonal);

    // sets node data and translate nodes
    window.svg.selectAll(".node").remove();
    var node = window.svg.selectAll(".node")
        .data(window.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform",
            function(d) {
                return "translate(" +
                    (window.vertLayout ? d.x : (margin + d.y)) +
                    "," +
                    (window.vertLayout ? (margin + d.y) : d.x) +
                    ")";
            });

    // adds node's circle
    node.append("circle")
        .attr("stroke", function (d) { return getColor(d.color); })
        .style("fill", function (d) { return getColor(d.color); })
        .attr("r", window.nodeRadius);

    // positions label according to vertical layout and nodes' num. children
    var labelShift = window.nodeRadius * 2;
    node.append("text")
        .attr("fill", window.labelColor)
        .attr("dx",
            function(d) {
                return window.vertLayout ? (d.children ? labelShift : 0) : (d.children ? labelShift : -labelShift);
            })
        .attr("dy",
            function(d) {
                return window.vertLayout ? (d.children ? -2 * labelShift : 2 * labelShift) : (d.children ? -labelShift : 0);
            })
        .style("text-anchor",
            function(d) {
                return window.vertLayout ? (d.children ? "start" : "middle") : (d.children ? "start" : "end");
            })
        .style("dominant-baseline",
            function(d) {
                return window.vertLayout ? "central" : (d.children ? "alphabetic" : "middle");
            })
        .text(function (d) { return d.n; });

    // changes threshold indicative line
    window.threshLine
        .attr("stroke", window.labelColor)
        .attr("x1", vertLayout ? window.treeMargin / 2 : window.treeMargin + window.distScale(window.clusterDistThreshold))
        .attr("y1", vertLayout ? (window.treeMargin / 2) + window.invDistScale(window.clusterDistThreshold) : window.treeMargin / 3)
        .attr("x2", vertLayout ? window.width - (window.treeMargin / 2) : window.treeMargin + window.distScale(window.clusterDistThreshold))
        .attr("y2", vertLayout ? (window.treeMargin / 2) + window.invDistScale(window.clusterDistThreshold) : window.height - (window.treeMargin / 3));

    // changes scale axis
    window.scaleSvg.attr("transform", "translate(" + margin + "," + (window.vertLayout ? margin : margin/ 3) + ")");

    window.scaleLine
        .attr("stroke", window.labelColor)
        .attr("x1", vertLayout ? 0 : window.invDistScale(window.dMin))
        .attr("y1", vertLayout ? window.invDistScale(window.dMin) : 0)
        .attr("x2", vertLayout ? 0 : window.invDistScale(window.dMax))
        .attr("y2", vertLayout ? window.invDistScale(window.dMax) : 0);

    var tickShift = 5;
    window.scaleSvg.selectAll(".ticks").remove();
    window.scaleSvg.selectAll(".ticks")
        .data(window.distScale.ticks(window.numScaleTicks))
        .enter().append("line")
        .attr("class", "ticks")
        .attr("stroke", window.labelColor)
        .attr("x1", function(d) { return vertLayout ? -tickShift : window.distScale(d); })
        .attr("y1", function(d) { return vertLayout ? window.invDistScale(d) : -tickShift; })
        .attr("x2", function(d) { return vertLayout ? tickShift : window.distScale(d); })
        .attr("y2", function(d) { return vertLayout ? window.invDistScale(d) : tickShift; });

    var scaleLabelShift = 5;
    window.scaleSvg.selectAll(".label").remove();
    window.scaleSvg.selectAll(".label")
        .data(window.distScale.ticks(window.numScaleTicks))
        .enter().append("text")
        .attr("class", "label")
        .attr("fill", window.labelColor)
        .text(String)
        .attr("x", function (d) { return window.vertLayout ? - 2 * scaleLabelShift : window.distScale(d); })
        .attr("y", function (d) { return window.vertLayout ? window.invDistScale(d) : -scaleLabelShift; })
        .attr("text-anchor", vertLayout ? "end" : "middle")
        .attr("dominant-baseline", vertLayout ? "middle" : "ideographic");
}