# Vue实例首次渲染过程

## Vue初始化实例成员，静态成员

## new Vue()，执行this._init

## 执行带编译器中定义的vm.$mount()

- ### scr/platforms/web/entry-runtime-with-compiler.js

- ### 如果没有传递render，把模板编译成render函数

- ### compileToFunctions()生成render()渲染函数

- ### options.render = render

## 执行runtime版本中定义的vm.$mount()

- ### src/platforms/web/runtime/index.js

- ## 获取el

- ### mountComponent()

## 执行mountComponent(this.el)

- ### src/core/instance/lifecycle.js

- ### 判断是否有render选项，如果没有并且传入了模板，在开发模式下发送警告

- ### 触发beforeMount钩子

- ### 定义updateComponent

  - vm._update(vm._render(), ...)
  - vm._render()渲染，渲染虚拟DOM
  - vm._update()更新，将虚拟DOM转换成真实DOM

- ### 创建Watcher实例

  - 传递updateComponent函数
  - 调用get()方法

- ### 触发mounted钩子函数

- return vm

## 执行watcher.get()

- ### 创建wachter会调用一次get

- ### 调用updateComponent

- ### 调用vm._render()创建VNode

  - 调用render.call(vm._renderProxy, vm.$createElement)
  - 调用实例化时Vue传入的render()
  - 或者编译template生成render()
  - 返回VNode

- ### 调用vm._update(vnode, ...)

  - 调用vm.__ patch __(vm.$el, vnode)挂载真实DOM
  - 记录vm.$el