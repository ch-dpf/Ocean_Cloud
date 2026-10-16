/**
 * 写文本到剪贴板：优先用剪贴板 API，非安全上下文（http 访问）下它不存在或被拒，
 * 此时退回临时 textarea + execCommand 的老方案。返回是否写入成功，供界面给提示。
 *
 * 临时节点必须挂在「非 inert」的容器里：`<dialog>` 用 showModal 打开时 body 是 inert 的，
 * 挂在 body 上的 textarea 选不中，execCommand 会返回 true 却什么都没复制。
 * 所以优先挂在当前弹窗内（焦点元素所在的 dialog），没有弹窗才退回 body。
 */
export async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // 继续尝试下面的兜底方案
    }
  }
  const textarea = document.createElement('textarea')
  try {
    textarea.value = value
    // 放在视口外并透明，避免影响布局与滚动；readonly 让 iOS 不弹键盘
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.setAttribute('readonly', '')
    const host =
      document.activeElement?.closest('dialog[open]') ??
      document.querySelector('dialog[open]') ??
      document.body
    host.append(textarea)
    textarea.select()
    // 只调 select() 在部分 WebKit 上不生效，补一次显式区间选择
    textarea.setSelectionRange(0, value.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
