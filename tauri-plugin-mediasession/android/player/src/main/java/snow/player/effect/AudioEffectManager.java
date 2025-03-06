package snow.player.effect;

import android.os.Bundle;

import androidx.annotation.NonNull;

/**
 * 用于管理和同步音频特效的配置。
 */
public interface AudioEffectManager {

    /**
     * 初始化音频特效的配置。
     *
     * @param config 音频特效的配置
     */
    void init(@NonNull Bundle config);

    /**
     * 更新音频特效的配置。
     *
     * @param config 新的音频特效配置。该参数会被持久化保存，如果你有某些与音频特效相关的需要持久化保存的值，可以存入该参数中。
     */
    void updateConfig(@NonNull Bundle config);

    /**
     * 对指定的 {@code audio session id} 应用音频特效。
     *
     * @param audioSessionId 要音乐音频特效的 {@code audio session id}
     */
    void attachAudioEffect(int audioSessionId);

    /**
     * 移除当前应用的音频特效。
     */
    void detachAudioEffect();

    /**
     * 释放音频特效。
     * <p>
     * 你可以在该方法中释放所有不再需要的资源。
     */
    void release();
}
