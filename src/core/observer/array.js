/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 使用数组的原型创建一个新的对象
export const arrayMethods = Object.create(arrayProto)
// 定义需要进行响应式处理的方法，这些方法都会修改原数组
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 保存数组原方法
  const original = arrayProto[method]
  // 调用Object.defineProperty重新定义以上数组的方法
  def(arrayMethods, method, function mutator (...args) {
    // 执行数组的原方法
    const result = original.apply(this, args)
    // this指向调用该方法的数组实例
    const ob = this.__ob__
    // 用于存储数组中新增的元素
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 对于新插入的元素，将新插入的元素设置成响应式的数据
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 调用了修改数组的方法，调用数组的ob对象发送通知
    ob.dep.notify()
    return result
  })
})
