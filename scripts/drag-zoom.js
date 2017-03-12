// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

function zoom() {
    // define the zoom function for the zoomable tree
    if (window.zoomDragable)
        window.svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function resetDragZoom() {
    //resets translate and scale values
    window.svg.attr("transform", "translate(0,0)scale(1)")
}