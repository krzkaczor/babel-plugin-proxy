# babel-plugin-proxy

## Installation
    
    npm install babel-plugin-proxy --save-dev

## Motivation

Proxies are awesome feature of ES2015 that enables redefining some language operations. For example we can intercept every object property access with our own function.
    
The problem is that proper proxy implementation requires native browser support (currently it works in Firefox and Edge). This plugin is proof of concept that proxies can be implemented with ES5 features. It is not suitable for production environments because performance impact is huge.
    
## How does it work?

We are intercepting every property access (almost every), property assignment with custom interceptor functions that performs runtime check if object is proxied.
    
    proxy.foo;
       
becomes:
    
    globalGetInterceptor(proxy, 'foo');

## Example
Proxies for example allow us to create objects that will warn us when `undefined` key is being accessed. 
     
    var proxy = new Proxy({}, {
        get: function(target, propKey) {
            if (!(propKey in target)) {
                console.log("Accessing undefined key!");
            }
    
            return target[propKey];
        }
    });
    
    proxy.a = 5;
    console.log(proxy.a);
    console.log(proxy.b);

output:

    5
    Accessing undefined key!
    undefined