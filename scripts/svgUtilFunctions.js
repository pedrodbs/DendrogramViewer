function saveImage() {

    var prefix = {
        xmlns: "http://www.w3.org/2000/xmlns/",
        xlink: "http://www.w3.org/1999/xlink",
        svg: "http://www.w3.org/2000/svg"
    };

    var svg = document.getElementById("innerSvg");
    var svgImgFile = getFileName(window.fileName);

    console.info("Saving " + svgImgFile + "...");

    // add empty svg element
    var emptySvg = window.document.createElementNS(prefix.svg, "svg");
    window.document.body.appendChild(emptySvg);
    var emptySvgDeclarationComputed = getComputedStyle(emptySvg);

    //opens url with svg content
    var svgInfo = getSvgInfo(svg, emptySvgDeclarationComputed);
    svgInfo.id = svgImgFile;
    download(svgInfo);

    //removes empty element
    window.document.body.removeChild(emptySvg);
}