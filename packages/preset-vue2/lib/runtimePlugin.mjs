import {getParameters}from'codesandbox-import-utils/lib/api/define';var m={getCodeSandboxParams(n){let{asset:t,...i}=n,e={},s=n.defaultShowCode?"vue":"js";return Object.entries(t.dependencies).forEach(([r,{type:d,value:o}])=>{e[r]={content:d==="FILE"?o:`export default ${JSON.stringify(o)}`,isBinary:false};}),e[`index.${s}`]={content:`import Vue from 'vue';
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
</html>`,isBinary:false},e["package.json"]={content:JSON.stringify({name:"vue2-demo",version:"1.0.0",private:true,scripts:{serve:"vue-cli-service serve",build:"vue-cli-service build"},dependencies:{vue:"^2.7.16"},devDependencies:{"@vue/cli-service":"^5.0.0","vue-template-compiler":"^2.7.16"}},null,2),isBinary:false},getParameters({files:e})},getStackBlitzParams(n){let{asset:t}=n,i={};return Object.entries(t.dependencies).forEach(([e,{type:s,value:r}])=>{i[e]=s==="FILE"?r:`export default ${JSON.stringify(r)}`;}),i["main.js"]=`import Vue from 'vue';
import App from './${Object.keys(t.dependencies)[0]}';

new Vue({
  render: h => h(App),
}).$mount('#app');
`,i["index.html"]=`<!DOCTYPE html>
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
</html>`,{title:"Vue 2 Demo",description:"",template:"vue",files:i,dependencies:{vue:"^2.7.16"}}}},c=m;export{c as default};