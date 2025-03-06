package snow.player.audio;

import android.content.Context;
import android.os.Bundle;
import android.os.Parcel;
import android.os.Parcelable;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Objects;
import com.google.common.base.Preconditions;

import snow.player.R;

/**
 * 用于存储与音乐相关的数据。
 * <p>
 * 如果需要存储额外的数据，可以使用 {@link #setExtra(Bundle)} 方法与 {@link #getExtra()} 方法。请不要往
 * MusicItem 中存储大对象，因为这会拖慢 {@link snow.player.Player.OnPlaylistChangeListener} 的响应速度。
 *
 * @see Builder
 */
public final class MusicItem implements Parcelable {
    private String musicId;
    private String title;
    private String artist;
    private String album;
    private String uri;
    private String iconUri;
    private int duration;
    private boolean forbidSeek;
    @Nullable
    private Bundle extra;

    // version 1
    private static final String VERSION_1 = "v1";
    private boolean autoDuration;

    /**
     * 构造一个 MusicItem 对象。建议使用 {@link Builder} 构造器来创建 {@link MusicItem} 对象，
     * 而不是使用构造方法。
     */
    public MusicItem() {
        this.musicId = "";
        this.title = "";
        this.artist = "";
        this.album = "";
        this.uri = "";
        this.iconUri = "";
        this.duration = 0;
        this.extra = null;
        this.forbidSeek = false;
        this.autoDuration = false;
    }

    /**
     * 对 {@code source} 进行拷贝。
     * <p>
     * 注意！不会对 {@code source} 携带的 {@code Extra} 进行深拷贝。
     *
     * @param source 要拷贝的 {@link MusicItem} 对象
     */
    public MusicItem(MusicItem source) {
        musicId = source.musicId;
        title = source.title;
        artist = source.artist;
        album = source.album;
        uri = source.uri;
        iconUri = source.iconUri;
        duration = source.duration;
        forbidSeek = source.forbidSeek;
        autoDuration = source.autoDuration;
        if (source.extra != null) {
            extra = new Bundle(source.extra);
        }
    }

    /**
     * 获取歌曲的 music id（NonNull）。
     *
     * @return 歌曲的 music id（NonNull）
     */
    @NonNull
    public String getMusicId() {
        return musicId;
    }

    /**
     * 设置歌曲的 music id（NonNull）。
     *
     * @param musicId 要设置的值（NonNull）
     */
    public void setMusicId(@NonNull String musicId) {
        Preconditions.checkNotNull(musicId);
        this.musicId = musicId;
    }

    /**
     * 获取歌曲的标题（NonNull）。
     *
     * @return 歌曲的标题（NonNull）
     */
    @NonNull
    public String getTitle() {
        return title;
    }

    /**
     * 设置歌曲的标题。
     *
     * @param title 要设置的标题（NonNull）
     */
    public void setTitle(@NonNull String title) {
        Preconditions.checkNotNull(title);
        this.title = title;
    }

    /**
     * 获取歌曲的艺术家（NonNull）。
     *
     * @return 歌曲的艺术家（NonNull）
     */
    @NonNull
    public String getArtist() {
        return artist;
    }

    /**
     * 设置歌曲的艺术家（NonNull）。
     *
     * @param artist 要设置的艺术家（NonNull）
     */
    public void setArtist(@NonNull String artist) {
        Preconditions.checkNotNull(artist);
        this.artist = artist;
    }

    /**
     * 获取歌曲的专辑（NonNull）。
     *
     * @return 歌曲的专辑（NonNull）
     */
    @NonNull
    public String getAlbum() {
        return album;
    }

    /**
     * 设置歌曲的专辑（NonNull）。
     *
     * @param album 要设置的专辑（NonNull）
     */
    public void setAlbum(@NonNull String album) {
        Preconditions.checkNotNull(album);
        this.album = album;
    }

    /**
     * 获取歌曲的 Uri（NonNull）
     *
     * @return 歌曲的 Uri（NonNull）
     */
    @NonNull
    public String getUri() {
        return uri;
    }

