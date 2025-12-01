/**
 * Vue 2 JSX Type Declarations
 * 解决 Vue 2 组件在 TSX 中使用时的类型错误
 */
import Vue, { PluginObject, VNode, VueConstructor } from 'vue';

// 扩展 JSX 命名空间
declare global {
  namespace JSX {
    // 允许任意元素作为 JSX 元素
    type Element = VNode
    type ElementClass = Vue
    interface ElementAttributesProperty {
      $props: Record<string, never>;
    }
    interface IntrinsicElements {
      [elem: string]: any;
    }
    interface IntrinsicAttributes {
      // Vue 2 attrs
      attrs?: any;
      class?: any;
      // Vue 2 指令
      directives?: any[];
      // Vue 2 domProps
      domProps?: any;
      // Vue 2 JSX 通用属性
      key?: string | number;
      // Vue 2 原生事件绑定
      nativeOn?: Record<string, ((...args: any[]) => void) | Array<(...args: any[]) => void>>;
      // Vue 2 事件绑定
      on?: Record<string, ((...args: any[]) => void) | Array<(...args: any[]) => void>>;
      // Vue 2 props 传递
      props?: any;
      ref?: string | ((el: any) => void);
      // Vue 2 scopedSlots
      scopedSlots?: any;
      slot?: string;
      style?: any;
    }
  }
}

/**
 * Element UI 组件类型
 * 同时满足 Component 和 PluginObject 接口，支持 Vue.use() 调用
 */
type ElementUIComponent = VueConstructor<Vue> & PluginObject<any>;

// 声明 Element UI 组件为有效的 JSX 元素和 Vue 插件
declare module 'element-ui' {
  export const Button: ElementUIComponent;
  export const Card: ElementUIComponent;
  export const Form: ElementUIComponent;
  export const FormItem: ElementUIComponent;
  export const Input: ElementUIComponent;
  export const Select: ElementUIComponent;
  export const Option: ElementUIComponent;
  export const Message: {
    (options: any): void;
    close: () => void;
    closeAll: () => void;
    error: (msg: string | any) => void;
    info: (msg: string | any) => void;
    success: (msg: string | any) => void;
    warning: (msg: string | any) => void;
  };
  export const MessageBox: {
    (options: any): Promise<any>;
    alert: (message: string, title?: string, options?: any) => Promise<any>;
    close: () => void;
    confirm: (message: string, title?: string, options?: any) => Promise<any>;
    prompt: (message: string, title?: string, options?: any) => Promise<any>;
  };
  export const Notification: {
    (options: any): void;
    close: (id: string) => void;
    closeAll: () => void;
    error: (options: any) => void;
    info: (options: any) => void;
    success: (options: any) => void;
    warning: (options: any) => void;
  };
  export const Loading: {
    service: (options?: any) => { close: () => void };
  };
  export const Table: ElementUIComponent;
  export const TableColumn: ElementUIComponent;
  export const Dialog: ElementUIComponent;
  export const Row: ElementUIComponent;
  export const Col: ElementUIComponent;
  export const Menu: ElementUIComponent;
  export const MenuItem: ElementUIComponent;
  export const Submenu: ElementUIComponent;
  export const Tabs: ElementUIComponent;
  export const TabPane: ElementUIComponent;
  export const Dropdown: ElementUIComponent;
  export const DropdownMenu: ElementUIComponent;
  export const DropdownItem: ElementUIComponent;
  export const Checkbox: ElementUIComponent;
  export const CheckboxGroup: ElementUIComponent;
  export const Radio: ElementUIComponent;
  export const RadioGroup: ElementUIComponent;
  export const Switch: ElementUIComponent;
  export const DatePicker: ElementUIComponent;
  export const TimePicker: ElementUIComponent;
  export const Upload: ElementUIComponent;
  export const Progress: ElementUIComponent;
  export const Pagination: ElementUIComponent;
  export const Badge: ElementUIComponent;
  export const Avatar: ElementUIComponent;
  export const Tag: ElementUIComponent;
  export const Alert: ElementUIComponent;
  export const Tooltip: ElementUIComponent;
  export const Popover: ElementUIComponent;
  export const Drawer: ElementUIComponent;
  export const Cascader: ElementUIComponent;
  export const ColorPicker: ElementUIComponent;
  export const Transfer: ElementUIComponent;
  export const Tree: ElementUIComponent;
  export const Slider: ElementUIComponent;
  export const Rate: ElementUIComponent;
  export const Steps: ElementUIComponent;
  export const Step: ElementUIComponent;
  export const Carousel: ElementUIComponent;
  export const CarouselItem: ElementUIComponent;
  export const Collapse: ElementUIComponent;
  export const CollapseItem: ElementUIComponent;
  export const Timeline: ElementUIComponent;
  export const TimelineItem: ElementUIComponent;
  export const Divider: ElementUIComponent;
  export const Calendar: ElementUIComponent;
  export const Image: ElementUIComponent;
  export const Backtop: ElementUIComponent;
  export const InfiniteScroll: PluginObject<any>;
  export const PageHeader: ElementUIComponent;
  export const CascaderPanel: ElementUIComponent;
  export const Skeleton: ElementUIComponent;
  export const SkeletonItem: ElementUIComponent;
  export const Empty: ElementUIComponent;
  export const Descriptions: ElementUIComponent;
  export const DescriptionsItem: ElementUIComponent;
  export const Result: ElementUIComponent;

  // 默认导出 - 整个 ElementUI 作为插件
  const ElementUI: PluginObject<any>;
  export default ElementUI;
}

/**
 * 修复 Vue 2.7 Options API 在 Volar 中的类型推断问题
 * 让 Vue.extend 返回的组件能正确推断 data、methods、computed 等
 */
declare module 'vue' {
  import { ComponentOptions, VueConstructor } from 'vue';

  // 重新声明 Vue.extend 以获得更好的类型推断
  interface VueConstructor {
    extend<Data, Methods, Computed, Props>(
      options: ComponentOptions<Vue, Data, Methods, Computed, Props> &
        ThisType<Vue & Data & Methods & Computed & Props>,
    ): VueConstructor<Vue & Data & Methods & Computed & Props>;
  }
}

export {};
