package snow.player.playlist;

import androidx.annotation.NonNull;

import java.util.List;

import channel.helper.Channel;
import snow.player.audio.MusicItem;

/**
 * 该接口定义了播放列表编辑器的基本功能。
 *
 * @see snow.player.PlayerClient
 */
@Channel
public interface PlaylistEditor {
    /**
     * 更新列表中的歌曲。
     * @param oldItem  旧的歌曲信息
     * @param newItem 新的歌曲信息
     */
    @SuppressWarnings("NullableProblems")
    void updateMusicItem(@NonNull MusicItem oldItem, @NonNull MusicItem newItem);

    /**
     * 往列表中插入了一首新的歌曲。
     * <p>
     * 如果播放列表中已包含指定歌曲，则会将它移动到 position 位置，如果不存在，则会将歌曲插入到 position 位置。
     *
     * @param position  歌曲插入的位置
     * @param musicItem 要插入的歌曲，不能为 null
     */
    @SuppressWarnings("NullableProblems")
    void insertMusicItem(int position, @NonNull MusicItem musicItem);

    /**
     * 往播放列表的末尾添加一首歌曲。
     * <p>
     * 如果播放列表中已包含指定歌曲，则会将它移动到播放列表的末尾位置，如果不存在，则会将歌曲添加到播放列表的末尾。
     *
     * @param musicItem 要添加播放列表末尾的歌曲，不能为 null
     */
    @SuppressWarnings("NullableProblems")
    void appendMusicItem(@NonNull MusicItem musicItem);

    /**
     * 移动播放列表中某首歌曲的位置。
     *
     * @param fromPosition 歌曲在列表中的位置
     * @param toPosition   歌曲要移动到的位置。如果 {@code toPosition == fromPosition}，则会忽略本次调用
     */
    void moveMusicItem(int fromPosition, int toPosition);

    /**
     * 从播放列表中移除了指定歌曲。
     *
     * @param musicItem 要移除的歌曲。如果播放列表中不包含该歌曲，则忽略本次调用
     */
    @SuppressWarnings("NullableProblems")
    void removeMusicItem(@NonNull MusicItem musicItem);

    /**
     * 移除播放列表中指定位置的歌曲。
     *
     * @param position 要移除的歌曲的位置
     */
    void removeMusicItem(int position);

    /**
     * 设置 “下一次播放” 的歌曲。
     *
     * @param musicItem 要设定为 “下一次播放” 的歌曲，如果歌曲已存在播放列表中，则会移动到 “下一曲播放” 的位
     *                  置，如果歌曲不存在，则插入到 “下一曲播放” 位置
     */
    @SuppressWarnings("NullableProblems")
    void setNextPlay(@NonNull MusicItem musicItem);

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）
     * @param position 播放列表中要播放的歌曲的位置
     * @param play     是否立即播放 {@code position} 参数指定处的音乐
     */
    void setPlaylist(Playlist playlist, int position, boolean play);

    /**
     * 持久化保存
     */
    void save();

    /**
     * 更新当前播放列表。
     *
     * @param playlist 新的播放列表
     */
    void updateCurrentPlaylist(Playlist playlist);
}
