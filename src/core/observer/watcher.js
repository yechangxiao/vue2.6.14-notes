/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  // 有三种watcher，渲染watcher/computed watcher/ 侦听器watcher
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    // 是否是渲染watcher
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 存储所有的watcher，包括渲染watcher、侦听watcher、computed watcher
    vm._watchers.push(this)
    // options
    // 对于渲染watcher，会传入before函数，用于触发beforeUpdate生命周期钩子，其他的属性都为空
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      // 是否延迟执行，computed中的watcher需要延迟执行
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 当是侦听watcher的时候，expOrFn是字符串，例如：watcher: { 'person.name': function... }
      // parsePath返回一个函数获取person.name的值，调用getter函数的时候会读取person.name，然后触发get，进行收集依赖
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 当是computed watcher的时候lazy为true
    // 计算属性对应的方法是在模板中进行调用的，在render的过程中调用的，所以不需要进行求值
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 如果是组件，需要把父组件的watcher先保存起来，先渲染内部的组件
    // 给Dep.target赋值，进行依赖收集
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 对应渲染watcher，调用updateComponent渲染视图
      // 对于用户watcher，则是获取属性
      value = this.getter.call(vm, vm)
    } catch (e) {
      // 对于用户watcher的错误处理
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 对于深度监听的属性，需要触发所有属性的watcher
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 简单理解就是把watcher对象添加到了dep的subs数组中
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      // watcher中也存了dep，为了处理一个很小的问题
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 就是将watcher添加到dep的subs数组中
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    // 当计算属性的watcher进行更新的时候，lazy为true
    // 更新是在渲染watcher中进行更新的
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      // 把当前watcher放到一个队列中
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // watcher是否存活状态
    if (this.active) {
      // 当是渲染watcher的时候，创建watcher的时候就会执行这个get方法
      // 渲染watcher没有返回值，value为undefined
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        //深度监听和对象/数组上的监听应触发
        //当值相同时，因为值可能
        //已经变化了。
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        // user的作用
        if (this.user) {
          // 对于用户传入的cb，在一个具有错误处理的方法中进行调用
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          // 对于不是用户传入的watcher直接调用cb
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
