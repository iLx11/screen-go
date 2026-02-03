import { reactive } from 'vue'
import { useConfigStore } from '@/stores/configStore'
// import { useMenuStore } from '@/stores/menuStore'

const win = window as any
// const menuStore = useMenuStore()
const configStore = useConfigStore()

const storeObj = reactive({
  configStore,
  // menuStore,
})

/********************************************************************************
 * @brief:
 * @param {any} obj
 * @param {string} path
 * @param {any} value
 * @return {*}
 ********************************************************************************/
export function setPathValue(obj: any, path: string, value: any) {
  if (!obj || !path || typeof obj !== 'object') {
    console.warn('设置数据失败：目标对象无效或路径为空')
    return false
  }

  // 拆分路径并过滤空值（支持 'codeTemp.test.test1' 这种格式）
  const pathArr = path.split('.').filter(key => key.trim())
  if (pathArr.length === 0) return false

  // 迭代到最后一级属性的父对象
  let current = obj
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i]
    // 如果父级属性不存在，自动创建空对象（避免赋值时报错）
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  // 设置最后一级属性的值
  const lastKey = pathArr[pathArr.length - 1]
  current[lastKey] = value
  return true
}

/********************************************************************************
 * @brief: 获取对象路径值
 * @param {*} obj
 * @param {*} path
 * @return {*}
 ********************************************************************************/
export function getPathValue(obj: any, path: string) {
  if (!path) return undefined
  // 拆分路径
  const pathArr = path.split('.').filter(key => key.trim())
  // 递归/迭代获取嵌套值
  return pathArr.reduce((current, key) => {
    // 空值保护
    if (current === null || current === undefined) return undefined
    return current[key]
  }, obj)
}

/********************************************************************************
 * @brief: 解析路径字符串，支持 "属性名" 或 "[数字]" 格式
 * @param {string} path
 * @return {*}
 ********************************************************************************/
export function parsePath(path: string) {
  if (!path || typeof path !== 'string') return []

  // 正则匹配：拆分 "属性名" 或 "[数字]"
  const regex = /([^\.\[]+)|(\[\d+\])/g
  const parts = []

  let match
  while ((match = regex.exec(path)) !== null) {
    const part = match[0].trim()
    if (!part) continue

    // 处理数组索引（如 [2] → 2）
    if (part.startsWith('[') && part.endsWith(']')) {
      const index = parseInt(part.slice(1, -1), 10)
      // 校验索引是否为有效数字
      if (!isNaN(index)) {
        parts.push(index)
      } else {
        console.warn(`无效的数组索引：${part}`)
      }
    } else {
      // 处理对象属性（如 aa、bb）
      parts.push(part)
    }
  }

  return parts
}

/********************************************************************************
 * @brief: 获取混合路径值（支持 "属性名" 或 "[数字]" 格式）
 * @param {any} obj
 * @param {string} path
 * @return {*}
 ********************************************************************************/
export function getMixedPathValue(obj: any, path: string) {
  // 边界校验：目标对象无效/路径为空 → 返回undefined
  if (!obj || typeof obj !== 'object' || !path) {
    console.warn('获取失败：目标对象或路径无效')
    return undefined
  }

  const pathParts = parsePath(path)
  if (pathParts.length === 0) return undefined

  let current = obj
  // 逐层遍历路径节点
  for (const key of pathParts) {
    // 空值保护：当前节点为null/undefined → 直接返回undefined
    if (current === null || current === undefined) {
      console.warn(`路径节点不存在：${key}`)
      return undefined
    }

    // 处理数组索引（索引越界返回undefined）
    if (Array.isArray(current) && typeof key === 'number') {
      if (key >= current.length || key < 0) {
        console.warn(`数组索引越界：${key}（数组长度：${current.length}）`)
        return undefined
      }
      current = current[key]
    }
    // 处理对象属性（属性不存在返回undefined）
    else if (typeof current === 'object') {
      if (!current.hasOwnProperty(key)) {
        console.warn(`对象属性不存在：${key}`)
        return undefined
      }
      current = current[key]
    }
    // 非对象/数组节点（如原始类型）→ 无法继续遍历
    else {
      console.warn(`路径节点非对象/数组：${key}`)
      return undefined
    }
  }

  // 返回最终节点的值
  return current
}

/********************************************************************************
 * @brief: 设置混合路径值（支持 "属性名" 或 "[数字]" 格式）
 * @param {any} obj
 * @param {string} path
 * @param {any} value
 * @return {*}
 ********************************************************************************/
export function setMixedPathValue(obj: any, path: string, value: any) {
  if (!obj || typeof obj !== 'object' || !path) {
    console.warn('设置失败：目标对象或路径无效')
    return false
  }

  // 拆分路径
  const pathParts = parsePath(path)
  if (pathParts.length === 0) return false

  let current = obj
  // 遍历到倒数第二个节点（父节点）
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i]
    const nextKey = pathParts[i + 1]

    // 情况1：当前节点是数组，key是索引
    if (Array.isArray(current) && typeof key === 'number') {
      // 索引越界时：自动补空元素（避免赋值时报错）
      if (key >= current.length) {
        // 填充空值到目标索引位置
        while (current.length <= key) {
          current.push(null)
        }
      }
      // 下一个节点是数组索引 → 初始化空数组；否则初始化空对象
      if (current[key] === null || current[key] === undefined) {
        current[key] = typeof nextKey === 'number' ? [] : {}
      }
      current = current[key]
    }
    // 情况2：当前节点是对象，key是属性名
    else if (typeof current === 'object' && current !== null) {
      // 属性不存在时：初始化空数组/对象（根据下一个节点类型）
      if (!current[key]) {
        current[key] = typeof nextKey === 'number' ? [] : {}
      }
      current = current[key]
    }
    // 无效节点（如原始类型）
    else {
      console.warn(`路径节点无效：${pathParts.slice(0, i + 1).join('.')}`)
      return false
    }
  }

  // 设置最后一个节点的值
  const lastKey = pathParts[pathParts.length - 1]
  // 处理数组索引越界（自动扩展数组）
  if (Array.isArray(current) && typeof lastKey === 'number') {
    while (current.length <= lastKey) {
      current.push(null)
    }
  }
  current[lastKey] = value
  return true
}

