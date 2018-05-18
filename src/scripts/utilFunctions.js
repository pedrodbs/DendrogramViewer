/**
 * @file utilFunctions.js
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

/**
 * Clones the given object.
 * @param   {object} obj    The object to be cloned.
 * @returns {object} A clone of the given object.
 * @see     https://gist.github.com/jaxxreal/5916768
 */
function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0; i < obj.length; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Converts the given color to a grayscale color.
 * @param   {string}    colorValue  The color to be converted, in hexadecimal form.
 * @returns {string}    The converted grayscale color.
 */
function getGrayscale(colorValue) {
    const c = parseInt(colorValue, 16);
    const func = function (r, g, b) {
        g = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return [g, g, g];
    };
    return func(c >> 16, (c >> 8) & 255, c & 255).map(function (v) {
        v = Math.floor(v);
        v = Number(v > 0 ? (v < 255 ? v : 255) : 0).toString(16);
        return v.length === 1 ? `0${v}` : v;
    }).join("");
}

/**
 * Checks whether the given string is null, empty or just white-spaces.
 * @param   {string}    str     The string to be verified.
 * @returns {boolean}   Whether the given string is null, empty or just white-spaces.
 */
function isNullOrEmptyOrWhiteSpaces(str) {
    return isNull(str) || isEmpty(str) || isBlank(str) || str.isEmpty();
}

/**
 * Checks whether the given string is null.
 * @param   {string}    str     The string to be verified.
 * @returns {boolean}   Whether the given string is null.
 */
function isNull(myVar) {
    return myVar == null;
}

/**
 * Checks whether the given string is an empty string.
 * @param   {string}    str     The string to be verified.
 * @returns {boolean}   Whether the given string is an empty string.
 */
function isEmpty(str) {
    return (!str || 0 === str.length);
}

/**
 * Checks whether the given string is blank, i.e., just white-spaces.
 * @param   {string}    str     The string to be verified.
 * @returns {boolean}   Whether the given string is blank, i.e., just white-spaces.
 */
function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

String.prototype.isEmpty = function () {
    return (this.length === 0 || !this.trim());
};

/**
 * Gets the file name from the given path string.
 * @param   {string}    str     The string with the file path.
 * @returns {string}    The file name from the given path string.
 */
function getFileName(path) {
    return isNull(path) ? null : path.replace(/^.*[\\\/]/, '');
}

/**
 * Retrieves the given parameter's value from the given url.
 * @param   {string}    name    The name of the parameter to be retrieved.
 * @param   {string}    url     The url containing the parameter, or null so that the window's href is used.
 * @returns {string}    The parameter's value from the given url.
 */
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * Saves / downloads the SVG element in the given element to a file.
 * @param   {string}    elementID   The id of the element containing the SVG code.
 */
function saveImage(elementID) {

    const prefix = {
        xmlns: "http://www.w3.org/2000/xmlns/",
        xlink: "http://www.w3.org/1999/xlink",
        svg: "http://www.w3.org/2000/svg"
    };

    const svg = document.getElementById(elementID);
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