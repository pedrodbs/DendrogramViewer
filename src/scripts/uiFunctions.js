/**
 * @file uiFunctions.js
 * 
 * Copyright (c) 2018 Pedro Sequeira (pedrodbs@gmail.com)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @version 1.0
 * @author  Pedro Sequeira (pedrodbs@gmail.com)
 * @updated 05/17/2018
 * @link    https://github.com/pedrodbs/DendrogramViewer
 *
 */


// #region Json file loading

/**
 * Reads the json dendrogram data from the given file.
 * @param   {Array}   files     The files retrieved from the input-file control. The first file is loaded.
 */
function loadFile(files) {
    // checks file
    if (files.length > 0) {
        const file = files[0];
        console.info(`Reading Json dendrogram data from file ${file.name}...`);
        window.fileName = file.name;

        // reads file as json
        const reader = new FileReader();
        reader.onload = function (event) {
            // reads data and loads tree
            const clusterJsonObj = JSON.parse(event.target.result);
            window.readData(clusterJsonObj);
            return true;
        };
        reader.readAsText(file);
    }
    return false;
}

/**
 * Reads the json dendrogram data from the file provided in the URL parameter.
 */
function loadFromUrl() {
    console.info(`Reading Json dendrogram data from file ${window.fileName}...`);
    d3.json(window.fileName,
        function (error, clusterJsonObj) {
            if (error) {
                console.error(error);
                return false;
            }

            // reads root element from json
            window.root = clusterJsonObj;

            // reads data and loads dendrogram
            window.readData(clusterJsonObj);

            return true;
        });
}

// #endregion


// #region Initialization methods

/**
 * Initializes the whole user interface for the dendrogram area by creating all the SVG elements.
 */
function initUI() {

    // creates d3 cluster layout
    window.cluster = d3.layout.cluster()
        .size([window.height, window.width - 2 * window.treeMargin]);

    // adds main svg
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
        .style("fill", "none");
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
    const select = document.getElementById("color-scheme-select");
    for (let key in window.colorPaletteOptions) {
        select.options[select.options.length] = new Option(window.colorPaletteOptions[key], key);
    }

    //reads data and initializes graph
    loadFromUrl();
}

/**
 * Reads all dendrogram / clustering information from the given Json object.
 * @param {object}  clusterJsonObj  The Json object containing all the dendrogram / clustering information.
 */
function readData(clusterJsonObj) {
    if (window.isNull(clusterJsonObj)) {

        window.update();
        return false;
    } else {

        // resets variables
        window.resetVars();

        // sets root 
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

        console.info(`Dissimilarity in [${window.dMin},${window.dMax}]`);
        console.info(`Num. cluster leafs: ${window.numClusterLeafs}`);

        // changes title
        document.title = `Clustering Dendrogram Visualizer - ${window.fileName}`;

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

        return true;
    }
}

/**
 * Simply converts the node structural information and that of its children so to be compatible with D3.
 * @param {object} node The D3 node from which to update the data based on the json information.
 */
function getChildrenData(node) {

    // just replace children data from attribute 'c'
    node.children = node.c;
    node.c = null;

    if (!isNull(node.children)) {

        // iterate over children
        for (let j in node.children) {
            getChildrenData(node.children[j]);
        }

        // if no chilren, cluster is leaf
        if (node.children.length === 0)
            window.numClusterLeafs++;
    }
}

// #endregion


// #region Update html/ui methods

/**
 * Updates the whole interface.
 */
function update() {
    //console.info("Updating elements");

    //updates variables based on UI 
    updateVariables();

    //updates UI elements dimensions
    updatePageElements();

    //updates tree
    window.updateDendrogram();
}

/**
 * Updates the variables according to the html UI control values.
 */
function updateVariables() {

    //reads all options from the html elements
    window.showLabels = document.getElementById("labels-chkbox").checked;
    window.vertLayout = document.getElementById("vert-layout-chkbox").checked;
    window.grayscale = document.getElementById("grayscale-chkbox").checked;
    window.straightLinks = document.getElementById("straight-chkbox").checked;
    window.zoomDragable = document.getElementById("zoom-chkbox").checked;
    window.labelColor = document.getElementById("pick-color-btn").style.color;
}

/**
 * Updates the html UI elements according to the variables.
 */
function updatePageElements() {

    // calculates max dimensions
    const windowDiscount = 20;
    const optionsWidth = document.getElementById("save-button").offsetWidth + 20;
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
    window.backgRect.style("fill", `#${document.getElementById("color-picker").value}`);
    window.backgRect.attr("width", window.width)
    window.backgRect.attr("height", window.height)

    //updates threshold slider text and value
    document.getElementById("threshold-slider-value").innerHTML = window.clusterDistThreshold.toFixed(1);
    document.getElementById("threshold-slider").value = window.clusterDistThreshold;

    // counts num threshold clusters and update slider
    window.numThresholdClusters = countThresholdNodes(window.root);
    document.getElementById("num-clusters-slider-value").innerHTML = window.numThresholdClusters;
    document.getElementById("num-clusters-slider").value = window.numThresholdClusters;

    // reads selected palette and create colors
    const select = document.getElementById("color-scheme-select");
    const selectedPalette = select.options[select.selectedIndex].value;
    window.clusterColors = palette(selectedPalette, Math.max(1, window.numThresholdClusters)).reverse();
}

