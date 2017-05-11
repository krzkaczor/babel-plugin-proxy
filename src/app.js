const fs = require('fs')
const babylon = require('babylon')

function attachRuntime (programPath) {
  // get and parse runtime - i think that there should be better ways to do this...
  // addHelper is internal thing that's why i didn't use it
  const runtimeSourceCode = fs.readFileSync(require.resolve('./runtime')).toString()
  const runtimeAst = babylon.parse(runtimeSourceCode)

  programPath.unshiftContainer('body', runtimeAst.program.body)
}

export default function ({ types: t }) {
  const proxyNodes = {
    MemberExpression (path) {
      if (this.disableGetTrap[ this.disableGetTrap.length - 1 ]) return

      var name = path.node.property.name
      var callee = path.node.computed ? path.node.property : t.stringLiteral(name)
      path.replaceWith(t.callExpression(t.identifier('globalGetInterceptor'), [path.node.object, callee]))
    },

    AssignmentExpression (path) {
      if (t.isMemberExpression(path.node.left)) {
        if (this.disableSetTrap[ this.disableSetTrap.length - 1 ]) return

        const memberExpr = path.node.left
        const callee = memberExpr.computed ? memberExpr.property : t.stringLiteral(memberExpr.property.name)
        path.replaceWith(
          t.callExpression(t.identifier('globalSetInterceptor'), [
            memberExpr.object,
            callee,
            path.node.right
          ])
        )
      }
    },

    UpdateExpression (path) {
      if (t.isMemberExpression(path.node.argument)) {
        if (this.disableSetTrap[ this.disableSetTrap.length - 1 ]) return

        const memberExpr = path.node.argument
        if (path.node.prefix) {
          const callee = memberExpr.computed ? memberExpr.property : t.stringLiteral(memberExpr.property.name)
          var gotten = t.callExpression(t.identifier('globalGetInterceptor'), [memberExpr.object, callee])
          var newVal = t.binaryExpression(path.node.operator.substr(0, 1), gotten, t.numericLiteral(1))
          path.replaceWith(
            t.callExpression(t.identifier('globalSetInterceptor'), [
              memberExpr.object,
              callee,
              newVal
            ])
          )
        } else {
          const fun = 'globalUpdatePostfix' +
            (path.node.operator === '++' ? 'Add' : 'Subtract') +
            'Interceptor'
          const callee = memberExpr.computed ? memberExpr.property : t.stringLiteral(memberExpr.property.name)
          const callExp = t.callExpression(t.identifier(fun), [
            memberExpr.object,
            callee
          ])
          const blkSt = t.blockStatement([t.returnStatement(callExp)])
          const funExp = t.functionExpression(null, [], blkSt, false, false)
          const expst = t.expressionStatement(t.callExpression(funExp, []))
          path.replaceWith(expst)
        }
      }
    },

    NewExpression: {
      enter (path) {
        if (path.node.callee.name === 'Proxy') {
          this.disableGetTrap.push(true)
          this.disableSetTrap.push(true)
        }
      },

      exit (path) {
        if (path.node.callee.name === 'Proxy') {
          this.disableGetTrap.pop()
          this.disableSetTrap.pop()
        }
      }
    }
  }

  return {
    visitor: {
      Program (path) {
        path.traverse(proxyNodes, { disableGetTrap: [], disableSetTrap: [] })

        attachRuntime(path)
      }
    }
  }
}
