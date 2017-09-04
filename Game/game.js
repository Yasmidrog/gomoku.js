const Model = require('./model');
const View = require("./view");
const Controller = require("./controller");
class Game {
    constructor(options, gamenode, callbacks, save) {
        let size;
        if(options){
            size=options.size;
        }
        let m = new Model(size||15, options?options.computerPlays:null);

        if (save) {
            m = Object.assign(m, save);
            m.refreshMovable();
        }
        const w = new View(m, gamenode);
        if (!size||size>25||size<5) return;
        new Controller(m, w,options,callbacks);
    }
}
module.exports = Game;