    /**
     * 设置歌曲的 Uri（NonNull）。
     *
     * @param uri 要设置的 Uri（NonNull）
     */
    public void setUri(@NonNull String uri) {
        Preconditions.checkNotNull(uri);
        this.uri = uri;
    }

    /**
     * 获取歌曲图标的 Uri（NonNull）。
     *
     * @return 歌曲图标的 Uri（NonNull）
     */
    @NonNull
    public String getIconUri() {
        return iconUri;
    }

    /**
     * 设置歌曲图标的 Uri（NonNull）。
     *
     * @param iconUri 要设置的图标 Uri（NonNull）
     */
    public void setIconUri(@NonNull String iconUri) {
        Preconditions.checkNotNull(iconUri);
        this.iconUri = iconUri;
    }

    /**
     * 获取歌曲的持续时间。
     *
     * @return 歌曲的持续时间
     */
    public int getDuration() {
        return duration;
    }

    /**
     * 设置歌曲的持续时间（播放时长）。
     *
     * @param duration 歌曲的持续时间，小于 0 时，duration 的值将被设置为 0
     */
    public void setDuration(int duration) {
        if (duration < 0) {
            this.duration = 0;
            return;
        }

        this.duration = duration;
    }

    /**
     * 是否由播放器自动获取歌曲的播放时长。
     * <p>
     * 如果由播放器自动获取歌曲的播放时长，则歌曲的播放时长将延迟播放器准备完毕后再获取。
     *
     * @return 如果由播放器自动获取歌曲的播放时长，则返回 true，否则返回 false。
     */
    public boolean isAutoDuration() {
        return autoDuration;
    }

    /**
     * 设置是否由播放器自动获取歌曲的播放时长。
     * <p>
     * 如果由播放器自动获取歌曲的播放时长，则歌曲的播放时长将延迟播放器准备完毕后再获取。
     * <p>
     * 在某些情况下，可能无法在创建 {@link snow.player.audio.MusicItem} 对象时提供歌曲的播放时长。
     * 这种情况下，实时播放进度功能将无法正常使用。在这种情况下，可以调用该方法并传入 true 来延迟获取歌曲的播放时长。
     *
     * @param autoDuration 是否由播放器自动获取歌曲的播放时长。
     */
    public void setAutoDuration(boolean autoDuration) {
        this.autoDuration = autoDuration;
    }

    /**
     * 判断是否禁用了所有的 seek 操作。
     * <p>
     * 默认为 false，如果该方法返回 true，则会同时禁用 seekTo、fastForward、rewind 操作。
     *
     * @return 是否禁用了所有的 seek 操作
     * @see #setForbidSeek(boolean)
     */
    public boolean isForbidSeek() {
        return forbidSeek;
    }

    /**
     * 设置是否禁用所有的 seek 操作。
     * <p>
     * 如果设为 true，则会同时禁用 seekTo、fastForward、rewind 操作。如果你的音频文件是一个直播流（Live Stream），
     * 建议禁用所有的 seek 操作。
     *
     * @param forbidSeek 如果为 true，则会同时禁用 seekTo、fastForward、rewind 操作。
     * @see #isForbidSeek()
     */
    public void setForbidSeek(boolean forbidSeek) {
        this.forbidSeek = forbidSeek;
    }

    /**
     * 获取携带的额外数据（Nullable）。
     *
     * @return 额外携带的数据（Nullable）
     */
    @Nullable
    public Bundle getExtra() {
        return extra;
    }

    /**
     * 设置 MusicItem 携带的额外数据。
     */
    public void setExtra(@Nullable Bundle extra) {
        this.extra = extra;
    }

