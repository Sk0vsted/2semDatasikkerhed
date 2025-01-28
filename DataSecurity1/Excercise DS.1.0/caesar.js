'use strict';

const alphabet = 'abcdefghijklmnopqrstuvwxyzæøå';
const alphabetArray = alphabet.split('');
const alphabetLength = alphabetArray.length;

function caesarE(key, clearText) {
    let cipherText = '';
    clearText = clearText.toLowerCase();
    key = parseInt(key);
    for (let i = 0; i < clearText.length; i++) {
        const char = clearText[i];
        const index = alphabetArray.indexOf(char);
        if (index === -1) {
            cipherText += char;
        } else {
            const newIndex = (index + key) % alphabetLength;
            cipherText += alphabetArray[newIndex];
        }
    }
    return cipherText;
}

document.getElementById('caesarEncrypt').addEventListener('click', () => {
    const shift = document.getElementById('caesarShift').value;
    const text = document.getElementById('caesarInput').value;
    document.getElementById('caesarOutput').innerHTML = caesarE(shift, text);
});

document.getElementById('caesarDecrypt').addEventListener('click', () => {
    const shift = document.getElementById('caesarShift').value;
    const text = document.getElementById('caesarInput').value;
    document.getElementById('caesarOutput').innerHTML = caesarD(shift, text);
});

function caesarD(key, cipherText) {
    let clearText = '';
    cipherText = cipherText.toLowerCase();
    key = parseInt(key);
    for (let i = 0; i < cipherText.length; i++) {
        const char = cipherText[i];
        const index = alphabetArray.indexOf(char);
        if (index === -1) {
            clearText += char;
        } else {
            const newIndex = (index - key + alphabetLength) % alphabetLength;
            clearText += alphabetArray[newIndex];
        }
    }
    return clearText;
}