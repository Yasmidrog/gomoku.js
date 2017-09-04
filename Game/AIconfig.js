const patterns = [{p: 'xxxxx', rate: 99999}, // пять в ряд (финальная выигрышная линия)
    {p: '0xxxx0', rate: 7000}, // Открытая четверка
    {p: '0xxxx', rate: 4000}, // Закрытая четверка
    {p: 'xxxx0', rate: 4000},
    {p: '0x0xxx', rate: 2000},
    {p: '0xx0xx', rate: 2000},
    {p: '0xxx0x', rate: 2000},
    {p: 'xxx0x0', rate: 2000},
    {p: 'xx0xx0', rate: 2000},
    {p: 'x0xxx0', rate: 2000},
    {p: '0xxx0', rate: 3000},
    {p: '0xxx', rate: 1500},
    {p: 'xxx0', rate: 1500},
    {p: '0xx0x', rate: 800},
    {p: '0x0xx', rate: 800},
    {p: 'xx0x0', rate: 800},
    {p: 'x0xx0', rate: 800},
    {p: '0xx0', rate: 200}]

module.exports.find = function (line, player) {
    line = line.replace(/I/g, player);
    for (let p of patterns) {
        let str = p.p.replace(/x/g, player);

        if (line.includes(str)) {
            return p.rate
        }
    }
    return 0;
};
module.exports.defenceConstant = 0.8;