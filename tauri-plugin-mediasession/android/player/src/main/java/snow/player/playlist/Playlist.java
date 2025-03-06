package snow.player.playlist;

import android.os.Bundle;
import android.os.Parcel;
import android.os.Parcelable;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Objects;
import com.google.common.base.Preconditions;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import snow.player.audio.MusicItem;
import snow.player.util.MusicItemUtil;

/**
 * 用于存储播放队列。
 * <p>
 * {@link Playlist} 对象是不可变的，且不包含重复的 {@link MusicItem} 对象，
 * 并且最大尺寸为 {@link #MAX_SIZE}（1000）。如果往 {@link Playlist} 中添加的 {@link MusicItem}
 * 数量超出了最大尺寸，则超出部分会被忽略。
 * <p>
 * 关于 {@link Playlist} 的 “可编辑” 状态，在这里对其进行说明。在创建 {@link Playlist} 对象时，
 * 你可能已经注意到构造器有一个 editable 参数，但 {@link Playlist} 本身是不可变的，它并未提供任何编辑方法，
 * 你可能会对此存在疑惑。
 * <p>
 * 实际上，{@link Playlist} 的 “可编辑” 状态是针对播放器而言的。如果 {@link Playlist} 是不可编辑的，
 * 则所有通过 {@link snow.player.PlayerClient} 修改播放列表的操作会被忽略。
 * <p>
 * 也就是说，如果 {@link Playlist} 是不可编辑，则调用 {@link snow.player.PlayerClient} 的以下方法时会被忽略：
 * <ul>
 * <li>{@link snow.player.PlayerClient#setNextPlay(MusicItem)}</li>
 * <li>{@link snow.player.PlayerClient#insertMusicItem(int, MusicItem)}</li>
 * <li>{@link snow.player.PlayerClient#appendMusicItem(MusicItem)}</li>
 * <li>{@link snow.player.PlayerClient#moveMusicItem(int, int)}</li>
 * <li>{@link snow.player.PlayerClient#removeMusicItem(MusicItem)}</li>
 * <li>{@link snow.player.PlayerClient#removeMusicItem(int)}</li>
 * </ul>
 *
 * @see snow.player.PlayerClient#setPlaylist(Playlist, int, boolean)
 */
public final class Playlist implements Iterable<MusicItem>, Parcelable {
    private static final String TAG = "Playlist";
    public static final int MAX_SIZE = 1000;

    private final String mName;
    private final String mToken;
    private final ArrayList<MusicItem> mMusicItems;
    private final boolean mEditable;
    @Nullable
    private final Bundle mExtra;

    /**
     * 创建一个 {@link Playlist} 对象。
     * <p>
     * 注意！如果 {@code items} 列表的尺寸大于 {@link #MAX_SIZE}，超出部分会被丢弃。
     *
     * @param name     播放列表的名称，不能为 null
     * @param items    所由要添加到播放列表的中的 {@link MusicItem} 对象，超出 {@link #MAX_SIZE}（1000）的部分元素会被忽略
     * @param editable 播放列表是否是可编辑的
     * @param extra    播放列表的额外参数
     */
    public Playlist(@NonNull String name, @NonNull List<MusicItem> items, boolean editable, @Nullable Bundle extra) {
        this(name, items, 0, editable, extra);
    }

    /**
     * 创建一个 {@link Playlist} 对象。
     * <p>
     * 注意！如果 {@code items} 列表的尺寸大于 {@link #MAX_SIZE}，则会以 position 参数作为基准索引，
     * 先向后提取 {@link MusicItem} 元素，当 position 后面的元素数不足以凑足 {@link #MAX_SIZE} 时，
     * 再从 position 处向前提取，直至凑足 {@link #MAX_SIZE} 个 {@link MusicItem} 元素。
     * 然后再使用这 {@link #MAX_SIZE} 个 {@link MusicItem} 元素来创建 {@link Playlist} 对象。
     *
     * @param name     播放列表的名称，不能为 null
     * @param items    所由要添加到播放列表的中的 {@link MusicItem} 对象，重复的元素会被排除。
     *                 当列表尺寸大于 {@link #MAX_SIZE} 时，会以 position 参数作为基准来提取一个大小为
     *                 {@link #MAX_SIZE} 的子列表。
     * @param position 基准索引，仅在 {@code items} 列表的尺寸大于 {@link Playlist#MAX_SIZE} 时有用
     * @param editable 播放列表是否是可编辑的
     * @param extra    播放列表的额外参数
     */
    public Playlist(@NonNull String name, @NonNull List<MusicItem> items, int position, boolean editable, @Nullable Bundle extra) {
        Preconditions.checkNotNull(name);
        Preconditions.checkNotNull(items);

        mName = name;
        mMusicItems = trim(excludeRepeatItem(items), position);
        mEditable = editable;
        mExtra = extra;

        mToken = generateToken();
    }

