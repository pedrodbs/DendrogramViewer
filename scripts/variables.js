// ======================
// File input
// ======================
var fileNameParam = getParameterByName("file");
var fileName = !isNullOrEmptyOrWhiteSpaces(fileNameParam) ? fileNameParam : "data/test.json";


// ======================
// D3 cluster algorithm objects
// ======================
var root,                                       // cluster root node
    cluster,                                    // the cluster tree algorithm
    diagonal;                                   // tree diagonal (for children link plotting)

var nodes, links;                               //the tree structure itself (nodes and links)


// ======================
// Layout variables
// ======================

var width, height;                              // dendrogram window dimensions (auto updated)

var vertLayout = true,                          // whether to display the tree horizontally or vertically
    straightLinks = false,                      // whether to draw straight links in tree
    clusterDistThreshold = 0,                   // the threshold for cluster dissimilarity/distance 
    nodeRadius = 4,                             // radius of node
    numScaleTicks = 5,                          // num. of ticks for the scale axis
    treeMargin = 100;                           // the margin (to the window) used to draw the dendrogram tree

var dMax = Number.MIN_VALUE;                    // dissimilarity variables
var dMin = Number.MAX_VALUE;

var invDistScale, distScale;                    // the node distance scale (x or y axis) functions


// ======================
// Coloring variables
// ======================

var grayscale = false,                          // whether link line colors appear in grayscale
    strokeColor = "bbb",                        // default link line stroke color
    labelColor = "black",                       // color of labels (auto-updated)
    numClusterLeafs = 0,                        // num. clusters leafs, i.e., of size 1
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


// ======================
// Svg
// ======================
var topSvg,                                     // d3 main svg
    svg,                                        // d3 svg for d3 tree layout
    backgRect,                                  // d3 background rectangle
    threshLine,                                 // d3 threshold line
    scaleSvg, scaleLine;                        // d3 elements for scale axis