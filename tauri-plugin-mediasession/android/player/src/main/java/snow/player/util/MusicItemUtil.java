package snow.player.util;

import android.content.Context;

import androidx.annotation.NonNull;

import com.google.common.base.Charsets;
import com.google.common.base.Preconditions;
import com.google.common.hash.Hasher;
import com.google.common.hash.Hashing;

import java.util.List;

import snow.player.R;
import snow.player.audio.MusicItem;

/**
 * 用于帮助获取 {@link MusicItem} 的 title, artist, album 值。
 */
public final class MusicItemUtil {
    private MusicItemUtil() {
        throw new AssertionError();
    }

    /**
     * 获取歌曲的标题，如果标题为空，则返回默认值。
     */
    public static String getTitle(@NonNull MusicItem musicItem, @NonNull String defaultTitle) {
        Preconditions.checkNotNull(musicItem);
        Preconditions.checkNotNull(defaultTitle);

        return getStringOrDefault(musicItem.getTitle(), defaultTitle);
    }

    /**
     * 获取歌曲的艺术家（歌手），如果艺术家为空，则返回默认值。
     */
    public static String getArtist(@NonNull MusicItem musicItem, @NonNull String defaultArtist) {
        Preconditions.checkNotNull(musicItem);
        Preconditions.checkNotNull(defaultArtist);

        return getStringOrDefault(musicItem.getArtist(), defaultArtist);
    }

    /**
     * 获取歌曲的专辑，如果专辑为空，则返回默认值。
     */
    public static String getAlbum(@NonNull MusicItem musicItem, @NonNull String defaultAlbum) {
        Preconditions.checkNotNull(musicItem);
        Preconditions.checkNotNull(defaultAlbum);

        return getStringOrDefault(musicItem.getAlbum(), defaultAlbum);
    }

    /**
     * 获取歌曲的标题，如果标题为空，则返回字符串 {@code "未知标题"}。
     */
    public static String getTitle(@NonNull Context context, @NonNull MusicItem musicItem) {
        return getTitle(musicItem, context.getString(R.string.snow_music_item_unknown_title));
    }

    /**
     * 获取歌曲的艺术家（歌手），如果艺术家为空，则返回字符串 {@code "未知歌手"}。
     */
    public static String getArtist(@NonNull Context context, @NonNull MusicItem musicItem) {
        return getArtist(musicItem, context.getString(R.string.snow_music_item_unknown_artist));
    }

    /**
     * 获取歌曲的专辑，如果专辑为空，则返回字符串 {@code "未知专辑"}。
     */
    public static String getAlbum(@NonNull Context context, @NonNull MusicItem musicItem) {
        return getAlbum(musicItem, context.getString(R.string.snow_music_item_unknown_album));
    }

    // value 参数为空时返回 defaultValue 参数
    private static String getStringOrDefault(String value, String defaultValue) {
        return value.isEmpty() ? defaultValue : value;
    }

    @SuppressWarnings("UnstableApiUsage")
    public static <T> String generateToken(List<T> items, GetUriFunction<T> function) {
        Hasher hasher = Hashing.sha256().newHasher();

        for (T item : items) {
            hasher.putString(function.getUri(item), Charsets.UTF_8);
        }

        return hasher.hash().toString();
    }

    /**
     * 获取 URI 函数
     *
     * @param <T> 要获取其 URI 的类型。
     */
    public interface GetUriFunction<T> {
        /**
         * 返回 item 的 URI 字符串。
         *
         * @param item 要获取其 URI 的对象
         * @return 返回 item 的 URI 字符串，如果没有，则返回一个空字符串。
         */
        @NonNull
        String getUri(T item);
    }
}