    private ArrayList<MusicItem> excludeRepeatItem(List<MusicItem> items) {
        ArrayList<MusicItem> musicItems = new ArrayList<>();

        for (MusicItem item : items) {
            if (musicItems.contains(item)) {
                continue;
            }

            musicItems.add(item);
        }

        return musicItems;
    }

    private ArrayList<MusicItem> trim(ArrayList<MusicItem> musicItems, int position) {
        int size = musicItems.size();

        int start = 0;
        int end = musicItems.size();

        if (size > Playlist.MAX_SIZE) {
            start = position - Math.max(0, Playlist.MAX_SIZE - (size - position));
            end = position + Math.min(Playlist.MAX_SIZE, size - position);
        }

        return new ArrayList<>(musicItems.subList(start, end));
    }

    private String generateToken() {
        return MusicItemUtil.generateToken(mMusicItems, new MusicItemUtil.GetUriFunction<MusicItem>() {
            @NonNull
            @Override
            public String getUri(MusicItem item) {
                return item.getUri();
            }
        });
    }

    /**
     * 获取播放列表的名称。
     *
     * @return 播放列表的名称，不为 null
     */
    @NonNull
    public String getName() {
        return mName;
    }

    /**
     * 获取播放列表的 Token。
     *
     * @return 播放列表的 Token。一个全部小写的 SHA-256 摘要字符串，由 {@link Playlist}
     * 根据其包含的所有歌曲的 URI 自动生成。
     * @see MusicItem#getUri()
     * @see MusicItemUtil#generateToken(List, MusicItemUtil.GetUriFunction)
     */
    @NonNull
    public String getToken() {
        return mToken;
    }

    /**
     * 播放列表是否是可编辑的。
     * <p>
     * {@link Playlist} 本身是不可变的，这里的 “可编辑” 状态是针对播放器而言的。如果 {@link Playlist}
     * 是不可编辑的，则所有通过 {@link snow.player.PlayerClient} 修改播放列表的操作会被忽略。
     * <p>
     * 也就是说，如果 {@link Playlist} 是不可编辑，则 {@link snow.player.PlayerClient} 的以下方法会被忽略：
     * <ul>
     * <li>{@link snow.player.PlayerClient#setNextPlay(MusicItem)}</li>
     * <li>{@link snow.player.PlayerClient#insertMusicItem(int, MusicItem)}</li>
     * <li>{@link snow.player.PlayerClient#appendMusicItem(MusicItem)}</li>
     * <li>{@link snow.player.PlayerClient#moveMusicItem(int, int)}</li>
     * <li>{@link snow.player.PlayerClient#removeMusicItem(MusicItem)}</li>
     * <li>{@link snow.player.PlayerClient#removeMusicItem(int)}</li>
     * </ul>
     *
     * @return 播放列表是否是可编辑的，如果是可编辑的，则返回 true，否则返回 false（默认为 true）。
     */
    public boolean isEditable() {
        return mEditable;
    }

    /**
     * 如果当前播放队列包含指定的元素，则返回 true。
     */
    public boolean contains(MusicItem musicItem) {
        return mMusicItems.contains(musicItem);
    }

    /**
     * 返回当前播放队列中指定位置的元素。
     *
     * @param index 要返回的元素的索引。
     * @return 当前播放队列中指定位置的元素。
     * @throws IndexOutOfBoundsException 如果索引超出范围 (index < 0 || index >= size())
     */
    public MusicItem get(int index) throws IndexOutOfBoundsException {
        return mMusicItems.get(index);
    }

    /**
     * 返回当前播放队列中第一次出现的指定元素的索引；如果当前播放队列不包含该元素，则返回 -1。
     *
     * @param musicItem 要搜索的元素（不能为 null）
     * @return 此当前播放队列中第一次出现的指定元素的索引，如果当前播放队列不包含该元素，则返回 -1
     */
    public int indexOf(@NonNull MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        return mMusicItems.indexOf(musicItem);
    }

    /**
     * 如果当前播放队列在没有任何元素，则返回 true。
     *
     * @return 如果列表不包含元素，则返回 true。
     */
    public boolean isEmpty() {
        return mMusicItems.isEmpty();
    }

    /**
     * 返回按适当顺序在当前播放队列的元素上进行迭代的迭代器。
     * <p>
     * <b>注意！由于 Playlist 被设计为是不可变的，因此不允许使用 Iterator#remove() 方法来删除元素。</b>
     *
     * @return 按适当顺序在列表的元素上进行迭代的迭代器。
     */
    @NonNull
    @Override
    public Iterator<MusicItem> iterator() {
        return new Iterator<MusicItem>() {
            private final Iterator<MusicItem> iterator = mMusicItems.iterator();

            @Override
            public boolean hasNext() {
                return iterator.hasNext();
            }

            @Override
            public MusicItem next() {
                return iterator.next();
            }

            @Override
            public void remove() {
                Log.e(TAG, "unsupported operation");
            }
        };
    }

