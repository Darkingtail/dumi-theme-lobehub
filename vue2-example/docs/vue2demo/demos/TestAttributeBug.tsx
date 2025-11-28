/**
 * 测试官方插件是否有空属性名 bug
 * 如果这个组件能正常渲染和编辑，说明官方插件已经修复了 bug
 */
import { Button } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import Vue from 'vue';

export default Vue.extend({
  methods: {
    handleClick() {
      alert('on:click syntax works!');
    },
  },
  name: 'TestAttributeBug',
  render() {
    return (
      <div>
        <h3>测试 on:click 语法</h3>
        <Button on:click={this.handleClick} type="primary">
          Test on:click
        </Button>
        <Button on-click={() => alert('on-click works!')} type="success">
          Test on-click
        </Button>
      </div>
    );
  },
});
