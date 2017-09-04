module.exports = (() => {
    //поиск относительных координат клика по canvas
    HTMLCanvasElement.prototype.relCoords = function (event) {
        let totalOffsetX = 0;
        let totalOffsetY = 0;
        let currentElement = this;
        do {
            totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
            totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        }
        while (currentElement = currentElement.offsetParent);
        return {
            x: Math.round((event.pageX - totalOffsetX) * (this.width / this.offsetWidth)),
            y: Math.round((event.pageY - totalOffsetY) * (this.height / this.offsetHeight))
        }
    };
})();