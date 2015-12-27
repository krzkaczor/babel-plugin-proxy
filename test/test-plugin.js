var babel = require('babel-core');
var fs = require('fs');

var code = `
var a = new Proxy({}, {
    get: function(obj, key) {
        if (obj[key] === undefined) {
            console.log("Accessing undefined of an object!")
        }
        return obj[key];
    },
    set: function(obj, key, value) {
        console.log("Setting " + key + " of " + JSON.stringify(obj));
        obj[key] = value;
    }
});
a.b = "abc";
console.log(a.b);
console.log(a.c);
`;

var pluginPath = require.resolve('../build/app.js');
var output = babel.transform(code, {
    plugins: [pluginPath]
});

let outPutcode = output.code;
console.log(outPutcode);

console.log("running...\n\n");

eval(outPutcode);