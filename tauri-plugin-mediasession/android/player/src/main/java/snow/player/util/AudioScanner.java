package snow.player.util;

import android.annotation.SuppressLint;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.MediaStore;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import com.google.common.base.Objects;
import com.google.common.base.Preconditions;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import io.reactivex.Single;
import io.reactivex.SingleEmitter;
import io.reactivex.SingleObserver;
import io.reactivex.SingleOnSubscribe;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.schedulers.Schedulers;

/**
 * 音频文件扫描器。用于帮助扫描本地设备中的音频文件。
 *
 * @param <T> 音频文件数据将被转换到的实体类型。
 */
public class AudioScanner<T> {
    private final Context mContext;
    private final Converter<T> mConverter;

    @Nullable
    private String[] mProjection;
    @Nullable
    private String mSelection;
    @Nullable
    private String[] mSelectionArgs;
    @Nullable
    private String mSortOrder;

    private OnProgressUpdateListener<T> mListener;
    private final AtomicBoolean mScanning;
    private final AtomicBoolean mCancelled;

    private final Handler mHandler;

    /**
     * 创建一个 {@link AudioScanner} 对象。
     *
     * @param context   Context 对象，不能为 null
     * @param converter 转换器，不能为 null。用于将扫描到的音频数据转换为一个实体对象。
     */
    public AudioScanner(@NonNull Context context, @NonNull Converter<T> converter) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(converter);

        mContext = context;
        mConverter = converter;

        mScanning = new AtomicBoolean(false);
        mCancelled = new AtomicBoolean(false);

