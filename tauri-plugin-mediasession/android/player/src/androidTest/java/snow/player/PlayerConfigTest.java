package snow.player;

import android.os.Bundle;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PlayerConfigTest {
    private static PlayerConfig mPlayerConfig;

    @BeforeClass
    public static void initPlayerConfig() {
        mPlayerConfig = new PlayerConfig(
                InstrumentationRegistry.getInstrumentation().getContext(),
                "test_id");
    }

    @Test
    public void setSoundQuality() {
        final SoundQuality soundQuality = SoundQuality.HIGH;

        mPlayerConfig.setSoundQuality(soundQuality);
        assertEquals(soundQuality, mPlayerConfig.getSoundQuality());
    }

    @Test
    public void setAudioEffectConfig() {
        final String key = "test";
        final String value = "value";
        Bundle config = new Bundle();
        config.putString(key, value);

        mPlayerConfig.setAudioEffectConfig(config);
        assertEquals(value, mPlayerConfig.getAudioEffectConfig().getString(key, ""));
    }

    @Test
    public void setAudioEffectEnabled() {
        final boolean enabled = true;

        mPlayerConfig.setAudioEffectEnabled(enabled);
        assertEquals(enabled, mPlayerConfig.isAudioEffectEnabled());
    }

    @Test
    public void setOnlyWifiNetwork() {
        final boolean onlyWifiNetwork = true;

        mPlayerConfig.setOnlyWifiNetwork(onlyWifiNetwork);
        assertEquals(onlyWifiNetwork, mPlayerConfig.isOnlyWifiNetwork());
    }
}