    /**
     * 忽略携带的 {@code extra} 数据。
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MusicItem)) return false;
        MusicItem other = (MusicItem) o;
        return Objects.equal(musicId, other.musicId) &&
                Objects.equal(title, other.title) &&
                Objects.equal(artist, other.artist) &&
                Objects.equal(album, other.album) &&
                Objects.equal(uri, other.uri) &&
                Objects.equal(iconUri, other.iconUri) &&
                Objects.equal(duration, other.duration) &&
                Objects.equal(forbidSeek, other.forbidSeek) &&
                Objects.equal(autoDuration, other.autoDuration);
    }

    /**
     * 忽略携带的 {@code extra} 数据。
     */
    @Override
    public int hashCode() {
        return Objects.hashCode(musicId,
                title,
                artist,
                album,
                uri,
                iconUri,
                duration,
                forbidSeek,
                autoDuration);
    }

    @Override
    public String toString() {
        return "MusicItem{" +
                "musicId='" + musicId + '\'' +
                ", title='" + title + '\'' +
                ", artist='" + artist + '\'' +
                ", album='" + album + '\'' +
                ", uri='" + uri + '\'' +
                ", iconUri='" + iconUri + '\'' +
                ", duration=" + duration +
                ", forbidSeek=" + forbidSeek +
                ", autoDuration=" + autoDuration +
                '}';
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(this.musicId);
        dest.writeString(this.title);
        dest.writeString(this.artist);
        dest.writeString(this.album);
        dest.writeString(this.uri);
        dest.writeString(this.iconUri);
        dest.writeInt(this.duration);
        dest.writeByte((byte) (this.forbidSeek ? 1 : 0));
        dest.writeParcelable(extra, 0);

        // version 1
        dest.writeString(VERSION_1);
        dest.writeByte((byte) (this.autoDuration ? 1 : 0));
    }

    /**
     * Parcelable 专用。
     */
    protected MusicItem(Parcel in) {
        this.musicId = in.readString();
        this.title = in.readString();
        this.artist = in.readString();
        this.album = in.readString();
        this.uri = in.readString();
        this.iconUri = in.readString();
        this.duration = in.readInt();
        this.forbidSeek = in.readByte() == 1;
        this.extra = in.readParcelable(Thread.currentThread().getContextClassLoader());

        // version 1
        deserializeByVersion(in, VERSION_1, new Deserialization() {
            @Override
            public void deserialization(Parcel in) {
                autoDuration = in.readByte() == 1;
            }
        });
    }

    private void deserializeByVersion(Parcel in, String version, Deserialization deserialization) {
        int pos = in.dataPosition();
        String versionString = in.readString();
        if (version.equals(versionString)) {
            deserialization.deserialization(in);
        } else {
            in.setDataPosition(pos);
        }
    }

    private interface Deserialization {
        void deserialization(Parcel in);
    }

    public static final Creator<MusicItem> CREATOR = new Creator<MusicItem>() {
        @Override
        public MusicItem createFromParcel(Parcel source) {
            return new MusicItem(source);
        }

        @Override
        public MusicItem[] newArray(int size) {
            return new MusicItem[size];
        }
    };

    /**
     * 用于构建 {@link MusicItem} 对象。
     */
    public static class Builder {
        private String musicId = "";
        private String title = "";
        private String artist = "";
        private String album = "";
        private String uri;
        private String iconUri = "";
        private int duration;
        private boolean forbidSeek = false;
        private Bundle extra;
        private boolean autoDuration = false;

        public Builder() {
        }

        public Builder(@NonNull Context context) {
            Preconditions.checkNotNull(context);
            this.title = context.getString(R.string.snow_music_item_unknown_title);
            this.artist = context.getString(R.string.snow_music_item_unknown_artist);
            this.album = context.getString(R.string.snow_music_item_unknown_album);
        }

        /**
         * 设置歌曲的 music id（NonNull）。
         *
         * @param musicId 要设置的值（NonNull）
         */
        public Builder setMusicId(@NonNull String musicId) {
            Preconditions.checkNotNull(musicId);
            this.musicId = musicId;
            return this;
        }

        /**
         * 设置歌曲的标题。
         *
         * @param title 要设置的标题（NonNull）
         */
        public Builder setTitle(@NonNull String title) {
            Preconditions.checkNotNull(title);
            this.title = title;
            return this;
        }

