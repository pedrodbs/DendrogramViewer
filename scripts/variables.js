// ======================
// File input
// ======================
var fileNameParam = getParameterByName("file");
var fileName = !isNullOrEmptyOrWhiteSpaces(fileNameParam) ? fileNameParam : "data/test.json";


// ======================
// D3 cluster algorithm objects and svg elements
// ======================
var root,                                       // cluster root node
    cluster;                                    // the cluster tree algorithm

var topSvg,                                     // d3 main svg
    svg,                                        // d3 svg to contain all elements, including cluster tree
    backgRect,                                  // d3 background rectangle
    threshLine,                                 // d3 threshold line
    scaleSvg, scaleLine;                        // d3 elements for scale axis

var nodes, links;                               //the tree structure itself (nodes and links)

// ======================
// Update variables
// ======================
var updateColors = true;
var updatePositions = true;
var updateLinks = true;

// ======================
// Layout variables
// ======================

var width, height;                              // dendrogram window dimensions (auto updated)

var showLabels = false,                         // whether to show the nodes' labels
    vertLayout = true,                          // whether to display the tree horizontally or vertically
    straightLinks = false,                      // whether to draw straight links in tree
    clusterDistThreshold = 0,                   // the threshold for cluster dissimilarity/distance 
    numThresholdClusters = 0,                   // num. clusters under the threshold
    numClusterLeafs = 0,                        // num. clusters leafs, i.e., of size 1
    nodeRadius = 2,                             // radius of node
    numScaleTicks = 5,                          // num. of ticks for the scale axis
    numRangeSteps = 50,                         // num. of step values of the range sliders
    treeMargin = 100;                           // the margin (to the window) used to draw the dendrogram tree

var dMax = Number.MIN_VALUE;                    // dissimilarity variables
var dMin = Number.MAX_VALUE;

var invDistScale, distScale;                    // the node distance scale (x or y axis) functions

var minZoom = 1,                                // the minimum zoom scale
    maxZoomFactor = 20;                         // the ratio factor as the number num. leaf clusters

// ======================
// Coloring variables
// ======================

var grayscale = false,                          // whether link line colors appear in grayscale
    strokeColor = "bbb",                        // default link line stroke color
    labelColor = "black",                       // color of labels (auto-updated)
    clusterColorIdx = 0,                        // used to get color palette index
    clusterColors;                              // clusters color palette (updated according to selected option)

// ======================
// Color palettes
// ======================

// select options 
var colorPaletteOptions = {
    "tol-rainbow": "Tol's Rainbow",
    "tol": "Tol's Qualitative",
    "tol-dv": "Tol's Diverging",
    "cb-Blues": "ColorBrewer Blues",
    "cb-Greens": "ColorBrewer Greens",
    "cb-Reds": "ColorBrewer Reds",
    "cb-Accent": "ColorBrewer Accent",
    "cb-Pastel1": "ColorBrewer Pastel1",
    "cb-Set3": "ColorBrewer Set3",
    "cb-Paired": "ColorBrewer Paired",
    "rainbow": "HSV Rainbow",
    "sol-base": "Solarized Base"
};

function resetVars(){
    window.updateColors = true;
    window.updatePositions = true;
    window.updateLinks = true;
    window.dMax = Number.MIN_VALUE;
    window.dMin = Number.MAX_VALUE;
}