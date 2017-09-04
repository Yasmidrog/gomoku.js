class View {
    constructor(model, gameNode) {
        this._model = model;
        const canvas = document.createElement('canvas');
        canvas.setAttribute("id","field");
        gameNode.appendChild(canvas);
        this._canvas = canvas;
        this._context = this._canvas.getContext('2d');
        this._params = {
            field: '#c1d6b1',
            border: '#ffe4e8',
            winline: '#4f9d05',
            line_width: 0.3,
            el_line_width: 5,
            xColor: '#ee5626',
            oColor: "#580add",
        };
        this._resize();
        window.onresize = this._resize.bind(this)
    }

    _resize() {
        const nWidth = window.innerWidth - window.innerWidth / 100 * 15;//отступ 15%
        const nHeight = window.innerHeight - window.innerHeight / 100 * 15;
        const s = Math.min(nWidth, nHeight);//выбираем наименьшее, чтобы холст вмещался и был квадратным
        this._params.line_width = s / 100 * 0.5;
        this._params.el_line_width = s/ 100 * 0.5;//ширина линии элементов
        this._cellSize = Math.floor(s/ this._model.size);
        this._canvas.width = this._canvas.height = this._model.size * this._cellSize + 1;
        this._circleSize = Math.floor(this._cellSize / 4);
        this._cross = Math.floor(this._cellSize / 5);//размер креста
        this._drawBoard();
    }

    _drawBoard() {
        this._context.fillStyle = this._params.field;
        this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.beginPath();
        this._context.strokeStyle = this._params.border;
        this._context.lineWidth = this._params.line_width;
        for (let x = 0.5; x <= this._canvas.width; x += this._cellSize) {

            this._context.moveTo(x, 0);
            this._context.lineTo(x, this._canvas.height);
        }
        for (let y = 0.5; y <= this._canvas.height; y += this._cellSize) {
            this._context.moveTo(0, y);
            this._context.lineTo(this._canvas.width, y);
        }
        this._context.stroke();
        this._rerenderSteps();

    };

    drawStep(n, m) {
        if (this._model.matrix[n][m] === 1)
            this._renderX(n, m);
        else if (this._model.matrix[n][m] === 2)
            this._renderO(n, m);
    };

    //победная линия
    win(coords) {
        const ctx = this._context;
        const s = this._cellSize;
        const hs = this._cellSize/2;
        const cw = Math.floor(this._cellSize /2.5);
        const [m1, n1, n2, m2] = [coords.m1, coords.n1, coords.n2, coords.m2];
        ctx.beginPath();
        ctx.strokeStyle = this._params.winline;
        ctx.lineWidth = this._params.el_line_width;
        ctx.lineCap = 'round';
        ctx.moveTo(m1 * s + hs - cw * (m1 !== m2), n1 * s + hs - cw * (n1 !== n2) * (coords.side || 1));
        ctx.lineTo(m2 * s + hs + cw * (m1 !== m2), n2 * s + hs + cw * (n1 !== n2) * (coords.side || 1));
        ctx.stroke();
    }

    _rerenderSteps() {
        for (let s of  this._model.steps) {
            //перерисовка всех ходов
            this['_render' + s.owner.toUpperCase()](s.n, s.m)
        }
    };

    _renderX(n, m) {
        const ctx = this._context;
        const x = m * this._cellSize + this._cellSize/2;
        const y = n * this._cellSize + this._cellSize/2;
        ctx.beginPath();
        ctx.strokeStyle = this._params.xColor;
        ctx.lineWidth = this._params.el_line_width;
        ctx.lineCap = 'round';
        ctx.moveTo(x - this._cross, y - this._cross);
        ctx.lineTo(x + this._cross, y + this._cross);
        ctx.moveTo(x - this._cross, y + this._cross);
        ctx.lineTo(x + this._cross, y - this._cross);
        ctx.stroke();
    };

    _renderO(n, m) {
        const ctx = this._context;
        const x = m * this._cellSize + this._cellSize/2;
        const y = n * this._cellSize + this._cellSize/2;
        ctx.beginPath();
        ctx.strokeStyle = this._params.oColor;
        ctx.lineWidth = this._params.el_line_width;
        ctx.lineCap = 'round';
        ctx.arc(x, y, this._circleSize, 0, Math.PI*2);
        ctx.stroke();
    };
}
module.exports = View;

