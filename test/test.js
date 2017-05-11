const expect = require('chai').expect
const babel = require('babel-core')

const log = console.log
describe('babel-plugin-proxy', function () {
  it('should trap property get', function () {
    const code = `
      var a = new Proxy({}, {
        get: function(target, name) {
          console.log('Accessing ' + name)
        }
      })
      a.b
    `

    const runLogs = compileAndRun(code)
    expect(runLogs).to.be.deep.eq(['Accessing b'])
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

  it('should work with computed member function', function () {
    const code = `
      var handler = {
        get: function(target, name) {
          return name in target ?
            target[name] :
            37;
        }
      };

      var p = new Proxy({}, handler);
      p.a = 1;
      p.b = undefined;

      console.log(p.a); // 1
      console.log(p.b); // undefined
      console.log('c' in p); // false
      console.log(p.c); // 37
    `
    const runLogs = compileAndRun(code)
    expect(runLogs).to.be.deep.eq([1, undefined, false, 37])
  })

  it('should not mess up update expressions', function () {
    const code = `
      var x = { i: 0 }
      var m = ['hello']
      console.log(m[x.i++])
      console.log(++x.i)
    `
    const runLogs = compileAndRun(code)
    expect(runLogs).to.be.deep.eq(['hello', 2])
  })
})

function compileAndRun (code) {
  const pluginPath = require.resolve('../build/app.js')
  const output = babel.transform(code, {
    plugins: [ pluginPath ],
    presets: [ 'env' ]
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
