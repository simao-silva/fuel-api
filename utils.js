function replaceAll(string, char1, char2) {
    while (string.toString().indexOf(char1) > -1) {
        string = string.toString().replace(char1, char2);
    }
    return string;
}

module.exports.removeAll = function (string, charArray) {

    for (let i = 0; i < charArray.length; i++) {
        string = replaceAll(string, charArray[i], "");
    }

    return string;
}

https://stackoverflow.com/a/17606289/14067392
