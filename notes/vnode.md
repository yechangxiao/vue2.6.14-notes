# 虚拟DOM的整体过程

## vm._init()

## vm.$mount()

## mountComponent()

## 创建Watcher对象

## updateComponent()

## vm._render()

- ### vnode = render.call(vm._renderProxy, vm.$createElement)

- ### vm.$createElement()

  - h函数，用户设置的render函数中调用
  - createElement(vm, a, b, c, d, true)

- ### vm._c()

  - h函数，模板编译的render函数中调用
  - createElement(vm, a, b, c, d, false)

- ### _createElement()

  - vnode = new VNode(config.parsePlatformTagName(tag), data, children, undefined, undefined, context)
  - vm._render()结束，返回vnode

## vm._update()

- ### 负责把虚拟DOM，渲染成真实DOM

- ### 首次执行：vm.__ patch __(vm.$el, vnode, hydrating, false)

- ### 数据更新：vm.__ patch __(prevVnode, vnode)

## vm.__ patch __()

- ### runtime/index.js中挂载到Vue.prototype.__ patch __

- ### runtime/patch.js中的patch函数

- ### 设置modules和nodeOps

- ### 调用createPatchFunction()函数返回patch函数

## patch()

- ### vnode/patch.js中的createPatchFunction返回patch函数

- ### 挂载cbs节点的属性/事件/样式操作的钩子函数

- ### 判断第一个参数是真实DOM还是虚拟DOM。对于首次加载，第一个参数就是真实DOM，转换成VNode，调用createElm

- ### 如果是数据更新，新旧节点是sameVnode执行patchVnode，也就是Diff

- ### 删除旧节点

## createElm(vnode, insertedVnodeQueue)

- ### 把虚拟节点，转换成真实DOM，并插入到DOM树

- ### 把虚拟节点的children，转换成真实DOM，并插入到DOM树

## patchVnode

- ### 对比新旧vnode，以及新旧vnode的子节点

- ### 如果新旧vnode都有子节点并且子节点不同的话，调用updateChildren对比子节点的差异

## updateChildren

- ### 从头和尾开始依次找到相同的子节点进行比较patchVnode，总共四种比较方式

  ### 不满足以上四种情况，则在老节点的子节点中查找newStartVnode，并进行处理

- ### 如果新节点比老节点多，把新增的子节点插入到DOM中

- ### 如果老节点比新节点多，把多余的老节点删除