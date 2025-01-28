'use strict';

function vigE(key, clearText) {
    let cipherText = '';
    clearText = clearText.toLowerCase();
    key = key.toLowerCase();
    for (let i = 0; i < clearText.length; i++) {
        const char = clearText[i];
        const index = alphabetArray.indexOf(char);
        if (index === -1) {
            cipherText += char;
        } else {
            const keyChar = key[i % key.length];
            const keyIndex = alphabetArray.indexOf(keyChar);
            const newIndex = (index + keyIndex) % alphabetLength;
            cipherText += alphabetArray[newIndex];
        }
    }
    return cipherText;
}

document.getElementById('vigenereEncrypt').addEventListener('click', () => {
    const key = document.getElementById('vigenereKey').value;
    const text = document.getElementById('vigenereInput').value;
    document.getElementById('vigenereOutput').innerHTML = vigE(key, text);
});

document.getElementById('vigenereDecrypt').addEventListener('click', () => {
    const key = document.getElementById('vigenereKey').value;
    const text = document.getElementById('vigenereInput').value;
    document.getElementById('vigenereOutput').innerHTML = vigD(key, text);
});

function vigD(key, cipherText) {
    let clearText = '';
    cipherText = cipherText.toLowerCase();
    key = key.toLowerCase();
    for (let i = 0; i < cipherText.length; i++) {
        const char = cipherText[i];
        const index = alphabetArray.indexOf(char);
        if (index === -1) {
            clearText += char;
        } else {
            const keyChar = key[i % key.length];
            const keyIndex = alphabetArray.indexOf(keyChar);
            const newIndex = (index - keyIndex + alphabetLength) % alphabetLength;
            clearText += alphabetArray[newIndex];
        }
    }
    return clearText;
}