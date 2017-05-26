function saveImage() {

    const prefix = {
        xmlns: "http://www.w3.org/2000/xmlns/",
        xlink: "http://www.w3.org/1999/xlink",
        svg: "http://www.w3.org/2000/svg"
    };

    const svg = document.getElementById("innerSvg");
    const svgImgFile = getFileName(window.fileName);

    console.info(`Saving ${svgImgFile}...`);

    // add empty svg element
    const emptySvg = window.document.createElementNS(prefix.svg, "svg");
    window.document.body.appendChild(emptySvg);
    const emptySvgDeclarationComputed = getComputedStyle(emptySvg);

    //opens url with svg content
    const svgInfo = getSvgInfo(svg, emptySvgDeclarationComputed);
    svgInfo.id = svgImgFile;
    download(svgInfo);

    //removes empty element
    window.document.body.removeChild(emptySvg);
}