/**
 * Counts the number of nodes / clusters under the given node whose dissimilarity is below the defined threshold.
 * @param   {object}    node    The node from which to count the number of chidren.
 * @returns {Number}    The number of nodes / clusters under the given node whose dissimilarity is below the defined threshold.
 */
function countThresholdNodes(node) {

    // checks whether cluster is below distance threshold, stops search
    if (node.d <= window.clusterDistThreshold || isNull(node.children)) {
        return 1;
    }
    var count = 0;
    for (let j in node.children) {
        count += countThresholdNodes(node.children[j]);
    }
    return count;
}

// #endregion


// #region Update dendrogram methods

/**
 * Updates the dendrogram by first updating the positions, then the tree links, then the colors and finally the node
 * labels.
 */
function updateDendrogram() {

    window.updateAllPositions();

    window.updateAllLinks();

    window.updateAllColors();

    window.updateAllLabels();
}

/**
 * Updates the D3 tree links.
 */
function updateAllLinks() {

    if (!window.updateLinks) return;

    const thirdMargin = window.treeMargin / 3;
    var twoThirdMargin = thirdMargin * 2;
    var halfMargin = window.treeMargin / 2;

    // a line function for the tree's links
    var line = d3.svg.line()
        .x(function (point) { return window.vertLayout ? (twoThirdMargin + point.lx) : (halfMargin + point.ly); })
        .y(function (point) { return window.vertLayout ? (halfMargin + point.ly) : (twoThirdMargin + point.lx); });

    //creates tree diagonal (for children link plotting)
    const diagonal = window.straightLinks
        ? function (d) {
            // vertical layout, build dendrogram lines
            const points = [
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
        .attr("d", diagonal)
        .attr("fill", "none");

    window.updateLinks = false;
}

/**
 * Updates the positions of the D3 tree nodes, the dissimilarity scale and the threshold line.
 */
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

    //window.updateAllLinks();

    // update nodes positions
    window.svg.selectAll(".node")
        .attr("transform",
            function (d) {
                return `translate(${window
                    .vertLayout
                    ? (twoThirdMargin + d.x)
                    : (halfMargin + d.y)},${window.vertLayout ? (halfMargin + d.y) : (twoThirdMargin + d.x)})`;
            });

    // changes scale axis
    window.scaleSvg.attr("transform",
        `translate(${window.vertLayout ? thirdMargin : halfMargin},${window.vertLayout ? halfMargin : thirdMargin})`);
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
        .style("stroke", window.labelColor)
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
        .style("fill", window.labelColor)
        .text(String)
        .attr("x", function (d) { return window.vertLayout ? -2 * scaleLabelShift : window.distScale(d); })
        .attr("y", function (d) { return window.vertLayout ? window.invDistScale(d) : -scaleLabelShift; })
        .style("text-anchor", vertLayout ? "end" : "middle")
        .style("dominant-baseline", vertLayout ? "middle" : "ideographic");

    // updates threshold line
    window.updateThreshLine();

    window.updatePositions = false;
}

/**
 * Updates the dissimilarity threshold line position according to the defined variable.
 */
function updateThreshLine() {
    const thirdMargin = window.treeMargin / 3;
    const halfMargin = window.treeMargin / 2;

    // changes threshold indicative line
    window.threshLine
        .style("stroke", window.labelColor)
        .attr("x1",
            vertLayout ? thirdMargin : halfMargin + window.distScale(window.clusterDistThreshold))
        .attr("y1",
            vertLayout ? halfMargin + window.invDistScale(window.clusterDistThreshold) : thirdMargin)
        .attr("x2",
            vertLayout ? window.width - thirdMargin : halfMargin + window.distScale(window.clusterDistThreshold))
        .attr("y2",
            vertLayout ? halfMargin + window.invDistScale(window.clusterDistThreshold) : window.height - thirdMargin);
}

/**
 * Updates the D3 tree links and nodes, the scale, and dissmilarity threshold line colors.
 */
function updateAllColors() {
    if (!window.updateColors) return;

    // updates nodes color recursively
    window.clusterColorIdx = 0;
    updateNodeColor(window.root, window.strokeColor, true);

    window.svg.selectAll(".link")
        .style("stroke", function (d) { return getColor(d.target.color); });

    // adds node's circle
    window.svg.selectAll(".node")
        .select("circle")
        .style("stroke", function (d) { return getColor(d.color); })
        .style("fill", function (d) { return getColor(d.color); });

    // updates scale axis colors
    window.scaleLine
        .style("stroke", window.labelColor);

    window.scaleSvg.selectAll(".ticks")
        .style("stroke", window.labelColor);

    window.scaleSvg.selectAll(".label")
        .style("fill", window.labelColor);

    // updates threshold line
    window.updateThreshLine();

    window.updateColors = false;
}

/**
 * Gets the color value according to whether grayscale option is active or not.
 * @param {string}  colorValue  The color value in html hexadecimal format.
 * @returns The color value according to whether grayscale option is active or not.
 */
function getColor(colorValue) {
    return `#${window.grayscale ? getGrayscale(colorValue) : colorValue}`;
}

/**
 * Changes the color of the given D3 node and all of its children recursively.
 * @param {object}  node            The D3 node to be updated.
 * @param {string}  color           The color of the node in html hexadecimal format. 
 * @param {boolean} changeColor     Whether to change all colors.
 */
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
        for (let j in node.children) {
            updateNodeColor(node.children[j], color, changeColor);
        }
    }
}

