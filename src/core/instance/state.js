/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // 将props中的数据转化为响应式数据注入到vm中的_props中
  // 并且将props数据注入到vm实例中，可通过this进行访问
  if (opts.props) initProps(vm, opts.props)
  // 初始化methods，将methods注入到vm中
  // 判断是否与props重名，并绑定函数的this为vm实例
  if (opts.methods) initMethods(vm, opts.methods)
  // 将data中的数据注入到vm实例中，并转换为响应式数据
  // 判断是否与props/methods重名
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  // 初始化computed，创建watcher
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  // 定义vm._props用于存放响应式的props属性
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 将props属性定义成响应式数据
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 将props属性注入到vm实例中，便于通过this访问
    // 通过thi访问的属性也是通过vm._props获取的
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  // 初始化_data，组件中data是函数，调用函数返回结果
  // 否则直接返回data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 获取data中的所有属性
  const keys = Object.keys(data)
  // 获取props/methods
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  // 判断data上的属性是否和props/methods中的属性重名
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 对于不是_/$开头的属性，注入到vm中
      // 当获取vm.key的时候，是从vm._data.key中获取的
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  // 响应式处理入口
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

// 计算属性创建的watcher,lazy为true
const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    // 计算属性可以定义成函数或者具有get/set的对象
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(`The computed property "${key}" is already defined as a method.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      // 判断methods是否为一个函数
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 判断methods中名称是否和props重复
      // 因为methods和props都会注入到vm实例中，不能有同名属性
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      // 判断methods名称是否与vue中定义的_或者$开头的私有属性名称冲突
      // 因为vue中_和$开头的都是私有成员，不建议这样命名
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // methods属性不是函数，则返回空函数
    // 是函数将methods中的this绑定到Vue实例中
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

// 处理完参数的差异后，最终还是调用vm.$watch()方法
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    // 我们定义侦听器的时候可以传入回调数组，它们会被逐一调用
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 传入的是对象，里面有handler函数
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 传入的是字符串，则去vue实例中获取对应的methods
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  // 把实例上的_data和_props赋给$data和$props
  // 使用defineProperty进行定义是为了添加set方法，在开发模式下提供警告
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // 和Vue.set/Vue.delete是一样的
  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  // $watch没有静态方法，因为$watch内部要使用vue的实例
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    // 获取Vue实例this
    const vm: Component = this
    if (isPlainObject(cb)) {
      // 判断如果cb是对象，执行createWatcher继续对象进行解析
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    // 标记为用户watcher
    // 当执行用户watcher的时候，需要进行错误处理
    options.user = true
    // 创建用户watcher对象
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      // 立即执行一次cb回调，并且把watcher.value的值传入
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      // 在一个具有错误处理的函数中执行，因为用户传递的cb不一定进行了错误处理
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    // 返回取消监听的方法
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
