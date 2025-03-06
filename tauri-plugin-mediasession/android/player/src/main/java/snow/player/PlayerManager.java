package snow.player;

import android.os.Bundle;

import androidx.annotation.NonNull;

import channel.helper.Channel;
import channel.helper.UseOrdinal;

/**
 * 该接口定义了用于管理播放器的基本功能。
 */
@Channel
public interface PlayerManager {

    /**
     * 设置播放器的首选音质（默认为 {@link SoundQuality#STANDARD}）。
     *
     * @param soundQuality 要设置的音质
     * @see SoundQuality#STANDARD
     * @see SoundQuality#LOW
     * @see SoundQuality#HIGH
     * @see SoundQuality#SUPER
     */
    void setSoundQuality(@UseOrdinal SoundQuality soundQuality);

    /**
     * 修改音频特效的配置。
     */
    void setAudioEffectConfig(Bundle config);

    /**
     * 设置是否启用音频特效（如：均衡器）（默认为 false）。
     *
     * @param enabled 是否启用音频特效
     */
    void setAudioEffectEnabled(boolean enabled);

    /**
     * 设置是否只允许在 WiFi 网络下联网（默认为 false）。
     *
     * @param onlyWifiNetwork 是否只允许在 WiFi 网络下联网
     */
    void setOnlyWifiNetwork(boolean onlyWifiNetwork);

    /**
     * 设置是否忽略音频焦点。
     *
     * @param ignoreAudioFocus 是否忽略音频焦点。如果为 true，则播放器会忽略音频焦点的获取与丢失。
     */
    void setIgnoreAudioFocus(boolean ignoreAudioFocus);

    /**
     * 关闭播放器并终止 Service。
     */
    void shutdown();
}