/**
 * Updates the nodes labels text and its relative position.
 */
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
        .style("fill", window.labelColor)
        .attr("dx",
            function (d) {
                return (d.children ? labelShift : -labelShift);
            })
        .attr("dy",
            function (d) {
                return window.vertLayout ? (d.children ? -2 * labelShift : 0) : (d.children ? -labelShift : 0);
            })
        .attr("transform",
            function (d) { return `rotate(${window.vertLayout && !d.children ? 290 : 0})`; })
        .style("text-anchor",
            function (d) {
                return (d.children ? "start" : "end");
            })
        .style("dominant-baseline",
            function (d) {
                return window.vertLayout ? "central" : (d.children ? "alphabetic" : "middle");
            })
        .style("font-size", Math.max(3, (98 / window.numClusterLeafs)) + "px")
        .text(function (d) { return d.n; });
}

// #endregion


// #region Event handlers

window.onresize = function () {
    // resets internal variables for a refresh
    window.updatePositions = true;
    window.updateLinks = true;
    window.update();
};

/**
 * Resets the drag position and zoom level.
 */
function onResetDragZoom() {
    //resets translate and scale values
    window.svg.attr("transform", "translate(0,0)scale(1)");
}

/**
 * Toggles node label visibility and triggers an interface refresh.
 */
function onShowLabels() {
    window.showLabels = true;
    window.update();
}

/**
 * Toggles dendrogram grayscale / colors and triggers an interface refresh.
 */
function onGrayscale() {
    window.updateColors = true;
    window.update();
}

/**
 * Toggles vertical / horizontal layout and triggers an interface refresh.
 */
function onVertLayout() {
    window.updateColors = true;
    window.updateLinks = true;
    window.updatePositions = true;
    window.update();
}

/**
 * Toggles straight / round lines and triggers an interface refresh.
 */
function onStraightLinks() {
    window.updateLinks = true;
    window.update();
}

/**
 * Changes the color scheme used and triggers an interface refresh.
 */
function onColorSchemeChanged() {
    window.updateColors = true;
    window.update();
}

/**
 * Changes the dissimilarity threshold and triggers an interface refresh.
 */
function onThresholdChanged(value) {
    window.clusterDistThreshold = Number(value);
    window.updateColors = true;
    window.update();
}

/**
 * Changes the number of clusters and triggers an interface refresh.
 */
function onNumClustersChanged(value) {
    window.clusterDistThreshold = getThresholdFromNumClusters(value);
    window.updateColors = true;
    window.update();
}

/**
 * Gets the dissimilarity threshold value according to the number of clusters.
 * @param   {Number} numClusters  The number of clusters.
 * @returns {Number} The dissimilarity threshold value according to the number of clusters.
 */
function getThresholdFromNumClusters(numClusters) {
    if (numClusters < 2) {
        return window.root.d;
    }
    // gets all nodes and sorts them by dissimilarity/distance, descendingly
    const nodes = window.getAllNodes(window.root, []);
    nodes.sort(function (n1, n2) { return n2.d - n1.d; });
    // gets distance right below the node's distance
    console.info(numClusters)
    console.info(nodes.length)
    return Math.max(nodes[numClusters - 2].d - 0.001, 0);
}

/**
 * Gets all nodes by searching starting from the given D3 node.
 * @param {object}  node    The current D3 tree node from which to get all nodes.
 * @param {Array}   nodes   The array containing all nodes.
 */
function getAllNodes(node, nodes) {
    if (isNull(node.children)) {
        return nodes;
    }
    nodes.push(node);
    for (let j in node.children) {
        getAllNodes(node.children[j], nodes);
    }
    return nodes;
}

/**
 * Changes the zoom level.
 */
function onZoom() {
    // define the zoom function for the zoomable tree
    if (!window.zoomDragable) return;
    const scale = d3.event.scale;
    const dx = Math.max((1 - scale) * window.width, Math.min(0, d3.event.translate[0]));
    const dy = Math.max((1 - scale) * window.height, Math.min(0, d3.event.translate[1]));
    window.svg.attr("transform", `translate(${dx},${dy})scale(${scale})`);
}

// #endregion