        mHandler = new Handler(Looper.getMainLooper(), new Handler.Callback() {
            @Override
            public boolean handleMessage(@NonNull Message msg) {
                mListener.onProgressUpdate(msg.arg1);
                return true;
            }
        });
    }

    /**
     * 设置查询参数。
     * <p>
     * 关于参数的具体功能，请参考 <a href="https://developer.android.google.cn/reference/android/content/ContentResolver#query(android.net.Uri,%20java.lang.String[],%20java.lang.String,%20java.lang.String[],%20java.lang.String)">{@code ContentResolver#query()}</a> 方法。
     */
    public void setQueryParams(String[] projection,
                               String selection,
                               String[] selectionArgs,
                               String sortOrder) {
        mProjection = projection;
        mSelection = selection;
        mSelectionArgs = selectionArgs;
        mSortOrder = sortOrder;
    }

    /**
     * 开始扫描本地音频文件。
     * <p>
     * 注意！如果当前扫描器运行，调用此方法时将被忽略，除非上次扫描过程已完成或者已被取消。可以使用
     * {@link #isScanning()} 方法检查扫描器当前是否正在运行。
     *
     * @param listener 用于接收扫描结果和监听扫描进度，不能为 null。
     * @see #isScanning()
     */
    public void scan(@NonNull OnProgressUpdateListener<T> listener) {
        Preconditions.checkNotNull(listener);

        if (isScanning()) {
            return;
        }

        mListener = listener;
        mScanning.set(true);
        mCancelled.set(false);

        Single.create(new SingleOnSubscribe<List<T>>() {
            @Override
            public void subscribe(@io.reactivex.annotations.NonNull SingleEmitter<List<T>> emitter) {
                Cursor cursor = mContext.getContentResolver().query(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        mProjection,
                        mSelection,
                        mSelectionArgs,
                        mSortOrder
                );

                List<T> result = new ArrayList<>(cursor.getCount());

                if (mCancelled.get()) {
                    emitter.onSuccess(result);
                    return;
                }

                if (cursor == null || !cursor.moveToFirst()) {
                    cursor.close();
                    emitter.onSuccess(result);
                    return;
                }

                int progress = 0;
                int count = cursor.getCount();

                do {
                    progress++;

                    T item = mConverter.convert(cursor);
                    if (item != null) {
                        result.add(item);
                    }

                    notifyProgressUpdate(Math.round((progress * 1.0F / count) * 100));
                } while (cursor.moveToNext() && !mCancelled.get());

                cursor.close();

                emitter.onSuccess(result);
            }
        }).subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<List<T>>() {
                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        mListener.onStart();
                    }

                    @Override
                    public void onSuccess(@NonNull List<T> ts) {
                        mScanning.set(false);
                        mListener.onEnd(ts, mCancelled.get());
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        // ignore
                    }
                });
    }

    private void notifyProgressUpdate(int progress) {
        Message message = mHandler.obtainMessage();
        message.arg1 = progress;
        mHandler.sendMessage(message);
    }

    /**
     * 扫描器当前是否正在运行。
     *
     * @return 如果扫描器当前正在运行，则返回 true，否则返回 false。
     */
    public boolean isScanning() {
        return mScanning.get();
    }

    /**
     * 取消扫描。
     */
    public void cancel() {
        mCancelled.set(true);
    }

    /**
     * 获取首次添加音频文件的时间。
     *
     * @param cursor Cursor 对象。
     * @return 首次添加音频文件的时间。
     */
    public static int getDateAdded(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED));
    }

    /**
     * 获取音频文件的最后一次修改日期。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的最后一次修改日期。
     */
    public static int getDateModified(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED));
    }

    /**
     * 获取音频文件的显示名称。
     * <p>
     * 例如，路径为 /storage/0000-0000/Audio/audio1024.mp3 的音频文件的显示名为 audio1024.mp3。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的显示名称。
     */
    public static String getDisplayName(Cursor cursor) {
        return cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME));
    }

    /**
     * 获取音频文件的 MIME 类型。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的 MIME 类型。
     */
    public static String getMimeType(Cursor cursor) {
        return cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE));
    }

    /**
     * 获取音频文件的大小。
     * <p>
     * 此值是系统的媒体扫描器通过 {@code File#length()} 方法获取的。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的大小。
     */
    public static int getSize(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE));
    }

    /**
     * 音频文件的持续时间。
     *
     * @param cursor Cursor 对象。
     * @return 文件的持续时间。
     */
    @SuppressLint("InlinedApi")
    public static int getDuration(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DURATION));
    }

    /**
     * 获取音频文件的标题。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的标题。
     */
    public static String getTitle(Cursor cursor) {
        return cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.TITLE));
    }

    /**
     * 获取音频文件在 Android 系统本地媒体库中的 ID 值。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件在 Android 系统本地媒体库中的 ID 值。
     */
    public static int getId(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
    }

    /**
     * 获取音频文件的艺术家。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的艺术家。
     */
    @SuppressLint("InlinedApi")
    public static String getArtist(Cursor cursor) {
        return cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST));
    }

    /**
     * 获取音频文件的艺术家的 ID。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的艺术家的 ID。
     */
    public static int getArtistId(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.ARTIST_ID));
    }

    /**
     * 获取音频文件所属的专辑。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件所属的专辑。
     */
    @SuppressLint("InlinedApi")
    public static String getAlbum(Cursor cursor) {
        return cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.ALBUM));
    }

    /**
     * 获取音频文件所属的专辑的 ID。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件所属的专辑的 ID。
     */
    public static int getAlbumId(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.ALBUM_ID));
    }

    /**
     * 音频文件是否是闹钟铃声文件。
     *
     * @param cursor Cursor 对象。
     * @return 如果音频文件是闹钟铃声文件，则返回 true，否则返回 false。
     */
    public static boolean isAlarm(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.IS_ALARM)) != 0;
    }

    /**
     * 音频文件是否是有声读物。
     *
     * @param cursor Cursor 对象。
     * @return 如果音频文件是有声读物，则返回 true，否则返回 false。
     */
    @RequiresApi(Build.VERSION_CODES.Q)
    public static boolean isAudioBook(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.IS_AUDIOBOOK)) != 0;
    }

    /**
     * 音频文件是否是通知铃声。
     *
     * @param cursor Cursor 对象。
     * @return 如果音频文件是通知铃声，则返回 true，否则返回 false。
     */
    public static boolean isNotification(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.IS_NOTIFICATION)) != 0;
    }

    /**
     * 音频文件是否是 podcast。
     *
     * @param cursor Cursor 对象。
     * @return 如果音频文件是 podcast，则返回 true，否则返回 false。
     */
    public static boolean isPodcast(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.IS_PODCAST)) != 0;
    }

    /**
     * 音频文件是否是铃声文件。
     *
     * @param cursor Cursor 对象。
     * @return 如果音频文件是铃声文件，则返回 true，否则返回 false。
     */
    public static boolean isRingtone(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.IS_RINGTONE)) != 0;
    }

    /**
     * 获取专辑中这首歌的曲目号，如果有的话。
     *
     * @param cursor Cursor 对象。
     * @return 专辑中这首歌的曲目号，如果有的话。
     */
    public static int getTrack(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.TRACK));
    }

    /**
     * 获取音频文件录制的年份，如果有的话。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件录制的年份，如果有的话。
     */
    public static int getYear(Cursor cursor) {
        return cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.YEAR));
    }

    /**
     * 获取音频文件的播放链接。
     *
     * @param cursor Cursor 对象。
     * @return 音频文件的播放链接。
     */
    public static Uri getUri(Cursor cursor) {
        return ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, getId(cursor));
    }

    /**
     * 转换器，用于将扫描到的音频文件数据转换成一个实体对象。
     *
     * @param <T> 音频文件数据将被转换到的实体类型。
     */
    public interface Converter<T> {

        /**
         * 将扫描到的音频文件数据转换成一个实体对象。
         * <p>
         * 注意！返回 null 时，将忽略当前音频文件。
         *
         * @param cursor Cursor 对象，不为 null
         * @return 实体对象，可为 null。返回 null 时，将忽略当前音频文件。
         */
        @Nullable
        T convert(@NonNull Cursor cursor);
    }

    /**
     * 用于接收扫描结果和监听扫描进度。
     */
    public interface OnProgressUpdateListener<T> {
        /**
         * 该方法会在开始扫描前调用。
         * <p>
         * 该方法会在主线程调用，你可以在该方法中显示进度条。
         */
        void onStart();

        /**
         * 当扫描进度更新时会调用该方法。
         * <p>
         * 该方法会在主线程调用，你可以在该方法中更新进度条的扫描进度。
         *
         * @param progress 当前扫描进度，范围：[0, 100]
         */
        void onProgressUpdate(int progress);

        /**
         * 该方法会在结束扫描或者扫描被取消后调用，并将扫描结果传递给该方法。
         * <p>
         * 该方法会在主线程中调用，你可以在该方法中隐藏进度条。
         *
         * @param audioList 扫描到的音频文件。如果扫描被取消，则该列表中仅会包含取消前已扫描到的音频文件。
         * @param cancelled 扫描是否被取消，如果扫描过程是正常完成的，该参数为 false；如果扫描过程被取消，则该参数为 true。
         */
        void onEnd(@NonNull List<T> audioList, boolean cancelled);
    }

    /**
     * 默认的音频实体类。
     * <p>
     * 如果默认的 {@link AudioItem} 无法满足你的需求，可以创建一个自定义的实体类型，然后使用自定义的
     * {@link Converter} 将音频文件数据转换成自定义的实体对象即可。创建自定义
     * {@link Converter} 非常简单，具体请参考 {@link AudioItemConverter} 类的源码。
     *
     * @see AudioItemConverter
     */
    public static class AudioItem {
        private long id;
        private String displayName;
        private String title;
        private String artist;
        private int artistId;
        private String album;
        private int albumId;
        private String mimeType;
        private String uri;
        private long duration;
        private int dateAdded;
        private int dateModified;
        private int size;
        private int track;
        private int year;
        private boolean alarm;
        private boolean audioBook;
        private boolean notification;
        private boolean podcast;
        private boolean ringtone;

        public AudioItem(long id,
                         String displayName,
                         String title,
                         String artist,
                         int artistId,
                         String album,
                         int albumId,
                         String mimeType,
                         String uri,
                         long duration,
                         int dateAdded,
                         int dateModified,
                         int size,
                         int track,
                         int year,
                         boolean alarm,
                         boolean audioBook,
                         boolean notification,
                         boolean podcast,
                         boolean ringtone) {
            this.id = id;
            this.displayName = displayName;
            this.title = title;
            this.artist = artist;
            this.artistId = artistId;
            this.album = album;
            this.albumId = albumId;
            this.mimeType = mimeType;
            this.uri = uri;
            this.duration = duration;
            this.dateAdded = dateAdded;
            this.dateModified = dateModified;
            this.size = size;
            this.track = track;
            this.year = year;
            this.alarm = alarm;
            this.audioBook = audioBook;
            this.notification = notification;
            this.podcast = podcast;
            this.ringtone = ringtone;
        }

        public long getId() {
            return id;
        }

        public void setId(long id) {
            this.id = id;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getArtist() {
            return artist;
        }

        public void setArtist(String artist) {
            this.artist = artist;
        }

        public int getArtistId() {
            return artistId;
        }

        public void setArtistId(int artistId) {
            this.artistId = artistId;
        }

        public String getAlbum() {
            return album;
        }

        public void setAlbum(String album) {
            this.album = album;
        }

        public int getAlbumId() {
            return albumId;
        }

        public void setAlbumId(int albumId) {
            this.albumId = albumId;
        }

        public String getMimeType() {
            return mimeType;
        }

        public void setMimeType(String mimeType) {
            this.mimeType = mimeType;
        }

        public String getUri() {
            return uri;
        }

        public void setUri(String uri) {
            this.uri = uri;
        }

        public long getDuration() {
            return duration;
        }

        public void setDuration(long duration) {
            this.duration = duration;
        }

        public int getDateAdded() {
            return dateAdded;
        }

        public void setDateAdded(int dateAdded) {
            this.dateAdded = dateAdded;
        }

        public int getDateModified() {
            return dateModified;
        }

        public void setDateModified(int dateModified) {
            this.dateModified = dateModified;
        }

        public int getSize() {
            return size;
        }

        public void setSize(int size) {
            this.size = size;
        }

        public int getTrack() {
            return track;
        }

        public void setTrack(int track) {
            this.track = track;
        }

        public int getYear() {
            return year;
        }

        public void setYear(int year) {
            this.year = year;
        }

        public boolean isAlarm() {
            return alarm;
        }

        public void setAlarm(boolean alarm) {
            this.alarm = alarm;
        }

        public boolean isAudioBook() {
            return audioBook;
        }

        public void setAudioBook(boolean audioBook) {
            this.audioBook = audioBook;
        }

        public boolean isNotification() {
            return notification;
        }

        public void setNotification(boolean notification) {
            this.notification = notification;
        }

        public boolean isPodcast() {
            return podcast;
        }

        public void setPodcast(boolean podcast) {
            this.podcast = podcast;
        }

        public boolean isRingtone() {
            return ringtone;
        }

        public void setRingtone(boolean ringtone) {
            this.ringtone = ringtone;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            AudioItem audioItem = (AudioItem) o;
            return id == audioItem.id &&
                    artistId == audioItem.artistId &&
                    albumId == audioItem.albumId &&
                    duration == audioItem.duration &&
                    dateAdded == audioItem.dateAdded &&
                    dateModified == audioItem.dateModified &&
                    size == audioItem.size &&
                    track == audioItem.track &&
                    year == audioItem.year &&
                    alarm == audioItem.alarm &&
                    audioBook == audioItem.audioBook &&
                    notification == audioItem.notification &&
                    podcast == audioItem.podcast &&
                    ringtone == audioItem.ringtone &&
                    Objects.equal(displayName, audioItem.displayName) &&
                    Objects.equal(title, audioItem.title) &&
                    Objects.equal(artist, audioItem.artist) &&
                    Objects.equal(album, audioItem.album) &&
                    Objects.equal(mimeType, audioItem.mimeType) &&
                    Objects.equal(uri, audioItem.uri);
        }

        @Override
        public int hashCode() {
            return Objects.hashCode(id, displayName, title, artist, artistId, album, albumId,
                    mimeType, uri, duration, dateAdded, dateModified, size, track, year,
                    alarm, audioBook, notification, podcast, ringtone);
        }

        @NonNull
        @Override
        public String toString() {
            return "AudioItem{" +
                    "id=" + id +
                    ", displayName='" + displayName + '\'' +
                    ", title='" + title + '\'' +
                    ", artist='" + artist + '\'' +
                    ", artistId=" + artistId +
                    ", album='" + album + '\'' +
                    ", albumId=" + albumId +
                    ", mimeType='" + mimeType + '\'' +
                    ", uri='" + uri + '\'' +
                    ", duration=" + duration +
                    ", dateAdded=" + dateAdded +
                    ", dateModified=" + dateModified +
                    ", size=" + size +
                    ", track=" + track +
                    ", year=" + year +
                    ", alarm=" + alarm +
                    ", audioBook=" + audioBook +
                    ", notification=" + notification +
                    ", podcast=" + podcast +
                    ", ringtone=" + ringtone +
                    '}';
        }
    }

    /**
     * 默认的转换器，用于将扫描到的音频数据转换成 {@link AudioItem} 对象。
     */
    public static class AudioItemConverter implements Converter<AudioScanner.AudioItem> {
        @Nullable
        @Override
        public AudioItem convert(@NonNull Cursor cursor) {
            long id = getId(cursor);
            String displayName = getDisplayName(cursor);
            String title = getTitle(cursor);
            String artist = getArtist(cursor);
            int artistId = getArtistId(cursor);
            String album = getAlbum(cursor);
            int albumId = getAlbumId(cursor);
            String mimeType = getMimeType(cursor);
            String uri = getUri(cursor).toString();
            long duration = getDuration(cursor);
            int dateAdded = getDateAdded(cursor);
            int dateModified = getDateModified(cursor);
            int size = getSize(cursor);
            int track = getTrack(cursor);
            int year = getYear(cursor);
            boolean alarm = isAlarm(cursor);
            boolean audioBook = false;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                audioBook = isAudioBook(cursor);
            }
            boolean notification = isNotification(cursor);
            boolean podcast = isPodcast(cursor);
            boolean ringtone = isRingtone(cursor);

            return new AudioItem(
                    id,
                    displayName,
                    title,
                    artist,
                    artistId,
                    album,
                    albumId,
                    mimeType,
                    uri,
                    duration,
                    dateAdded,
                    dateModified,
                    size,
                    track,
                    year,
                    alarm,
                    audioBook,
                    notification,
                    podcast,
                    ringtone
            );
        }
    }
}