/********************************************************************************
 * @brief: 从store中获取数据
 * @param {any} objData
 * @param {function} callback
 * @return {*}
 ********************************************************************************/
export function storeGetter(objData: any, callback: (path: string) => void) {
  if (objData?.get) {
    const path = String(objData.get).trim()
    if (!path) {
      console.warn('获取数据的路径不能为空')
      return
    }
    // 获取值并发送
    let targetValue = getMixedPathValue(storeObj, path)
    const tempObj = {
      set: path,
      value: '',
    }
    if (targetValue === null || targetValue === undefined) {
      tempObj.value = targetValue
    } else if (typeof targetValue === 'object') {
      try {
        tempObj.value = JSON.stringify(targetValue)
      } catch (e) {
        console.error('数据序列化失败：', e)
        tempObj.value = targetValue
      }
    } else {
      tempObj.value = targetValue
    }

    win.api?.setConfigStore(tempObj)
    // 触发回调
    callback(path)
    return
  }
}

/********************************************************************************
 * @brief: 从store中设置数据
 * @param {any} objData
 * @param {function} callback
 * @return {*}
 ********************************************************************************/
export function storeSetter(
  objData: any,
  callback: (path: string, value: any) => void
) {
  if (objData?.set && objData.value !== undefined) {
    try {
      // 校验路径合法性
      const setPath = String(objData.set).trim()
      if (!setPath) {
        console.warn('设置数据的路径不能为空')
        return
      }

      // 要设置的目标值（保留原始类型，可根据需求加反序列化逻辑）
      const setValue = objData.value
      // 反序列化：如果值是 JSON 字符串，自动转为对象（可选，根据你的场景）
      let finalValue = setValue
      if (typeof setValue === 'string') {
        try {
          finalValue = JSON.parse(setValue)
        } catch (e) {
          // 不是 JSON 字符串则保留原始值
          finalValue = setValue
        }
      }

      // 执行嵌套路径赋值
      const isSuccess = setMixedPathValue(storeObj, setPath, finalValue)

      if (isSuccess) {
        console.log(`设置数据成功：${setPath} =`, finalValue)
      } else {
        console.error(`设置数据失败：路径 ${setPath} 无效`)
      }

      // 特殊配置回调
      callback(setPath, finalValue)
    } catch (e) {
      console.error('设置数据异常：', e)
    }
    return
  }
}
