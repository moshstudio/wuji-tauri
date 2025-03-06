package snow.player;

import android.content.Context;
import android.os.Bundle;

import androidx.annotation.NonNull;

import com.google.common.base.Preconditions;
import com.tencent.mmkv.MMKV;

/**
 * 用于保存播放器的基本配置信息。
 * <p>
 * 支持跨进程访问。
 */
class PlayerConfig {
    private static final String KEY_SOUND_QUALITY = "sound_quality";
    private static final String KEY_AUDIO_EFFECT_CONFIG = "audio_effect_config";
    private static final String KEY_AUDIO_EFFECT_ENABLED = "audio_effect_enabled";
    private static final String KEY_ONLY_WIFI_NETWORK = "only_wifi_network";
    private static final String KEY_IGNORE_AUDIO_FOCUS = "ignore_audio_focus";

    private final MMKV mMMKV;

    public PlayerConfig(@NonNull Context context, @NonNull String id) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(id);

        MMKV.initialize(context);
        mMMKV = MMKV.mmkvWithID("PlayerConfig:" + id, MMKV.MULTI_PROCESS_MODE);
    }

    /**
     * 获取首选音质。
     *
     * @return 当前的首选音质。
     * @see SoundQuality
     */
    @NonNull
    public SoundQuality getSoundQuality() {
        return SoundQuality.values()[mMMKV.decodeInt(KEY_SOUND_QUALITY, 0)];
    }

    /**
     * 设置首选音质。
     *
     * @param soundQuality 要设置的首选音质。只能是这些值之一：{@link SoundQuality#STANDARD},
     *                     {@link SoundQuality#LOW},
     *                     {@link SoundQuality#HIGH},
     *                     {@link SoundQuality#SUPER}
     * @see SoundQuality
     */
    public void setSoundQuality(@NonNull SoundQuality soundQuality) {
        Preconditions.checkNotNull(soundQuality);
        mMMKV.encode(KEY_SOUND_QUALITY, soundQuality.ordinal());
    }

    /**
     * 获取音频特效的配置。
     *
     * @return 音频特效的配置
     */
    @NonNull
    public Bundle getAudioEffectConfig() {
        return mMMKV.decodeParcelable(KEY_AUDIO_EFFECT_CONFIG, Bundle.class, new Bundle());
    }

    /**
     * 修改音频特效的配置。
     */
    public void setAudioEffectConfig(@NonNull Bundle audioEffectConfig) {
        Preconditions.checkNotNull(audioEffectConfig);
        mMMKV.encode(KEY_AUDIO_EFFECT_CONFIG, audioEffectConfig);
    }

    /**
     * 判断是否已启用音频特效。
     *
     * @return 是否已启用音频特效。
     */
    public boolean isAudioEffectEnabled() {
        return mMMKV.decodeBool(KEY_AUDIO_EFFECT_ENABLED, false);
    }

    /**
     * 设置是否启用音频特效。
     *
     * @param audioEffectEnabled 是否启用音频特效。
     */
    public void setAudioEffectEnabled(boolean audioEffectEnabled) {
        mMMKV.encode(KEY_AUDIO_EFFECT_ENABLED, audioEffectEnabled);
    }

    /**
     * 是否只允许在 WiFi 网络下联网（默认为 false）。
     *
     * @return 如果返回 true，则表示只允许在 WiFi 网络下联网（默认为 false）。
     */
    public boolean isOnlyWifiNetwork() {
        return mMMKV.decodeBool(KEY_ONLY_WIFI_NETWORK, false);
    }

    /**
     * 设置是否只允许在 WiFi 网络下联网（默认为 true）。
     *
     * @param onlyWifiNetwork 是否只允许在 WiFi 网络下联网（默认为 true）。
     */
    public void setOnlyWifiNetwork(boolean onlyWifiNetwork) {
        mMMKV.encode(KEY_ONLY_WIFI_NETWORK, onlyWifiNetwork);
    }

    /**
     * 是否忽略音频焦点。
     *
     * @return 是否忽略音频焦点。
     */
    public boolean isIgnoreAudioFocus() {
        return mMMKV.decodeBool(KEY_IGNORE_AUDIO_FOCUS, false);
    }

    /**
     * 设置是否忽略音频焦点。
     *
     * @param ignoreAudioFocus 是否忽略音频焦点。如果为 true，则播放器会忽略音频焦点的获取与丢失。
     */
    public void setIgnoreAudioFocus(boolean ignoreAudioFocus) {
        mMMKV.encode(KEY_IGNORE_AUDIO_FOCUS, ignoreAudioFocus);
    }
}
