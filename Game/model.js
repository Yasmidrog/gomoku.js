const config = require("./AIconfig");

class Model {
    constructor(size, computerPlays) {
        this.size = size;
        this.steps = [];//все ходы
        this.computerPlays= computerPlays;
        this._movable = [];//потенциальные точки рассчета оценки
        this.finish = false;
        this.who = 0;//false/0 - нолики, true/1 - крестики
        this.stepInProgress = false;
        this._iVacant = size * size;//свободные места
        this.matrix = [];
        for (let n = 0; n < this.size; n++) {
            this.matrix[n] = [];
            for (let m = 0; m < this.size; m++) {
                this.matrix[n][m] = 0;
            }
        }
    }
    _checkWin(n, m) {
        let str = '';//проверяем через сопоставление со строкой
        const pat = Array(6).join(2 - this.who);//искомая последовательность
        let pos;
        const [vert_start, hor_start, vert_end, hor_end] =
            [n - Math.min(4, n),
                m - Math.min(4, m),
                Math.min(this.size, n + 5),
                Math.min(this.size, m + 5)]; //позиции старта и конца поиска по двум направлениям:
        // либо отступ на 4, либо упираемся в стенку

        //далее создаются строки из реальных фигур: 00111100, если найдено 11111 или 22222,
        // то начальная координата вычисляется так: начало поска + позиция вхождения подстроки
        for (let i = vert_start; i < vert_end; i++)
            str += this.matrix[i][m]; //сверху вниз

        if ((pos = str.indexOf(pat)) >= 0)
            return ({m1: m, m2: m, n1: vert_start + pos, n2: vert_start + pos + 4});
        str = "";
        for (let i = hor_start; i < hor_end; i++)
            str += this.matrix[n][i]; //слева направо

        if ((pos = str.indexOf(pat)) >= 0)
            return ({n1: n, n2: n, m1: hor_start + pos, m2: hor_start + pos + 4});

        str = "";

        const left_offset = -Math.min(n - vert_start, m - hor_start);
        for (let i = left_offset; i <= Math.min(hor_end - m, vert_end - n) - 1; i++)
            str += this.matrix[n + i][m + i]; //главная диагональ

        if ((pos = str.indexOf(pat)) >= 0)
            return ({
                n1: n + left_offset + pos, n2: n + left_offset + pos + 4,
                m1: m + left_offset + pos, m2: m + left_offset + pos + 4
            });

        str = "";
        const right_offset = -Math.min(vert_end - n - 1, m - hor_start);
        for (let i = right_offset; i <= Math.min(hor_end - m - 1, n - vert_start); i++)
            str += this.matrix[n - i][m + i]; //побочная диагональ

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
        if (!this._movable[n])
            this._movable[n] = [];
        if (this._movable[n][m] === undefined)
            this._movable[n][m] =Math.floor( Math.random() * (25 - 15) + 15);

    }
    refreshMovable(){
        for (let s of this.steps){
            this._updateMovable(s.n,s.m)
        }
    }
    _updateMovable(n, m) {//собираются все возможные клетки, куда можно походить, в радиусе двух
        if (this._movable[n] && this._movable[n][m])
            delete this._movable[n][m];
        const s = this.size;
        let ni, mj;
        for (let i = -2; i <= 2; i++)
            for (let j = -2; j <= 2; j++) {
                if (j === 0 && i === 0)
                    continue;
                [ni, mj] = [n + i, m + j];
                if (ni >= 0 && ni < s && mj >= 0 && mj < s && this.matrix[ni][mj] === 0) {
                    this._addPotential(ni, mj)
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
                if (this.matrix[n][m] === 0)//проверяем, т.к потенциальные ходы еще не обновлены и тут может быть чето
                    this._movable[n][m] = od.offRate + od.defRate*config.defenceConstant;
                else  delete this._movable[n][m];
            }
        }
    }

    _getOffAndDeff(n, m) {//получение веса точки в зависимости от атаки/защиты
        let defRate = 0;
        let offRate = 0;
        for (let j = 0; j < 4; j++) {//для 4 направлений
            let line = "";
            let radius = this.size < 10 ? 4 : 6;
            for (let i = -radius; i <= radius; i++) {
                switch (j) {
                    case 0:
                        if (n + i >= 0 && n + i < this.size) {
                            line += (i === 0) ? "I" : this.matrix[n + i][m];//ставим I в точке,
                            // чтобы потом заменить на свой или противоположный символ
                        }
                        break;
                    case 1:
                        if (m + i >= 0 && m + i < this.size)
                            line += (i === 0) ? "I" : this.matrix[n][m + i];
                        break;
                    case 2:
                        if (n + i >= 0 && n + i < this.size)
                            if (m + i >= 0 && m + i < this.size)
                                line += (i === 0) ? "I" : this.matrix[n + i][m + i];
                        break;
                    case 3:
                        if (n - i >= 0 && n - i < this.size)
                            if (m + i >= 0 && m + i < this.size)
                                line += (i === 0) ? "I" : this.matrix[n - i][m + i];

                        break;
                }
            }

            if (line.length < 5) continue;
            offRate += config.find(line, '' + (2 - !this.who));
            defRate += config.find(line, this.who ? '1' : '2')  //пользовтаель заменен на противоположного
        }
        return {offRate, defRate}
    }

    _getBestStep() {
        let max = -1;
        if(this._movable.length < 1)          {
            const midle = Math.floor(this.size / 2);//в начале игры ставим в середину
            return {m:midle, n:midle}
        };
        for (var n in this._movable)         // Поиск веса лучшего хода
            for (var m in this._movable[n])  //проходим таким образом из-за особенностей undefined в массиве
                if (this._movable[n][m]> max)
                    max = this._movable[n][m];
        let possible = [];
        for (var n in this._movable)
            for (var m in this._movable[n])
                if (max - this._movable[n][m] <=15) {
                    possible.push({n, m});
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
       if(this.computerPlays)
           this._updateMovable(n, m);//в случае, если играем с компьютерм

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

        return r ? {type: "result", m, n, r} : {m, n, type: "coords"}
        //если полуили координаты победной комбинации,
        // то возвращаем результат игры,
        // иначе - только координаты хода
    }

    get save() {//получение данных для сохранения
        return {
            steps: this.steps,
            who: this.who,
            matrix: this.matrix,
            size: this.size,
        }
    }
}
module.exports = Model;