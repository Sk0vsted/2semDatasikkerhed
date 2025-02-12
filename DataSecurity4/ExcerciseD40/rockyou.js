'use strict';
const fs = require('fs');

class Rockyou {
    static rockyou = '';
    static #filename = './rockyou.txt';

    static getRockyou() {
        if (Rockyou.rockyou === '')
            Rockyou.rockyou = fs.readFileSync(Rockyou.#filename, 'utf8');
    }
}

module.exports = Rockyou;