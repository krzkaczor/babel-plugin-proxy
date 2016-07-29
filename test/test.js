const expect = require('chai').expect
const babel = require('babel-core')

describe('babel-plugin-proxy', function () {
  it('should trap property get', function () {
    const code = `
      var a = new Proxy({}, {
          get: function(obj, key) {
              console.log("Accessing " + key)
              return obj[key];
          },
      });
      a.b
      `

    const runLogs = compileAndRun(code)
    expect(runLogs.length).to.be.eq(1)
    expect(runLogs[0]).to.be.eq('Accessing b')
  })

  it('should trap property get and set', function () {
    const code = `
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
`
    const runLogs = compileAndRun(code)
    expect(runLogs[0]).to.be.eq('Setting b of {}')
    expect(runLogs[1]).to.be.eq('abc')
    expect(runLogs[2]).to.be.eq('Accessing undefined of an object!')
  })

  it('should work with methods', function () {
    const code = `
    const proxy = new Proxy({}, {
      get: (target, property) =>
        (test) => [JSON.stringify(target), property, test]
    });
    
    console.log(typeof proxy.func);
    console.log(proxy.func('123'));`

    const runLogs = compileAndRun(code)
    expect(runLogs[0]).to.be.eq('function')
    expect(runLogs[1].toString()).to.be.eq('{},func,123')
  })
})

function compileAndRun (code) {
  const pluginPath = require.resolve('../build/app.js')
  const output = babel.transform(code, {
    plugins: [ pluginPath ]
  })

  const logs = []

  /* eslint-disable */
  const console = {
    log: (val) => logs.push(val)
  }
  eval(output.code)
  /* eslint-enable */

  return logs
}
