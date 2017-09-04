class Controller {
    constructor(model, view, options, callbacks) {
        this._model = model;
        this._view = view;
        this.onStop = this.onWin = this.onMove = () => {
        };
        if (callbacks) {
            this.onMove = callbacks.onMove || this.onMove;
            this.onStop = callbacks.onStop || this.onStop;
            this.onWin = callbacks.onWin || this.onWin;
        }
        this._initListeners();
        if (options) {
            if (options.computerFirst && options.computerPlays)
                this._checkMove(this._model.computerMove());
        }

    }

    _initListeners() {
        const canvas = this._view._canvas;
        canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();
            canvas.coords = Controller._getTouchPos(canvas, e)
        }.bind(this), false)
        canvas.addEventListener("touchend", function (e) {
            e.preventDefault();
            this._clickListener(canvas.coords)
        }.bind(this), false)
        canvas.onmouseup = function (e) {
            this._clickListener(canvas.relCoords(e));
        }.bind(this)

    }

    static _getTouchPos(canvasDom, touchEvent) {
        const rect = canvasDom.getBoundingClientRect();
        return {
            x: touchEvent.touches[0].clientX - rect.left,
            y: touchEvent.touches[0].clientY - rect.top
        }
    }

    _clickListener(c) {
        const n = Math.floor(c.y / this._view._cellSize);
        const m = Math.floor(c.x / this._view._cellSize);
        if (n < this._model.size && m < this._model.size) {
            this._checkMove(this._model.humanMove(n, m, this._model.computerPlays), true);
        }
    }

    _checkMove(moveres, moveComputer) {//проверяем результат попытки хода

        if (moveres) {
            this._view.drawStep(moveres.n, moveres.m);
            if (moveres.type === "result") {
                this._view.win(moveres.r);
                return this.onWin(moveres, this._model.who);
            } else {//если ход не победный
                if (this._model.finish) {
                    return this.onStop();
                }
                this.onMove(this._model);
                if (moveComputer && this._model.computerPlays)//заставляем компьютер ходить после нас
                    this._checkMove(this._model.computerMove());
            }
        }
    }
}
module.exports = Controller;