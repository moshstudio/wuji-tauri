import { showDialog } from 'vant';
import { router } from '@/router';

/**
 * 统一的会员提示对话框
 * @param message 提示消息
 * @param title 标题，默认为 '会员功能'
 */
export async function showVipDialog(
  message = '此功能为会员专属，是否前往查看会员方案？',
  title = '会员功能',
) {
  try {
    const action = await showDialog({
      title,
      message,
      showCancelButton: true,
      confirmButtonText: '去开通',
      cancelButtonText: '取消',
    });
    if (action === 'confirm') {
      router.push({ name: 'VipDetail' });
    }
    return action;
  }
  catch {
    return 'cancel';
  }
}
