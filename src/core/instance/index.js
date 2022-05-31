import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
// 此处不使用class是为了方便给Vue原型中混入成员，也就是给实例混入成员
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
/* 以下方法都是给Vue.prototype中注入属性和方法 */

// 给Vue的原型挂载_init()方法，作为入口初始化vm
initMixin(Vue)
// 给Vue原型添加$data/$props/$set/$delete/$watch属性
stateMixin(Vue)
// 给Vue原型添加$on/$once/$emit方法
eventsMixin(Vue)
// 给Vue原型添加生命周期相关的混入方法
// _update(调用了__patch__将虚拟DOM转换成真实DOM)/$forceUpdate(强制更新)/$destroy(销毁实例)
lifecycleMixin(Vue)
// 给Vue原型添加渲染相关的帮助函数、_render、$nextTick
renderMixin(Vue)

export default Vue