        /**
         * 设置歌曲的艺术家（NonNull）。
         *
         * @param artist 要设置的艺术家（NonNull）
         */
        public Builder setArtist(@NonNull String artist) {
            Preconditions.checkNotNull(artist);
            this.artist = artist;
            return this;
        }

        /**
         * 设置歌曲的专辑（NonNull）。
         *
         * @param album 要设置的专辑（NonNull）
         */
        public Builder setAlbum(@NonNull String album) {
            Preconditions.checkNotNull(album);
            this.album = album;
            return this;
        }

        /**
         * 设置歌曲的 Uri（NonNull）。
         *
         * @param uri 要设置的 Uri（NonNull）
         */
        public Builder setUri(@NonNull String uri) {
            Preconditions.checkNotNull(uri);
            this.uri = uri;
            return this;
        }

        /**
         * 设置歌曲图标的 Uri（NonNull）。
         *
         * @param iconUri 要设置的图标 Uri（NonNull）
         */
        public Builder setIconUri(@NonNull String iconUri) {
            Preconditions.checkNotNull(iconUri);
            this.iconUri = iconUri;
            return this;
        }

        /**
         * 设置歌曲的持续时间（播放时长）。
         *
         * @param duration 歌曲的持续时间，小于 0 时，duration 的值将被设置为 0
         */
        public Builder setDuration(int duration) throws IllegalArgumentException {
            if (duration < 0) {
                this.duration = 0;
                return this;
            }

            this.duration = duration;
            return this;
        }

        /**
         * 设置由播放器自动获取歌曲的播放时长。
         * <p>
         * 如果由播放器自动获取歌曲的播放时长，则歌曲的播放时长将延迟播放器准备完毕后再获取。
         * <p>
         * 在某些情况下，可能无法在创建 {@link snow.player.audio.MusicItem} 对象时提供歌曲的播放时长。
         * 这种情况下，实时播放进度功能将无法正常使用。此时，可以在使用 {@link Builder} 构建 {@link MusicItem}
         * 对象时调用该方法，以延迟到播放器准备完毕后由播放器自动获取歌曲的播放时长。
         *
         * @see #setAutoDuration(boolean)
         */
        public Builder autoDuration() {
            return this.setAutoDuration(true);
        }

        /**
         * 设置是否由播放器自动获取歌曲的播放时长。
         * <p>
         * 如果由播放器自动获取歌曲的播放时长，则歌曲的播放时长将延迟播放器准备完毕后再获取。
         * <p>
         * 在某些情况下，可能无法在创建 {@link snow.player.audio.MusicItem} 对象时提供歌曲的播放时长。
         * 这种情况下，实时播放进度功能将无法正常使用。此时，可以调用该方法并传入 true 来延迟获取歌曲的播放时长。
         *
         * @param autoDuration 是否由播放器自动获取歌曲的播放时长。
         * @see #autoDuration()
         */
        public Builder setAutoDuration(boolean autoDuration) {
            this.autoDuration = autoDuration;
            return this;
        }

        /**
         * 设置是否禁用 seekTo 操作。
         *
         * @param forbidSeek 如果为 true，则会同时禁用 seekTo、fastForward、rewind 操作。
         */
        public Builder setForbidSeek(boolean forbidSeek) {
            this.forbidSeek = forbidSeek;
            return this;
        }

        /**
         * 设置 MusicItem 携带的额外数据。
         */
        public Builder setExtra(@Nullable Bundle extra) {
            this.extra = extra;
            return this;
        }

        public MusicItem build() {
            MusicItem musicItem = new MusicItem();

            musicItem.setMusicId(musicId);
            musicItem.setTitle(title);
            musicItem.setArtist(artist);
            musicItem.setAlbum(album);
            musicItem.setUri(uri);
            musicItem.setIconUri(iconUri);
            musicItem.setDuration(duration);
            musicItem.setForbidSeek(forbidSeek);
            musicItem.setExtra(extra);
            musicItem.setAutoDuration(autoDuration);

            return musicItem;
        }
    }
}
