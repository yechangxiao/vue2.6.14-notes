/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  // 观测对象
  value: any;
  // 依赖对象
  dep: Dep;
  // 实例计数器
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // 每一个Observer实例都有一个dep对象，用于为子对象收集依赖
    // 当子对象添加或删除成员的时候也需要进行发送通知
    // 这个不同于defineReactive中的dep，是用于收集每一个属性的依赖
    this.dep = new Dep()
    // 初始化实例的vmCount为0
    this.vmCount = 0
    // 对Object.defineProperty进行了封装，并将enumerable设为false
    // 后续对value进行遍历设为get/set的时候就不会枚举__ob__属性
    // 将实例挂载到观察对象的__ob__属性上
    def(value, '__ob__', this)
    // 数组的响应式处理
    if (Array.isArray(value)) {
      // 判断浏览器是否支持__proto__属性，用于浏览器兼容
      if (hasProto) {
        // protoAugment仅仅把value的原型__proto__设置为arrayMethods
        // arrayMethods用于修补一些需要进行响应式处理的方法
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 为数组中的每一个对象创建一个observer实例，所以数组中子项如果是对象，那么是响应式的
      this.observeArray(value)
    } else {
      // 遍历对象中的每一个属性，转换成setter/getter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 观察对象的每一个属性
    const keys = Object.keys(obj)
    // 遍历每一个属性，设置为响应式数据
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // value不是对象或者是vnode则不需要响应式处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果value有__ob__(observer对象)属性，说明被处理过，获取并返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 一个是否应该被观察的开关，用于处理不需要被观察的对象
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    // 对象是否可被扩展，通过Object.preventExtensions/seal/freeze可以标记对象不可扩展
    // 通过这样处理可以让数据不被观察
    Object.isExtensible(value) &&
    // 如果是vue实例则不进行响应式处理
    !value._isVue
  ) {
    // 创建一个Observer对象
    ob = new Observer(value)
  }
  // 如果是根数据，进行计数
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 为一个对象定义一个响应式的属性
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  // 是否只遍历第一层的属性，而不进行深度遍历
  shallow?: boolean
) {
  // 创建依赖对象实例，用于收集依赖
  const dep = new Dep()
  // 获取obj的属性描述符对象
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 对于不可配置的属性直接返回
  if (property && property.configurable === false) {
    return
  }

  // 获取用户定义的存取器函数
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 特殊情况，如果用户没有传递value，获取value
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 是否递归观察子对象，将子对象属性都转换成getter/setter，返回子观察对象
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果用户设置了getter则value等于getter调用的返回值
      // 否则直接赋值属性值
      const value = getter ? getter.call(obj) : val
      // 如果当前存在依赖目标，即watcher对象，则建立依赖
      // 在创建watcher实例，调用get方法时对Dep.target进行赋值
      // src/core/instance/lifecycle/mountComponent中创建watcher实例
      if (Dep.target) {
        dep.depend()
        // 如果子观察目标存在，建立子对象的依赖关系
        if (childOb) {
          // 每一个observe对象中都有一个dep属性，存放了依赖对象实例
          // 注意：这个不同于上面的dep，上面的dep用于给每一个属性收集依赖
          // 当子对象添加或删除成员的时候也需要进行发送通知
          childOb.dep.depend()
          // 如果属性是数组，则特殊处理收集数组对象依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性值
      return value
    },
    set: function reactiveSetter (newVal) {
      // 如果用户设置了getter则value等于getter调用的返回值
      // 否则赋值属性值
      const value = getter ? getter.call(obj) : val
      // 如果新值等于旧值或者新旧值都为NaN则不执行
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 如果有getter没有setter，表示属性只读，直接返回
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 如果用户设置了setter则调用，否则直接更新新值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果新值是对象，观察子对象并返回子的观察对象
      childOb = !shallow && observe(newVal)
      // 派发更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 判断target是否是数组，索引key是否是合法的索引
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    // 通过splice对key位置的元素进行替换
    // splice在array.js已经进行了响应式的处理
    target.splice(key, 1, val)
    return val
  }
  // 如果属性已经在对象中存在则直接赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 获取target中的observer对象
  const ob = (target: any).__ob__
  // 如果target是vue实例或者$data则直接返回，$data的ob属性的vmCount是1，其他对象的vmCount是0
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果ob不存在，则target不是响应式对象，也没必要做处理了，直接返回
  if (!ob) {
    target[key] = val
    return val
  }
  // 把属性设置为响应式属性
  defineReactive(ob.value, key, val)
  // 发送通知
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 判断是否是数组，以及key是否合法
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 如果是数组通过splice删除
    // splice在array.js已经进行了响应式的处理
    target.splice(key, 1)
    return
  }
  // 获取target中的observer对象
  const ob = (target: any).__ob__
  // 如果target是vue实例或者$data则直接返回，$data的ob属性的vmCount是1，其他对象的vmCount是0
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果target对象没有key属性直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除属性
  delete target[key]
  // 判断是否是响应式的数据，不是则直接返回
  if (!ob) {
    return
  }
  // 通过ob发送通知
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
