require("./libraries/utils");
const Game = require("./Game/game.js");
let started = false;
const info = document.getElementById("info");
const restart = document.getElementById("restart");
function getSettings() {
    let e = document.getElementById("game_type");
    let type = e.options[e.selectedIndex].value;
    const sizeInp = document.getElementById("size");
    return {type, size: parseInt(sizeInp.value)}
}
function collectParams() {
    const s=getSettings();
    return {
        size: s.size,
        computerFirst:s.type==="o",
        computerPlays:s.type!=="two"
    }
}
function getWhoPlays(who) {
    return "Ходят " + (!who ? "<span class='cross'>крестики</span>" : "<span class='nul'>нолики</span>")
}
function clearSave() {
    localStorage.setItem("save", null)//удалить сохранение
}
function saveSettings(){
    localStorage.setItem("settings", JSON.stringify(getSettings()));//вставляем сохранение настройки
}
function restoreSettings() {
    let s = localStorage.getItem("settings");
    if(s)
        s=JSON.parse(s);
    else return;
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
        document.getElementById("game").appendChild(m)
    }, 800)
}
function createCloseButton(gnode) {
    const exit = document.createElement('exit');
    exit.innerHTML = `<div class="exit">
            x
        </div>`;
    exit.setAttribute("id", "exit");
    gnode.appendChild(exit);
    exit.onclick = close
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
        g.innerHTML = ""
    }
    info.innerHTML = getWhoPlays(save ? save.who : false);
    new Game(collectParams(), g, {
        onMove: (model) => {
            localStorage.setItem("save", JSON.stringify(model.save));
            info.innerHTML = getWhoPlays(model.who)//на каждое действие делаем актуальное сохранение
        },
        onWin: (m, who) => {
            clearSave();
            writeMessage('ПОБЕДИЛИ ' + ( who ?"КРЕСТИКИ": "НОЛИКИ"  ))
        },
        onStop: () => {
            clearSave();
            writeMessage('ИГРА ОКОНЧЕНА');
        },
        who:0
    }, save);
    createCloseButton(g);
    started = true;
    saveSettings();
}

restart.onclick = function (e) {
    if (!started) {
        open()
    }
    info.innerHTML = "";
    startGame()
};
//проверяем сохранения  и настройки
restoreSettings();
const save = JSON.parse(localStorage.getItem("save"));
if (save) {
    open();
    startGame(save)
}