    /**
     * 返回当前播放队列中的元素数。
     * <p>
     * 如果当前播放队列包含多于 Integer.MAX_VALUE 个元素，则返回 Integer.MAX_VALUE。
     *
     * @return 当前播放队列中的元素数
     */
    public int size() {
        return mMusicItems.size();
    }

    /**
     * 获取当前播放队列中包含的所有 MusicItem 元素。
     * <p>
     * 如果当前播放队列为空，则返回一个空列表。
     *
     * @return 当前播放队列中包含的所有 MusicItem 元素。如果当前播放队列为空，则返回一个空列表。
     */
    public List<MusicItem> getAllMusicItem() {
        return new ArrayList<>(mMusicItems);
    }

    @Nullable
    public Bundle getExtra() {
        return mExtra;
    }

    /**
     * 不包含携带的 {@code extra} 数据
     */
    @Override
    public boolean equals(@Nullable Object obj) {
        if (this == obj) {
            return true;
        }

        if (!(obj instanceof Playlist)) {
            return false;
        }

        Playlist other = (Playlist) obj;

        return Objects.equal(mName, other.mName) &&
                Objects.equal(mToken, other.mToken) &&
                Objects.equal(mMusicItems, other.mMusicItems) &&
                Objects.equal(mEditable, other.mEditable);
    }

    /**
     * 不包含携带的 {@code extra} 数据
     */
    @Override
    public int hashCode() {
        return Objects.hashCode(mName,
                mToken,
                mMusicItems,
                mEditable);
    }

    // Parcelable
    protected Playlist(Parcel in) {
        mName = in.readString();
        mToken = in.readString();
        mMusicItems = in.createTypedArrayList(MusicItem.CREATOR);
        mEditable = in.readByte() != 0;
        mExtra = in.readBundle(Thread.currentThread().getContextClassLoader());
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(mName);
        dest.writeString(mToken);
        dest.writeTypedList(mMusicItems);
        dest.writeByte((byte) (mEditable ? 1 : 0));
        dest.writeBundle(mExtra);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<Playlist> CREATOR = new Creator<Playlist>() {
        @Override
        public Playlist createFromParcel(Parcel in) {
            return new Playlist(in);
        }

        @Override
        public Playlist[] newArray(int size) {
            return new Playlist[size];
        }
    };

    /**
     * {@link Playlist} 构建器。
     */
    public static final class Builder {
        private String mName;
        private final List<MusicItem> mMusicItems;
        private boolean mEditable;
        private Bundle mExtra;
        private int mPosition;

        /**
         * 创建一个 {@link Builder} 构建器对象。
         */
        public Builder() {
            mName = "";
            mMusicItems = new ArrayList<>();
            mPosition = 0;
            mEditable = true;
        }

        /**
         * 设置播放列表的名称。
         *
         * @param name 播放列表的名称，不能为 null
         */
        public Builder setName(@NonNull String name) {
            Preconditions.checkNotNull(name);
            mName = name;
            return this;
        }

        /**
         * 设置播放列表是否是可编辑的。
         *
         * @param editable 播放列表是否是可编辑的，如果是可编辑的，则为 true，否则为 false
         */
        public Builder setEditable(boolean editable) {
            mEditable = editable;
            return this;
        }

        /**
         * 添加一首音乐。
         */
        public Builder append(@NonNull MusicItem musicItem) {
            Preconditions.checkNotNull(musicItem);
            mMusicItems.add(musicItem);
            return this;
        }

        /**
         * 添加多首音乐。
         */
        public Builder appendAll(@NonNull List<MusicItem> musicItems) {
            Preconditions.checkNotNull(musicItems);
            mMusicItems.addAll(musicItems);
            return this;
        }

        /**
         * 移除一首音乐。
         */
        public Builder remove(@NonNull MusicItem musicItem) {
            Preconditions.checkNotNull(musicItem);
            mMusicItems.remove(musicItem);
            return this;
        }

        /**
         * 移除多首音乐。
         */
        public Builder removeAll(@NonNull List<MusicItem> musicItems) {
            Preconditions.checkNotNull(musicItems);
            mMusicItems.removeAll(musicItems);
            return this;
        }

        /**
         * 基准索引值。
         * <p>
         * 当列表的尺寸大于 {@link Playlist#MAX_SIZE} 时，会以此基准值来提取一个大小为
         * {@link Playlist#MAX_SIZE} 的子列表。
         *
         * @see Playlist
         */
        public Builder setPosition(int position) {
            mPosition = position;
            return this;
        }

        /**
         * 设置要携带的额外参数，
         *
         * @param extra 要携带的额外参数，可为 null
         */
        public Builder setExtra(@Nullable Bundle extra) {
            mExtra = extra;
            return this;
        }

        /**
         * 构造一个 {@link Playlist} 对象。
         * <p>
         * 重复的 {@link MusicItem} 项会被在构造 {@link Playlist} 对象时被排除。
         */
        public Playlist build() {
            return new Playlist(mName, mMusicItems, mPosition, mEditable, mExtra);
        }
    }
}
