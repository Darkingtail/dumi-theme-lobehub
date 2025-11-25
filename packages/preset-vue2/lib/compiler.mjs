import {parse,compileTemplate,compileStyle}from'@vue/component-compiler-utils';import*as h from'vue-template-compiler';var a="__sfc__";function B(d){let[,g,c]=d.match(/([^.]+)\.([^.]+)$/)||[];return {basename:g,lang:c}}function P({babel:d,availablePlugins:g={},availablePresets:c={}}){function b(i){return d.transform(i,{presets:[[c.env??"env",{modules:"cjs"}]]})}function y(i,o,m={}){let{lang:s,plugins:e=[],presets:r=[]}=m;console.log("[Vue2 Compiler] transformTS called, lang:",s),s==="ts"&&r.push([c.typescript??"typescript",{allExtensions:true,onlyRemoveTypeImports:true}]);let{basename:p}=B(o);return console.log("[Vue2 Compiler] Babel transform with presets:",r.map(n=>Array.isArray(n)?n[0]:n)),d.transform(i,{filename:p+"."+(s||"js"),presets:r,plugins:e})?.code||""}function S(i,o,m,s){let{template:e,script:r}=o,p=e?.content,l="";if(r){let n=r.content;n=n.replace(/export\s+default\s+/,`const ${a}_raw = `),l=y(n,o.filename||"component.vue",{lang:s||"js"}),l+=`
var ${a} = typeof ${a}_raw === 'function' && ${a}_raw.options ? ${a}_raw.options : ${a}_raw;`;}else l=`const ${a} = {};`;if(p){let n=compileTemplate({source:p,filename:o.filename||"component.vue",compiler:h,compilerOptions:{outputSourceRange:true},isProduction:false,isFunctional:false,optimizeSSR:false});if(n.errors&&n.errors.length)return n.errors.map(f=>typeof f=="string"?new Error(f):f);let u=n.code;u=y(u,o.filename||"component.vue",{lang:"js"}),l+=`
${u}`,l+=`
${a}.render = render;`,n.staticRenderFns&&(l+=`
${a}.staticRenderFns = staticRenderFns;`);}return l}function $(i,o){let m=[];for(let s of o.styles){let e=compileStyle({source:s.content,filename:o.filename||"component.vue",id:`data-v-${i}`,scoped:s.scoped||false,trim:true});if(e.errors&&e.errors.length)return e.errors;m.push(e.code);}return m.join(`
`)}function x(i){let{id:o,code:m,filename:s}=i,e=parse({source:m,filename:s,compiler:h,needMap:false});if(e.errors&&e.errors.length)return e.errors.map(t=>typeof t=="string"?new Error(t):t);let r="",p=false;(e.styles.some(t=>t.lang&&t.lang!=="css")||e.template&&e.template.lang)&&(p=true,r+=`
console.warn("Custom preprocessors for <template> and <style> are not supported in the Codeblock.")`),e.styles.some(t=>t.module)&&(p=true,r+=`
console.warn("<style module> is not supported in the Codeblock.")`);let l=e.script?.lang,n=e.styles.some(t=>t.scoped),u=S(o,e,n,l||"");if(Array.isArray(u))return u;r+=`
${u}`,n&&(r+=`
${a}._scopeId = ${JSON.stringify(`data-v-${o}`)};`);let f="";if(!p&&e.styles.length>0){let t=$(o,e);if(Array.isArray(t))return t;f=t;}return {js:r,css:f}}return {toCommonJS:b,transformTS:y,compileSFC:x}}var C=null;function v(){if(!C){if(typeof Babel>"u")throw new Error("[Vue2 Compiler] Babel standalone is not loaded. Make sure @babel/standalone script is loaded before using the compiler.");console.log("[Vue2 Compiler] Initializing compiler with Babel standalone"),console.log("[Vue2 Compiler] Available Babel presets:",Object.keys(Babel.availablePresets||{})),C=P({babel:Babel,availablePlugins:{},availablePresets:{env:"env",typescript:"typescript"}});}return C}var T={get toCommonJS(){return v().toCommonJS},get transformTS(){return v().transformTS},get compileSFC(){return v().compileSFC}};function E(d,g){let {filename:c}=g,[,b]=c.match(/[^.]+\.([^.]+)$/)||[];c.replace(/[^a-zA-Z0-9]/g,"_");return `"use strict";
var _component = {
  name: "LiveEditNotSupported",
  render: function(h) {
    return h("div", {
      style: {
        padding: "16px",
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "4px",
        color: "#856404",
        fontSize: "14px"
      }
    }, [
      h("div", { style: { fontWeight: "bold", marginBottom: "8px" } }, "`+`Live editing is not supported for .${b} files`+`"),
      h("div", {}, "Live editing for Vue 2 is not yet supported. Please modify the source file and refresh.")
    ]);
  }
};
module.exports = _component;
module.exports.default = _component;
`}var j=E;export{a as COMP_IDENTIFIER,E as compile,T as compiler,j as default};