import {getParameters}from'codesandbox-import-utils/lib/api/define';var a={getCodeSandboxParams(i){let{asset:t}=i,e={},r=i.defaultShowCode?"vue":"js";return Object.entries(t.dependencies).forEach(([s,{type:n,value:o}])=>{e[s]={content:n==="FILE"?o:`export default ${JSON.stringify(o)}`,isBinary:false};}),e[`index.${r}`]={content:`import Vue from 'vue';
import App from './${Object.keys(t.dependencies)[0]}';

new Vue({
  render: h => h(App),
}).$mount('#app');
`,isBinary:false},e["index.html"]={content:`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vue 2 Demo</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,isBinary:false},e["package.json"]={content:JSON.stringify({dependencies:{vue:"^2.7.16"},devDependencies:{"@vue/cli-service":"^5.0.0","vue-template-compiler":"^2.7.16"},name:"vue2-demo",private:true,scripts:{build:"vue-cli-service build",serve:"vue-cli-service serve"},version:"1.0.0"},null,2),isBinary:false},getParameters({files:e})},getStackBlitzParams(i){let{asset:t}=i,e={};return Object.entries(t.dependencies).forEach(([r,{type:s,value:n}])=>{e[r]=s==="FILE"?n:`export default ${JSON.stringify(n)}`;}),e["main.js"]=`import Vue from 'vue';
import App from './${Object.keys(t.dependencies)[0]}';

new Vue({
  render: h => h(App),
}).$mount('#app');
`,e["index.html"]=`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vue 2 Demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.js"><\/script>
  </body>
</html>`,{dependencies:{vue:"^2.7.16"},description:"",files:e,template:"vue",title:"Vue 2 Demo"}}},c=a;export{c as default};