(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
            }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
                var n = t[o][1][e];return s(n ? n : e);
            }, l, l.exports, e, t, n, r);
        }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
})({ 1: [function (require, module, exports) {
        const patterns = [{ p: 'xxxxx', rate: 99999 }, // пять в ряд (финальная выигрышная линия)
        { p: '0xxxx0', rate: 7000 }, // Открытая четверка
        { p: '0xxxx', rate: 4000 }, // Закрытая четверка
        { p: 'xxxx0', rate: 4000 }, { p: '0x0xxx', rate: 2000 }, { p: '0xx0xx', rate: 2000 }, { p: '0xxx0x', rate: 2000 }, { p: 'xxx0x0', rate: 2000 }, { p: 'xx0xx0', rate: 2000 }, { p: 'x0xxx0', rate: 2000 }, { p: '0xxx0', rate: 3000 }, { p: '0xxx', rate: 1500 }, { p: 'xxx0', rate: 1500 }, { p: '0xx0x', rate: 800 }, { p: '0x0xx', rate: 800 }, { p: 'xx0x0', rate: 800 }, { p: 'x0xx0', rate: 800 }, { p: '0xx0', rate: 200 }];

        module.exports.find = function (line, player) {
            line = line.replace('I', player);
            for (let p of patterns) {
                let str = p.p.replace(/x/g, player);

                if (line.includes(str)) {
                    return p.rate;
                }
            }
            return 0;
        };
        module.exports.defenceConstant = 0.8;
    }, {}], 2: [function (require, module, exports) {
        class Controller {
            constructor(model, view, options, callbacks) {
                this._model = model;
                this._view = view;
                this.onStop = this.onWin = this.onMove = () => {};
                if (callbacks) {
                    this.onMove = callbacks.onMove || this.onMove;
                    this.onStop = callbacks.onStop || this.onStop;
                    this.onWin = callbacks.onWin || this.onWin;
                }
                this._initListeners();
                if (options) {
                    if (options.computerFirst && options.computerPlays) this._checkMove(this._model.computerMove());
                }
            }

            _initListeners() {
                const canvas = this._view._canvas;
                canvas.addEventListener("touchstart", function (e) {
                    e.preventDefault();
                    canvas.coords = Controller._getTouchPos(canvas, e);
                }.bind(this), false);
                canvas.addEventListener("touchend", function (e) {
                    e.preventDefault();
                    this._clickListener(canvas.coords);
                }.bind(this), false);
                canvas.onmouseup = function (e) {
                    this._clickListener(canvas.relCoords(e));
                }.bind(this);
            }

            static _getTouchPos(canvasDom, touchEvent) {
                const rect = canvasDom.getBoundingClientRect();
                return {
                    x: touchEvent.touches[0].clientX - rect.left,
                    y: touchEvent.touches[0].clientY - rect.top
                };
            }

            _clickListener(c) {
                const n = Math.floor(c.y / this._view._cellSize);
                const m = Math.floor(c.x / this._view._cellSize);
                if (n < this._model.size && m < this._model.size) {
                    this._checkMove(this._model.humanMove(n, m, this._model.computerPlays), true);
                }
            }

            _checkMove(moveres, moveComputer) {
                //проверяем результат попытки хода

                if (moveres) {
                    this._view.drawStep(moveres.n, moveres.m);
                    if (moveres.type === "result") {
                        this._view.win(moveres.r);
                        return this.onWin(moveres, this._model.who);
                    } else {
                        //если ход не победный
                        if (this._model.finish) {
                            return this.onStop();
                        }
                        this.onMove(this._model);
                        if (moveComputer && this._model.computerPlays) //заставляем компьютер ходить после нас
                            this._checkMove(this._model.computerMove());
                    }
                }
            }
        }
        module.exports = Controller;
    }, {}], 3: [function (require, module, exports) {
        const Model = require('./model');
        const View = require("./view");
        const Controller = require("./controller");
        class Game {
            constructor(options, gamenode, callbacks, save) {
                let size;
                if (options) {
                    size = options.size;
                }
                let m = new Model(size || 15, options ? options.computerPlays : null);

                if (save) {
                    m = Object.assign(m, save);
                    m.refreshMovable();
                }
                const w = new View(m, gamenode);
                if (!size || size > 25 || size < 5) return;
                new Controller(m, w, options, callbacks);
            }
        }
        module.exports = Game;
    }, { "./controller": 2, "./model": 4, "./view": 5 }], 4: [function (require, module, exports) {
        const config = require("./AIconfig");

        class Model {
            constructor(size, computerPlays) {
                this.size = size;
                this.steps = []; //все ходы
                this.computerPlays = computerPlays;
                this._movable = []; //потенциальные точки рассчета оценки
                this.finish = false;
                this.who = 0; //false/0 - нолики, true/1 - крестики
                this.stepInProgress = false;
                this._iVacant = size * size; //свободные места
                this.matrix = [];
                for (let n = 0; n < this.size; n++) {
                    this.matrix[n] = [];
                    for (let m = 0; m < this.size; m++) {
                        this.matrix[n][m] = 0;
                    }
                }
            }
            _checkWin(n, m) {
                let str = ''; //проверяем через сопоставление со строкой
                const pat = Array(6).join(2 - this.who); //искомая последовательность
                let pos;
                const [vert_start, hor_start, vert_end, hor_end] = [n - Math.min(4, n), m - Math.min(4, m), Math.min(this.size, n + 5), Math.min(this.size, m + 5)]; //позиции старта и конца поиска по двум направлениям:
                // либо отступ на 4, либо упираемся в стенку

                //далее создаются строки из реальных фигур: 00111100, если найдено 11111 или 22222,
                // то начальная координата вычисляется так: начало поска + позиция вхождения подстроки
                for (let i = vert_start; i < vert_end; i++) str += this.matrix[i][m]; //сверху вниз

                if ((pos = str.indexOf(pat)) >= 0) return { m1: m, m2: m, n1: vert_start + pos, n2: vert_start + pos + 4 };
                str = "";
                for (let i = hor_start; i < hor_end; i++) str += this.matrix[n][i]; //слева направо

                if ((pos = str.indexOf(pat)) >= 0) return { n1: n, n2: n, m1: hor_start + pos, m2: hor_start + pos + 4 };

                str = "";

                const left_offset = -Math.min(n - vert_start, m - hor_start);
                for (let i = left_offset; i <= Math.min(hor_end - m, vert_end - n) - 1; i++) str += this.matrix[n + i][m + i]; //главная диагональ

                if ((pos = str.indexOf(pat)) >= 0) return {
                    n1: n + left_offset + pos, n2: n + left_offset + pos + 4,
                    m1: m + left_offset + pos, m2: m + left_offset + pos + 4
                };

                str = "";
                const right_offset = -Math.min(vert_end - n - 1, m - hor_start);
                for (let i = right_offset; i <= Math.min(hor_end - m - 1, n - vert_start); i++) str += this.matrix[n - i][m + i]; //побочная диагональ

                if ((pos = str.indexOf(pat)) >= 0) {
                    const abs = Math.abs(right_offset);
                    return {
                        n1: n + abs - pos,
                        n2: n + abs - pos - 4,
                        m1: m - abs + pos,
                        m2: m - abs + pos + 4,
                        side: -1 //угол наклона в другую сторону
                    };
                }
            }

            _addPotential(n, m) {
                if (!this._movable[n]) this._movable[n] = [];
                if (this._movable[n][m] === undefined) this._movable[n][m] = Math.floor(Math.random() * (25 - 15) + 15);
            }
            refreshMovable() {
                for (let s of this.steps) {
                    this._updateMovable(s.n, s.m);
                }
            }
            _updateMovable(n, m) {
                //собираются все возможные клетки, куда можно походить, в радиусе двух
                if (this._movable[n] && this._movable[n][m]) delete this._movable[n][m];
                const s = this.size;
                let ni, mj;
                for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
                    if (j === 0 && i === 0) continue;
                    [ni, mj] = [n + i, m + j];
                    if (ni >= 0 && ni < s && mj >= 0 && mj < s && this.matrix[ni][mj] === 0) {
                        this._addPotential(ni, mj);
                    }
                }
            }

            _getRate() {
                if (this._movable.length < 1) return;
                for (let n in this._movable) {
                    for (let m in this._movable[n]) {
                        let y = parseInt(n);
                        let x = parseInt(m);
                        let od = this._getOffAndDeff(y, x);
                        if (this.matrix[n][m] === 0) //проверяем, т.к потенциальные ходы еще не обновлены и тут может быть чето
                            this._movable[n][m] = od.offRate + od.defRate * config.defenceConstant;else delete this._movable[n][m];
                    }
                }
            }

            _getOffAndDeff(n, m) {
                //получение веса точки в зависимости от атаки/защиты
                let defRate = 0;
                let offRate = 0;
                for (let j = 0; j < 4; j++) {
                    //для 4 направлений
                    let line = "";
                    let radius = this.size < 10 ? 4 : 6;
                    for (let i = -radius; i <= radius; i++) {
                        switch (j) {
                            case 0:
                                if (n + i >= 0 && n + i < this.size) {
                                    line += i === 0 ? "I" : this.matrix[n + i][m]; //ставим I в точке,
                                    // чтобы потом заменить на свой или противоположный символ
                                }
                                break;
                            case 1:
                                if (m + i >= 0 && m + i < this.size) line += i === 0 ? "I" : this.matrix[n][m + i];
                                break;
                            case 2:
                                if (n + i >= 0 && n + i < this.size) if (m + i >= 0 && m + i < this.size) line += i === 0 ? "I" : this.matrix[n + i][m + i];
                                break;
                            case 3:
                                if (n - i >= 0 && n - i < this.size) if (m + i >= 0 && m + i < this.size) line += i === 0 ? "I" : this.matrix[n - i][m + i];

                                break;
                        }
                    }

                    if (line.length < 5) continue;
                    offRate += config.find(line, '' + (2 - !this.who));
                    defRate += config.find(line, this.who ? '1' : '2'); //пользовтаель заменен на противоположного
                }
                return { offRate, defRate };
            }

            _getBestStep() {
                let max = -1;
                if (this._movable.length < 1) {
                    const midle = Math.floor(this.size / 2); //в начале игры ставим в середину
                    return { m: midle, n: midle };
                };
                for (var n in this._movable) // Поиск веса лучшего хода
                for (var m in this._movable[n]) //проходим таким образом из-за особенностей undefined в массиве
                if (this._movable[n][m] > max) max = this._movable[n][m];
                let possible = [];
                for (var n in this._movable) for (var m in this._movable[n]) if (max - this._movable[n][m] <= 15) {
                    possible.push({ n, m });
                }

                return possible[Math.floor(Math.random() * possible.length)];
            }

            computerMove() {
                if (this.stepInProgress) return false;
                this.stepInProgress = true;

                this._getRate();
                const nm = this._getBestStep();

                return this._move(parseInt(nm.n), parseInt(nm.m));
            }

            humanMove(n, m) {
                if (this.stepInProgress) return false;
                this.stepInProgress = true;

                return this._move(n, m);
            }

            _move(n, m) {
                this.stepInProgress = false;
                if (this.matrix[n][m] !== 0 || this.finish) return false;
                this.who = !this.who;
                this.matrix[n][m] = 2 - this.who;
                if (this.computerPlays) this._updateMovable(n, m); //в случае, если играем с компьютерм

                this._iVacant--;
                if (this._iVacant <= 0) {
                    this.finish = true;
                }
                this.steps.push({
                    owner: !!this.who ? "x" : "o",
                    m, n
                });
                let r = this._checkWin(n, m);
                if (r) this.finish = true;

                return r ? { type: "result", m, n, r } : { m, n, type: "coords"
                    //если полуили координаты победной комбинации,
                    // то возвращаем результат игры,
                    // иначе - только координаты хода
                };
            }

            get save() {
                //получение данных для сохранения
                return {
                    steps: this.steps,
                    who: this.who,
                    matrix: this.matrix,
                    size: this.size
                };
            }
        }
        module.exports = Model;
    }, { "./AIconfig": 1 }], 5: [function (require, module, exports) {
        class View {
            constructor(model, gameNode) {
                this._model = model;
                const canvas = document.createElement('canvas');
                canvas.setAttribute("id", "field");
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
                    oColor: "#580add"
                };
                this._resize();
                window.onresize = this._resize.bind(this);
            }

            _resize() {
                const nWidth = window.innerWidth - window.innerWidth / 100 * 15; //отступ 15%
                const nHeight = window.innerHeight - window.innerHeight / 100 * 15;
                const s = Math.min(nWidth, nHeight); //выбираем наименьшее, чтобы холст вмещался и был квадратным
                this._params.line_width = s / 100 * 0.5;
                this._params.el_line_width = s / 100 * 0.5; //ширина линии элементов
                this._cellSize = Math.floor(s / this._model.size);
                this._canvas.width = this._canvas.height = this._model.size * this._cellSize + 1;
                this._circleSize = Math.floor(this._cellSize / 4);
                this._cross = Math.floor(this._cellSize / 5); //размер креста
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
            }

            drawStep(n, m) {
                if (this._model.matrix[n][m] === 1) this._renderX(n, m);else if (this._model.matrix[n][m] === 2) this._renderO(n, m);
            }

            //победная линия
            win(coords) {
                const ctx = this._context;
                const s = this._cellSize;
                const hs = this._cellSize / 2;
                const cw = Math.floor(this._cellSize / 2.5);
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
                for (let s of this._model.steps) {
                    //перерисовка всех ходов
                    this['_render' + s.owner.toUpperCase()](s.n, s.m);
                }
            }

            _renderX(n, m) {
                const ctx = this._context;
                const x = m * this._cellSize + this._cellSize / 2;
                const y = n * this._cellSize + this._cellSize / 2;
                ctx.beginPath();
                ctx.strokeStyle = this._params.xColor;
                ctx.lineWidth = this._params.el_line_width;
                ctx.lineCap = 'round';
                ctx.moveTo(x - this._cross, y - this._cross);
                ctx.lineTo(x + this._cross, y + this._cross);
                ctx.moveTo(x - this._cross, y + this._cross);
                ctx.lineTo(x + this._cross, y - this._cross);
                ctx.stroke();
            }

            _renderO(n, m) {
                const ctx = this._context;
                const x = m * this._cellSize + this._cellSize / 2;
                const y = n * this._cellSize + this._cellSize / 2;
                ctx.beginPath();
                ctx.strokeStyle = this._params.oColor;
                ctx.lineWidth = this._params.el_line_width;
                ctx.lineCap = 'round';
                ctx.arc(x, y, this._circleSize, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        module.exports = View;
    }, {}], 6: [function (require, module, exports) {
        require("./libraries/utils");
        const Game = require("./Game/game.js");
        let started = false;
        const info = document.getElementById("info");
        const restart = document.getElementById("restart");
        function getSettings() {
            let e = document.getElementById("game_type");
            let type = e.options[e.selectedIndex].value;
            const sizeInp = document.getElementById("size");
            return { type, size: parseInt(sizeInp.value) };
        }
        function collectParams() {
            const s = getSettings();
            return {
                size: s.size,
                computerFirst: s.type === "o",
                computerPlays: s.type !== "two"
            };
        }
        function getWhoPlays(who) {
            return "Ходят " + (!who ? "<span class='cross'>крестики</span>" : "<span class='nul'>нолики</span>");
        }
        function clearSave() {
            localStorage.setItem("save", null); //удалить сохранение
        }
        function saveSettings() {
            localStorage.setItem("settings", JSON.stringify(getSettings())); //вставляем сохранение настройки
        }
        function restoreSettings() {
            let s = localStorage.getItem("settings");
            if (s) s = JSON.parse(s);else return;
            document.getElementById("size").value = s.size;
            document.getElementById("game_type").value = s.type;
        }
        function writeMessage(msg) {
            document.getElementById("field").style.filter = "blur(0.4vh)";
            let m = document.createElement("div");
            m.innerHTML = `<div>
                    ${msg}
                  </div>`;
            m.className = "message";
            setTimeout(() => {
                document.getElementById("game").appendChild(m);
            }, 800);
        }
        function createCloseButton(gnode) {
            const exit = document.createElement('exit');
            exit.innerHTML = `<div class="exit">
            x
        </div>`;
            exit.setAttribute("id", "exit");
            gnode.appendChild(exit);
            exit.onclick = close;
        }
        function close() {
            clearSave();
            document.getElementById("menu").classList.remove("short");
            document.getElementById("game").style.display = "none";
            document.getElementById("game").innerHTML = "";
            restart.innerHTML = "Старт";
            info.style.display = "none";
            started = false;
        }
        function open() {
            document.getElementById("menu").classList.add("short");
            document.getElementById("game").style.display = "flex";
            restart.innerHTML = "Перезапуск";
            info.style.display = "block";
        }
        function startGame(save) {
            const g = document.getElementById("game");
            if (started) {
                g.innerHTML = "";
            }
            info.innerHTML = getWhoPlays(save ? save.who : false);
            new Game(collectParams(), g, {
                onMove: model => {
                    localStorage.setItem("save", JSON.stringify(model.save));
                    info.innerHTML = getWhoPlays(model.who); //на каждое действие делаем актуальное сохранение
                },
                onWin: (m, who) => {
                    clearSave();
                    writeMessage('ПОБЕДИЛИ ' + (who ? "КРЕСТИКИ" : "НОЛИКИ"));
                },
                onStop: () => {
                    clearSave();
                    writeMessage('ИГРА ОКОНЧЕНА');
                },
                who: 0
            }, save);
            createCloseButton(g);
            started = true;
            saveSettings();
        }

        restart.onclick = function (e) {
            if (!started) {
                open();
            }
            info.innerHTML = "";
            startGame();
        };
        //проверяем сохранения  и настройки
        restoreSettings();
        const save = JSON.parse(localStorage.getItem("save"));
        if (save) {
            open();
            startGame(save);
        }
    }, { "./Game/game.js": 3, "./libraries/utils": 7 }], 7: [function (require, module, exports) {
        module.exports = (() => {
            //поиск относительных координат клика по canvas
            HTMLCanvasElement.prototype.relCoords = function (event) {
                let totalOffsetX = 0;
                let totalOffsetY = 0;
                let currentElement = this;
                do {
                    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
                } while (currentElement = currentElement.offsetParent);
                return {
                    x: Math.round((event.pageX - totalOffsetX) * (this.width / this.offsetWidth)),
                    y: Math.round((event.pageY - totalOffsetY) * (this.height / this.offsetHeight))
                };
            };
        })();
    }, {}] }, {}, [6]);
