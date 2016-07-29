const fs = require('fs')
const babylon = require('babylon')
const traverse = require('babel-traverse').default
const visitors = require('babel-traverse').visitors

// there is no way to skip certain keys while traversing
function traverseNoKeys (nodePath, visitor, state, skipKeys) {
  visitors.explode(visitor)
  return traverse.node(nodePath.node, visitor, nodePath.scope, state, nodePath, skipKeys)
}

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

      path.replaceWith(
        t.callExpression(t.identifier('globalGetInterceptor'), [ path.node.object, t.stringLiteral(path.node.property.name) ])
      )
    },

    AssignmentExpression (path) {
      if (t.isMemberExpression(path.node.left)) {
        if (this.disableSetTrap[ this.disableSetTrap.length - 1 ]) return

        const memberExpr = path.node.left
        path.replaceWith(
          t.callExpression(t.identifier('globalSetInterceptor'), [
            memberExpr.object,
            t.stringLiteral(memberExpr.property.name),
            path.node.right
          ])
        )
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
    },

    CallExpression: {
      enter (path) {
        traverseNoKeys(path, proxyNodes, {
          disableGetTrap: this.disableGetTrap,
          disableSetTrap: this.disableSetTrap
        }, { callee: true })
        this.disableGetTrap.push(true)
      },

      exit () {
        this.disableGetTrap.pop()
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
