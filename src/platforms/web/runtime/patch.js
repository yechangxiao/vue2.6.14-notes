/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// platformModules是处理attrs,class,events，transitions等和平台相关的模块
// baeModules处理指令和ref模块
const modules = platformModules.concat(baseModules)

// nodeOps是对DOM进行操作的一些方法
export const patch: Function = createPatchFunction({ nodeOps, modules })
