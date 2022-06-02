# 响应式处理的过程

## initState() ——> initData()——>observe()

## observe(value)

- ### src/core/observer/index.js

- ### 判断value是否是对象，不是则返回

- ### 判断value对象是否有__ ob __，如果有说明被观察过，返回

- ### 如果没有，创建observer对象

- ### 返回observer对象

## Observer

- ### src/core/observer/index.js

- ### 给value对象定义不可枚举的__ ob __属性，记录当前的observer对象

- ### 数组的响应式处理

  - 对数组的几个特殊的方法进行处理，将改造好的方法定义到数组的原型中，数组的原型中由改造好的方法和数组初始的原型构成，即数组的原型的原型为数组初始的原型
  - 这这个特殊的方法被调用的时候，找到数组对应的__ ob __属性中的dep属性的notify方法发送通知
  - 遍历数组中的每个成员，如果成员是对象，把对象转换为响应式

- ### 对象的响应式处理，调用walk方法遍历属性，对每个属性调用defineReactive

## Observer

- ### src/core/observer/index.js

- ### 为每一个属性创建dep对象

- ### 如果当前属性的值是对象，调用observe转换为响应式对象(递归将所有子属性转换为响应式对象)

- ### 定义getter

  - 收集依赖，为每个属性收集依赖，如果属性是对象，也要为子对象收集依赖
  - 返回属性的值

- ### 定义setter

  - 保存新值
  - 如果新值是对象，调用observe把新值也转换为响应式对象
  - 发送通知，调用dep.notify()

## 依赖收集

- ### 在watcher对象的get方法中调用pushTarget，在pushTarget方法中记录Dep.target属性

- ### 访问data中的成员的时候收集依赖，在defineReactive的getter中收集依赖

- ### 把属性对应的watcher对象添加到dep的subs数组中

- ### 如果属性的值也是对象，会创建childOb对象为子对象收集依赖，目的是子对象添加和删除成员时发送通知，数组内容发生变化的时候就用到了childOb

## Watcher

- ### 当数据变化的时候，dep.notify()调用watcher对象的update()方法发送通知

- ### queueWatcher()判断watcher是否被处理，如果没有则添加到queue队列中，并调用flushSchedulerQueue()

- ### 执行flushSchedulerQueue()

  - 触发beforeUpdate钩子函数
  - 调用watcher.run() ->get -> getter() -> updateComponent，完成视图的渲染（这是对于渲染watcher）
  - 清空上一次的依赖
  - 触发actived钩子函数
  - 触发updated钩子函数