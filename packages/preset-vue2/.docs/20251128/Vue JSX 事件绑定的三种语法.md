⏺ on:click 是 Vue JSX 的命名空间语法，用于绑定事件处理器。

Vue JSX 事件绑定的三种语法

1. 冒号语法（Namespace Syntax） - on:click

<Button on:click={this.handleClick}>Click</Button>

特点：

- 使用冒号 : 分隔命名空间和事件名
- 简洁直观
- 类似于 HTML 的内联事件写法

2. 短横线语法（Kebab-case） - on-click

<Button on-click={this.handleClick}>Click</Button>

特点：

- 使用短横线 - 连接
- 更接近 HTML 风格

3. 对象语法（Object Syntax） - on={{ click }}

<Button on={{ click: this.handleClick }}>Click</Button>

特点：

- 使用对象传递多个事件
- 更灵活，可以一次绑定多个事件

详细对比

| 语法     | 示例                      | 用途        | 官方插件支持 |
| -------- | ------------------------- | ----------- | ------------ |
| on:click | <div on:click={fn}/>      | 单个事件    | ❌ (有bug)   |
| on-click | <div on-click={fn}/>      | 单个事件    | ❌ (有bug)   |
| on={{ }} | <div on={{ click: fn }}/> | 单/多个事件 | ✅           |

实际应用

单个事件

// 三种写法都可以
<Button on:click={handleClick}>按钮1</Button>
<Button on-click={handleClick}>按钮2</Button>
<Button on={{ click: handleClick }}>按钮3</Button>

多个事件

// 只能用对象语法
<Input
on={{
      input: handleInput,
      focus: handleFocus,
      blur: handleBlur
    }}
/>

带修饰符

// 冒号语法 + 下划线修饰符
<Button on:click_stop_prevent={handleClick}>
带修饰符
</Button>

// 对象语法（不支持修饰符）
<Button on={{ click: handleClick }}>
不能用修饰符
</Button>

Vue JSX 的其他命名空间

| 命名空间  | 示例                      | 说明       |
| --------- | ------------------------- | ---------- |
| on:       | on:click={fn}             | 事件监听   |
| nativeOn: | nativeOn:click={fn}       | 原生事件   |
| props:    | props:value={val}         | 组件 props |
| domProps: | domProps:innerHTML={html} | DOM 属性   |
| attrs:    | attrs:id="foo"            | HTML 属性  |

为什么官方插件有 bug？

官方 @vue/babel-plugin-transform-vue-jsx@1.4.0 在解析 on:click 时：

// 解析过程
'on:click'
→ 分离命名空间: 'on' 和 'click'
→ 移除前缀 'on'
→ attrName 变成 '' (空字符串) ❌ BUG!
→ attrName[0].toLowerCase() → undefined[0] → 💥 崩溃

自定义插件的修复：

// 修复后
'on:click'
→ 分离: namespace='on', argument='click'
→ 移除前缀后 attrName=''
→ 检测到空值，使用 argument
→ attrName = 'click' ✅ 修复!

推荐用法

| 场景       | 推荐语法      | 原因         |
| ---------- | ------------- | ------------ |
| 单个事件   | on:click      | 简洁直观     |
| 多个事件   | on={{ }}      | 唯一选择     |
| 需要修饰符 | on:click_stop | 支持修饰符   |
| 兼容性优先 | on={{ }}      | 官方插件支持 |

总结

- on:click 是 Vue JSX 的命名空间语法
- 用于在 JSX 中绑定 Vue 事件
- 比 on={{ click }} 更简洁
- 但官方插件有 bug，需要自定义插件修复
- 现在你的项目已经修复了，可以放心使用！
