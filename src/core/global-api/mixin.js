/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 将mixin中的选项拷贝到Vue.options中
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
