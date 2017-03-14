/* 
* Based on the code in:
* http://www.meccanismocomplesso.org/en/dendrogramma-d3-parte1/
*/

function initUI() {

    //creates d3 cluster layout
    window.cluster = d3.layout.cluster()
        .size([window.height, window.width - 2 * window.treeMargin]);

    //adds main svg
    window.topSvg = d3.select("#container").append("svg")
        .attr("id", "topSvg");

    // adds overall svg
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
    window.updatePositions = true;
    window.updateLinks = true;
    window.update();
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

function onShowLabels() {
    window.showLabels = true;
    window.update();
}

function onGrayscale() {
    window.updateColors = true;
    window.update();
}

function onVertLayout() {
    window.updateColors = true;
    window.updateLinks = true;
    window.updatePositions = true;
    window.update();
}

function onStraightLinks() {
    window.updateLinks = true;
    window.update();
}

function onColorSchemeChanged() {
    window.updateColors = true;
    window.update();
}

function onThresholdChanged(value) {
    window.clusterDistThreshold = Number(value);
    window.updateColors = true;
    window.update();
}

function onNumClustersChanged(value) {
    window.clusterDistThreshold = window.getThresholdFromNumClusters(value);
    window.updateColors = true;
    window.update();
}

function onZoom() {
    // define the zoom function for the zoomable tree
    if (!window.zoomDragable) return;
    var scale = d3.event.scale;
    var dx = Math.max((1 - scale) * window.width, Math.min(0, d3.event.translate[0]));
    var dy = Math.max((1 - scale) * window.height, Math.min(0, d3.event.translate[1]));
    window.svg.attr("transform", "translate(" + dx + "," + dy + ")scale(" + scale + ")");
}


function updateVariables() {

    //reads all options from the html elements
    window.showLabels = document.getElementById("labels-chkbox").checked;
    window.vertLayout = document.getElementById("vert-layout-chkbox").checked;
    window.grayscale = document.getElementById("grayscale-chkbox").checked;
    window.straightLinks = document.getElementById("straight-chkbox").checked;
    window.zoomDragable = document.getElementById("zoom-chkbox").checked;
    window.labelColor = document.getElementById("pick-color-btn").style.color;
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
    window.cluster.size(window.vertLayout
        ? [window.width - window.treeMargin, window.height]
        : [window.height - window.treeMargin, window.width]);
    window.backgRect.style("fill", "#" + document.getElementById("color-picker").value);

    //updates threshold slider text and value
    document.getElementById("threshold-slider-value").innerHTML = window.clusterDistThreshold.toFixed(1);
    document.getElementById("threshold-slider").value = window.clusterDistThreshold;

    // counts num threshold clusters and update slider
    window.numThresholdClusters = countThresholdNodes(window.root);
    document.getElementById("num-clusters-slider-value").innerHTML = window.numThresholdClusters;
    document.getElementById("num-clusters-slider").value = window.numThresholdClusters;

    // reads selected palette and create colors
    var select = document.getElementById("color-scheme-select");
    var selectedPalette = select.options[select.selectedIndex].value;
    window.clusterColors = palette(selectedPalette, Math.max(1, window.numThresholdClusters)).reverse();
}

function countThresholdNodes(node) {

    // checks whether cluster is below distance threshold, stops search
    if (node.d <= window.clusterDistThreshold || isNull(node.children)) {
        return 1;
    }
    var count = 0;
    for (var j in node.children) {
        count += countThresholdNodes(node.children[j]);
    }
    return count;
}

function getAllNodes(node, nodes) {
    if (isNull(node.children)) {
        return nodes;
    }
    nodes.push(node);
    for (var j in node.children) {
        getAllNodes(node.children[j], nodes);
    }
    return nodes;
}

function getThresholdFromNumClusters(numClusters) {
    if (numClusters < 2) {
        return window.root.d;
    }
    // gets all nodes and sorts them by dissimilarity/distance, descendingly
    var nodes = window.getAllNodes(window.root, []);
    nodes.sort(function (n1, n2) { return n2.d - n1.d; });
    // gets distance right below the node's distance
    return nodes[numClusters-2].d - 0.01;
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
        window.nodes = window.cluster.nodes(window.root);
        window.links = window.cluster.links(window.nodes);
        window.nodes.forEach(function (nd) {
            if (!isNull(nd.d)) {
                nd.y = nd.d;
                if (nd.d > window.dMax) window.dMax = nd.d;
                if (nd.d < window.dMin) window.dMin = nd.d;
            }
        });
        window.clusterDistThreshold = window.dMax;

        console.info("Dissimilarity in [" + window.dMin + "," + window.dMax + "]");
        console.info("Num. cluster leafs: " + window.numClusterLeafs);

        // changes title
        document.title = "Clustering Dendrogram Visualizer - " + window.fileName;

        // changes sliders ranges
        document.getElementById("threshold-slider").min = window.dMin;
        document.getElementById("threshold-slider").max = window.dMax;
        document.getElementById("threshold-slider").step = (window.dMax - window.dMin) / window.numRangeSteps;

        document.getElementById("num-clusters-slider").min = 1;
        document.getElementById("num-clusters-slider").max = window.numClusterLeafs;
        document.getElementById("num-clusters-slider").step = 1;

        // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
        var zoomListener = d3.behavior.zoom()
            .scaleExtent([window.minZoom, Math.max(window.minZoom + 1, window.numClusterLeafs / window.maxZoomFactor)])
            .on("zoom", window.onZoom);
        window.topSvg.call(zoomListener);

        // sets link data
        window.svg.selectAll(".link")
            .data(window.links)
            .enter().append("path")
            .attr("class", "link");

        // sets node data and translate nodes
        window.svg.selectAll(".node").remove();
        var node = window.svg.selectAll(".node")
            .data(window.nodes)
            .enter().append("g")
            .attr("class", "node");

        // adds node's circle and text
        node.append("circle")
            .attr("r", window.nodeRadius);
        node.append("text");
        
        // updates visual elements
        update();
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

function resetDragZoom() {
    //resets translate and scale values
    window.svg.attr("transform", "translate(0,0)scale(1)");
}

function updateAllLinks() {

    if (!window.updateLinks) return;
    
    var thirdMargin = window.treeMargin / 3;
    var twoThirdMargin = thirdMargin * 2;
    var halfMargin = window.treeMargin / 2;

    // a line function for the tree's links
    var line = d3.svg.line()
        .x(function (point) { return window.vertLayout ? (twoThirdMargin + point.lx) : (halfMargin + point.ly); })
        .y(function (point) { return window.vertLayout ? (halfMargin + point.ly) : (twoThirdMargin + point.lx); });

    //creates tree diagonal (for children link plotting)
    var diagonal = window.straightLinks
        ? function (d) {
            var points = [ // vertical layout, build dendrogram lines
                { lx: d.source.x, ly: d.source.y },
                { lx: d.target.x, ly: d.source.y },
                { lx: d.target.x, ly: d.target.y }
            ];
            return line(points);
        }
        : d3.svg.diagonal().projection(function (d) {
            return window.vertLayout
                ? [twoThirdMargin + d.x, halfMargin + d.y]
                : [halfMargin + d.y, twoThirdMargin + d.x];
        });

    // updates links positions
    window.svg.selectAll(".link")
            .attr("d", diagonal);

    window.updateLinks = false;
}

function updateAllPositions() {

    if (!window.updatePositions) return;

    var thirdMargin = window.treeMargin / 3;
    var twoThirdMargin = thirdMargin * 2;
    var halfMargin = window.treeMargin / 2;

    // creates the scale range functions used to position the nodes according to dissimilarity / distance
    window.distScale = d3.scale.linear().domain([window.dMin, window.dMax]).range(
        [0, (window.vertLayout ? window.height : window.width) - window.treeMargin]);
    window.invDistScale = d3.scale.linear().domain([window.dMax, window.dMin]).range(
        [0, (window.vertLayout ? window.height : window.width) - window.treeMargin]);

    // updates node's relative distances
    window.nodes = window.cluster.nodes(window.root);
    window.nodes.forEach(function (nd) {
        if (!isNull(nd.d)) {
            nd.y = window.vertLayout ? window.invDistScale(nd.d) : window.distScale(nd.d);
        }
    });

    // update links positions
    window.updateAllLinks();

    // update nodes positions
    window.svg.selectAll(".node")
        .attr("transform",
            function(d) {
                return "translate(" +
                    (window.vertLayout ? (twoThirdMargin + d.x) : (halfMargin + d.y)) +
                    "," +
                    (window.vertLayout ? (halfMargin + d.y) : (twoThirdMargin + d.x)) +
                    ")";
            });

    // changes scale axis
    window.scaleSvg.attr("transform",
        "translate(" +
        (window.vertLayout ? thirdMargin : halfMargin) +
        "," +
        (window.vertLayout ? halfMargin : thirdMargin) +
        ")");
    window.scaleLine
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
        .attr("x1", function (d) { return vertLayout ? -tickShift : window.distScale(d); })
        .attr("y1", function (d) { return vertLayout ? window.invDistScale(d) : -tickShift; })
        .attr("x2", function (d) { return vertLayout ? tickShift : window.distScale(d); })
        .attr("y2", function (d) { return vertLayout ? window.invDistScale(d) : tickShift; });

    var scaleLabelShift = 5;
    window.scaleSvg.selectAll(".label").remove();
    window.scaleSvg.selectAll(".label")
        .data(window.distScale.ticks(window.numScaleTicks))
        .enter().append("text")
        .attr("class", "label")
        .attr("fill", window.labelColor)
        .text(String)
        .attr("x", function (d) { return window.vertLayout ? -2 * scaleLabelShift : window.distScale(d); })
        .attr("y", function (d) { return window.vertLayout ? window.invDistScale(d) : -scaleLabelShift; })
        .attr("text-anchor", vertLayout ? "end" : "middle")
        .attr("dominant-baseline", vertLayout ? "middle" : "ideographic");

    // updates threshold line
    window.updateThreshLine();

    window.updatePositions = false;
}

function updateThreshLine() {
    var thirdMargin = window.treeMargin / 3;
    var halfMargin = window.treeMargin / 2;

    // changes threshold indicative line
    window.threshLine
        .attr("stroke", window.labelColor)
        .attr("x1",
            vertLayout ? thirdMargin : halfMargin + window.distScale(window.clusterDistThreshold))
        .attr("y1",
            vertLayout ? halfMargin + window.invDistScale(window.clusterDistThreshold) : thirdMargin)
        .attr("x2",
            vertLayout ? window.width - thirdMargin : halfMargin + window.distScale(window.clusterDistThreshold))
        .attr("y2",
            vertLayout ? halfMargin + window.invDistScale(window.clusterDistThreshold) : window.height - thirdMargin);
}

function updateAllColors() {
    if (!window.updateColors) return;

    // updates nodes color recursively
    window.clusterColorIdx = 0;
    updateNodeColor(window.root, window.strokeColor, true);

    window.svg.selectAll(".link")
        .attr("stroke", function(d) { return getColor(d.target.color); });

    // adds node's circle
    window.svg.selectAll(".node")
        .select("circle")
        .attr("stroke", function(d) { return getColor(d.color); })
        .style("fill", function (d) { return getColor(d.color); });

    // updates scale axis colors
    window.scaleLine
        .attr("stroke", window.labelColor);

    window.scaleSvg.selectAll(".ticks")
        .attr("stroke", window.labelColor);

    window.scaleSvg.selectAll(".label")
        .attr("fill", window.labelColor);

    // updates threshold line
    window.updateThreshLine();

    window.updateColors = false;
}

function updateAllLabels() {

    if (!window.showLabels) {
        window.svg.selectAll(".node")
            .select("text").text("");
         return;
    }

    // positions label according to vertical layout and nodes' num. children
    var labelShift = window.nodeRadius * 2;
    window.svg.selectAll(".node")
        .select("text")
        .attr("fill", window.labelColor)
        .attr("dx",
            function(d) {
                return (d.children ? labelShift : -labelShift);
            })
        .attr("dy",
            function(d) {
                return window.vertLayout ? (d.children ? -2 * labelShift : 0) : (d.children ? -labelShift : 0);
            })
        .attr("transform", 
            function (d) { return "rotate(" + (window.vertLayout && !d.children ? 290 : 0) + ")";})
        .style("text-anchor",
            function(d) {
                return (d.children ? "start" : "end");
            })
        .style("dominant-baseline",
            function(d) {
                return window.vertLayout ? "central" : (d.children ? "alphabetic" : "middle");
            })
        .style("font-size", Math.max(3, (98 / window.numClusterLeafs)) + "px")
        .text(function (d) { return d.n; });
    console.info(98 / window.numClusterLeafs);
}

function updateDendrogram() {
    
    window.updateAllPositions();

    window.updateAllLinks();

    window.updateAllColors();

    window.updateAllLabels();
}