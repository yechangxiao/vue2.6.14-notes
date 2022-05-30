import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
// 此处不使用class是为了方便给Vue实例混入实例成员
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
/* 以下方法都是给Vue.prototype中注入属性和方法 */

// 注册vm的_init()方法，初始化vm
initMixin(Vue)
// 注册vm的$data/$props/$set/$delete/$watch
stateMixin(Vue)
// 初始化事件相关方法$on/$once/$emit
eventsMixin(Vue)
// 初始化生命周期相关的混入方法
// _update/$forceUpdate/$destroy
lifecycleMixin(Vue)
// 混入render、$nextTick/_render
renderMixin(Vue)

export default Vue
