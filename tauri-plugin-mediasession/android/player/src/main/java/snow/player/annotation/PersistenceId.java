package snow.player.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 用于设置 {@link snow.player.PlayerService} 的持久化 ID。
 * <p>
 * 该 ID 值将用于播放器状态的持久化，不能为空，并且请保证其全局唯一性。
 * <p>
 * 例：
 * <pre>{@code @PersistenceId("YourPersistenceId")
 * public class MyPlayerService extends PlayerService {
 *     ...
 * }
 * }
 * </pre>
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface PersistenceId {
    String value() default "";
}
